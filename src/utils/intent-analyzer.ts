import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { fromPromise } from 'neverthrow'
import { z } from 'zod'

const schema = z.object({
  intent: z.union([z.literal('greeting'), z.literal('unknown')]),
})

// Intent 型定義 (変更なし)
export type Intent = { type: 'greeting' } | { type: 'unknown' }

// Gemini を使って意図を分析する関数
export function analyzeIntent(message: string) {
  const prompt = `以下のユーザーメッセージが挨拶かどうかを判断し、"greeting" または "unknown" のいずれかで答えてください。
ユーザーメッセージ: "${message}"
回答:`

  // Gemini API を呼び出し、結果を Intent 型にマッピング
  return fromPromise(
    generateObject({
      model: google('gemini-2.0-flash-lite-preview-02-05'),
      prompt,
      schema,
    }).then((result) => {
      if (result.object.intent === 'greeting') {
        return { type: 'greeting' } satisfies Intent
      }
      return { type: 'unknown' } satisfies Intent
    }),
    (error) => {
      console.error('Error analyzing intent with Gemini:', error)
      return error instanceof Error ? error : new Error(String(error))
    },
  )
}
