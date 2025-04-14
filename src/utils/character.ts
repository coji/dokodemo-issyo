import { env } from 'cloudflare:workers'
import { type ResultAsync, errAsync, fromPromise, okAsync } from 'neverthrow'

interface Character {
  id: number
  name: string
  personality: string
  tone: string
  default_response: string
}

// キャラクター情報を名前で取得する関数 (例)
async function fetchCharacterByName(
  characterName: string,
): Promise<Character | null> {
  const stmt = env.DB.prepare('SELECT * FROM characters WHERE name = ?')
  const { results } = await stmt.bind(characterName).all()
  if (!results || results.length === 0) {
    return null
  }
  return results[0] as unknown as Character // 型アサーション
}

export function getCharacterResponse(
  userId: string,
  message: string,
): ResultAsync<string, Error> {
  // (実際にはユーザーや会話履歴、キャラクター設定に基づいて応答を生成するロジックを実装)

  // ここでは簡単な例として、常にトロが応答すると仮定
  return fromPromise(fetchCharacterByName('トロ'), (error) =>
    error instanceof Error ? error : new Error(String(error)),
  ).andThen((character) => {
    if (!character) {
      return errAsync(new Error('Character not found: トロ')) // キャラクターが見つからない場合はエラー
    }
    return okAsync(`${character.default_response} ${character.tone}`) // デフォルト応答 + 口調
  })
}
