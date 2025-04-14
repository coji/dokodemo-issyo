import { type ResultAsync, fromPromise } from 'neverthrow'

export function saveConversationHistory(
  env: Env,
  userId: string,
  message: string,
  response: string,
): ResultAsync<void, Error> {
  return fromPromise(
    env.DB.prepare(
      'INSERT INTO conversations (user_id, message, response) VALUES (?, ?, ?)',
    )
      .bind(userId, message, response)
      .run(),
  ).map(() => {}) // 成功時はvoidを返す
}
