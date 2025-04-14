import type { ResultAsync } from 'neverthrow'
import { getCharacterResponse as fetchCharacterResponse } from './character' // 関数名が衝突するためリネーム
import type { Intent } from './intent-analyzer'

export function generateResponse(
  env: Env,
  intent: Intent,
  userId: string,
): ResultAsync<string, Error> {
  switch (intent.type) {
    case 'greeting':
      // ここでキャラクターごとの挨拶を返すようにする (今はトロ固定)
      return fetchCharacterResponse(env, userId, '挨拶') // message引数は今は使わない
    default:
      // 意図不明な場合は、キャラクターのデフォルト応答を返す (今はトロ固定)
      return fetchCharacterResponse(env, userId, '不明') // message引数は今は使わない
  }
}
