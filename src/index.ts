import { zValidator } from '@hono/zod-validator'
import { validateSignature } from '@line/bot-sdk'
import { env } from 'cloudflare:workers'
import { Hono, type Context } from 'hono' // Context を直接インポート
import { z } from 'zod'
import { saveConversationHistory } from './utils/d1'
import { analyzeIntent, type Intent } from './utils/intent-analyzer' // Intent 型をインポート
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

// メッセージ処理のコアロジック
async function handleMessageEvent(
  c: Context<{ Bindings: Env }>,
  event: z.infer<typeof requestBodySchema>['events'][number],
) {
  const userId = event.source.userId || 'unknown-user'
  const text = event.message.text!

  const processingChain = analyzeIntent(text) // Intentを解析
    .andThen((intent: Intent) => generateResponse(intent, userId)) // レスポンスを生成
    .andThen((response) =>
      // LINEに返信
      replyMessage(
        c.env.LINE_CHANNEL_ACCESS_TOKEN,
        event.replyToken,
        response,
      ).map(() => response),
    )
    .andThen((response) =>
      // 会話履歴を保存
      saveConversationHistory(userId, text, response).map(() => response),
    )

  // チェーンの最終結果を処理
  await processingChain.match(
    (finalResponse) => {
      console.log('Successfully processed and sent:', finalResponse)
    },
    (error) => {
      console.error('Error in processing chain:', error)
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
    if (
      event.type !== 'message' ||
      event.message.type !== 'text' ||
      !event.message.text
    ) {
      continue
    }

    // 各イベントの処理を非同期で実行
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
