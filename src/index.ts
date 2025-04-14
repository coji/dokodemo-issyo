import { zValidator } from '@hono/zod-validator'
import { validateSignature } from '@line/bot-sdk'
import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { z } from 'zod'

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
})

app.get('/', async (c) => {
  const ret = await env.DB.prepare('SELECT datetime("now") as now').run()

  return c.json({
    now: ret.results[0].now,
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
