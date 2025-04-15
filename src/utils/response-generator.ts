import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { type ResultAsync, errAsync, fromPromise } from 'neverthrow'
import { fetchCharacterByName } from './character' // Character インターフェースもインポート
import type { Intent } from './intent-analyzer'

export function generateResponse(
  intent: Intent,
  userId: string,
  userMessage: string,
): ResultAsync<string, Error> {
  // ResultAsync を返すように型定義を修正
  // まずキャラクター情報を取得
  return fromPromise(fetchCharacterByName('トロ'), (error) =>
    error instanceof Error ? error : new Error(String(error)),
  ).andThen((character) => {
    if (!character) {
      return errAsync(new Error('Character not found: トロ')) // キャラクターが見つからない場合はエラー
    }

    // キャラクター情報を使ってプロンプトを生成
    let basePrompt = ''
    switch (intent.type) {
      case 'greeting':
        basePrompt = `ユーザーから「${userMessage}」と挨拶されました。フレンドリーな挨拶を返してください。`
        break
      default: // unknown
        basePrompt = `ユーザーから「${userMessage}」というメッセージがありましたが、意図がよくわかりませんでした。何かお手伝いできることはありますか？と尋ねる応答をしてください。`
        break
    }

    // キャラクター設定をプロンプトに追加
    const characterPrompt = `あなたはキャラクター「${character.name}」です。性格は「${character.personality}」、口調は「${character.tone}」です。このキャラクターとして、以下の状況に対する応答を生成してください。\n\n状況：${basePrompt}`

    // AI に応答生成を依頼
    return fromPromise(
      generateText({
        model: google('gemini-2.0-flash-lite-preview-02-05'),
        prompt: characterPrompt, // 修正したプロンプトを使用
        temperature: 0.7,
      }).then((result) => result.text.trim()), // 成功したらテキストを返す
      (error) => {
        console.error('Error generating response with Gemini:', error)
        return error instanceof Error ? error : new Error(String(error))
      },
    )
  })
}
