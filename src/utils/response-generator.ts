import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { fromPromise } from 'neverthrow' // okAsync, errAsync をインポート
import type { Intent } from './intent-analyzer'

// fromPromise を使わずに ResultAsync を返すように修正
export function generateResponse(
  intent: Intent,
  userId: string,
  userMessage: string,
) {
  let prompt = ''
  switch (intent.type) {
    case 'greeting':
      prompt = `ユーザーから「${userMessage}」と挨拶されました。フレンドリーな挨拶を返してください。`
      break
    default: // unknown
      prompt = `ユーザーから「${userMessage}」というメッセージがありましたが、意図がよくわかりませんでした。何かお手伝いできることはありますか？と尋ねる応答をしてください。`
      break
  }

  return fromPromise(
    generateText({
      model: google('gemini-2.0-flash-lite-preview-02-05'),
      prompt,
      temperature: 0.7,
    }).then((result) => result.text.trim()), // 成功したらテキストを返す
    (error) => {
      console.error('Error generating response with Gemini:', error)
      return error instanceof Error ? error : new Error(String(error))
    },
  )
}
