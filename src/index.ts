import { zValidator } from '@hono/zod-validator'
import { validateSignature } from '@line/bot-sdk'
import { env } from 'cloudflare:workers'
import { Hono, type Context } from 'hono' // Context を直接インポート
import { fromPromise } from 'neverthrow' // ResultAsync はまだ使う
// RxJS関連のimportを削除
import { z } from 'zod'
import { saveConversationHistory } from './utils/d1'
import { analyzeIntent } from './utils/intent-analyzer' // Intent 型を再度インポート
import { replyMessage } from './utils/line'
import { generateResponse } from './utils/response-generator'

const app = new Hono<{ Bindings: Env }>()

const requestBodySchema = z.object({
  events: z.array(
    z.object({
      type: z.string(),
      message: z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
      replyToken: z.string(),
      source: z.object({
        type: z.string(),
        userId: z.string().optional(),
        groupId: z.string().optional(),
        roomId: z.string().optional(),
      }),
    }),
  ),
})

// メッセージ処理のコアロジックを async 関数に分離
async function handleMessageEvent(
  c: Context<{ Bindings: Env }>, // Context 型を直接使用
  event: z.infer<typeof requestBodySchema>['events'][number],
) {
  const userId = event.source.userId || 'unknown-user'
  const text = event.message.text! // この時点で text は存在するはず

  // 1. 意図解析 (ResultAsync を await で解決)
  await analyzeIntent(text).match(
    async (intent) => {
      // 2. 応答生成
      const responseResult = await generateResponse(c.env, intent, userId)
      if (responseResult.isErr()) {
        console.error('Response Generation Error:', responseResult.error)
        return // エラー時は何もしない
      }
      const response = responseResult.value

      // 3. 応答送信
      const replyResult = await fromPromise(
        replyMessage(
          c.env.LINE_CHANNEL_ACCESS_TOKEN,
          event.replyToken,
          response,
        ),
        (error) => (error instanceof Error ? error : new Error(String(error))),
      )
      if (replyResult.isErr()) {
        console.error('Reply Message Error:', replyResult.error)
        return // エラー時は何もしない
      }
      console.log('Response sent successfully:', response)

      // 4. 会話履歴保存
      const saveResult = await saveConversationHistory(
        c.env,
        userId,
        text,
        response,
      )
      if (saveResult.isErr()) {
        console.error('Save History Error:', saveResult.error)
      }
    },
    (error) => {
      // Err ケース: 意図解析エラー
      console.error('Intent Analysis Error:', error)
      // エラー発生時はここで処理を中断するか、デフォルト応答などを検討
      return // 例: エラー時は何もしない
    },
  )
}

app.post('/webhook', zValidator('json', requestBodySchema), async (c) => {
  const signature = c.req.header('x-line-signature')
  const bodyText = await c.req.text()
  const channelSecret = c.env.LINE_CHANNEL_SECRET

  if (
    !signature ||
    !channelSecret ||
    !validateSignature(bodyText, channelSecret, signature)
  ) {
    return c.text('Invalid signature', 400)
  }

  const { events } = c.req.valid('json')
  for (const event of events) {
    if (event.type !== 'message') continue
    if (event.message.type !== 'text') continue
    if (!event.message.text) continue

    // 各イベントの処理を非同期で実行 (完了を待たない)
    // 注意: Cloudflare Workers のライフサイクルによっては、
    // リクエスト処理終了後にバックグラウンド処理が中断される可能性があるため、
    // c.executionCtx.waitUntil() を使うことを検討する
    c.executionCtx.waitUntil(handleMessageEvent(c, event))
  }

  // LINEプラットフォームにはすぐにOKを返す
  return c.text('OK')
})

app.get('/', async (c) => {
  const ret = await env.DB.prepare('SELECT datetime("now") as now').run()
  return c.json({
    now: ret.results[0].now,
    message: 'Hello!',
  })
})

export default app
