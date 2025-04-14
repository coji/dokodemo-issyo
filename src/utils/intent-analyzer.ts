import { type ResultAsync, okAsync } from 'neverthrow'

export type Intent = { type: 'greeting' } | { type: 'unknown' }

export function analyzeIntent(message: string): ResultAsync<Intent, Error> {
  const normalizedMessage = message.trim().toLowerCase()

  if (
    normalizedMessage.includes('おはよう') ||
    normalizedMessage.includes('こんにちは') ||
    normalizedMessage.includes('こんばんは')
  ) {
    return okAsync({ type: 'greeting' })
  }

  return okAsync({ type: 'unknown' }) // 意図不明
}
