import { env } from 'cloudflare:workers'
import { type ResultAsync, errAsync, fromPromise, okAsync } from 'neverthrow'

export interface Character {
  // Character インターフェースをエクスポート
  id: number
  name: string
  personality: string
  tone: string
  default_response: string
  // Added state fields
  mood: string
  learned_words: string // JSON string
  relationship_level: number
  current_activity: string
}

// キャラクター情報を名前で取得する関数 (例)
export async function fetchCharacterByName( // fetchCharacterByName 関数をエクスポート
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

// Function to update character state in the database
export async function updateCharacterState(
  characterId: number,
  stateChanges: Partial<
    Pick<
      Character,
      'mood' | 'learned_words' | 'relationship_level' | 'current_activity'
    >
  >, // Only allow updating state fields
): Promise<Character | null> {
  const fields = Object.keys(stateChanges) as Array<keyof typeof stateChanges>
  if (fields.length === 0) {
    // No changes, fetch and return current state? Or maybe just return null/error?
    // Let's fetch the current state for consistency if no changes are requested.
    // Need fetchCharacterById for this, let's assume fetchCharacterByName works if we know the name
    console.warn(
      'updateCharacterState called with empty changes for id:',
      characterId,
    )
    // This requires knowing the name, which we don't have here.
    // Returning null if no changes seems reasonable for now.
    // Alternatively, the caller (agent.ts) should avoid calling if no changes.
    return null // Or fetch by ID if implemented
  }

  // 1. Construct SQL UPDATE statement dynamically
  const setClauses = fields.map((field) => `${field} = ?`).join(', ')
  const values = fields.map((field) => stateChanges[field])

  const sql = `UPDATE characters SET ${setClauses} WHERE id = ? RETURNING *` // Use RETURNING * to get updated data
  values.push(characterId) // Add id for the WHERE clause

  try {
    // 2. Execute the statement using env.DB
    const stmt = env.DB.prepare(sql)
    const { results } = await stmt.bind(...values).all()

    if (results && results.length > 0) {
      // 3. Return the updated character data
      return results[0] as unknown as Character
    }
    console.error(
      'Failed to update or retrieve character state after update for id:',
      characterId,
    )
    return null // Update failed or character not found
  } catch (error) {
    console.error('Error updating character state:', error)
    return null
  }
}
