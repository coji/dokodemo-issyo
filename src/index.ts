import { zValidator } from '@hono/zod-validator'
import { validateSignature } from '@line/bot-sdk'
import { Hono } from 'hono'
import { z } from 'zod'
import { replyMessage } from './utils/line'

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

app.post('/webhook', zValidator('json', requestBodySchema), async (c) => {
  const signature = c.req.header('x-line-signature')
  const body = await c.req.text()
  const channelSecret = c.env.LINE_CHANNEL_SECRET

  if (
    !signature ||
    !channelSecret ||
    !validateSignature(body, channelSecret, signature)
  ) {
    return c.text('Invalid signature', 400)
  }

  const { events } = c.req.valid('json')

  for (const event of events) {
    if (
      event.type === 'message' &&
      event.message.type === 'text' &&
      event.message.text
    ) {
      const replyText = `オウム返し: ${event.message.text}` // とりあえずオウム返し
      await replyMessage(
        c.env.LINE_CHANNEL_ACCESS_TOKEN,
        event.replyToken,
        replyText,
      )
    }
  }

  return c.text('OK')
})

app.get('/', (c) => {
  return c.json({
    message: 'Hello Hono!',
  })
})

app.post(
  '/posts',
  zValidator(
    'form',
    z.object({
      body: z.string(),
    }),
  ),
  (c) => {
    const validated = c.req.valid('form')
    // ... use your validated data
    return c.json({
      message: 'ok',
      validated,
    })
  },
)

export default app
