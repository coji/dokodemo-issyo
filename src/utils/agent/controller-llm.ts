import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { type ResultAsync, fromPromise } from "neverthrow";
import { z } from "zod";
import type { Character } from "../character";

// Define Zod schemas for each action payload for validation
const GenerateNormalResponsePayload = z.object({});
const StartShiritoriPayload = z.object({});
const PlayShiritoriPayload = z.object({
	previousWord: z.string(),
	currentUserWord: z.string(), // Add user's word for validation
});
const LearnWordPayload = z.object({ word: z.string() });
const UpdateMoodPayload = z.object({ newMood: z.string() });

// Define Zod schema for the overall action structure
const AgentActionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("generate_normal_response"),
		payload: GenerateNormalResponsePayload,
	}),
	z.object({
		type: z.literal("start_shiritori"),
		payload: StartShiritoriPayload,
	}),
	z.object({
		type: z.literal("play_shiritori"),
		payload: PlayShiritoriPayload,
	}),
	z.object({ type: z.literal("learn_word"), payload: LearnWordPayload }),
	z.object({ type: z.literal("update_mood"), payload: UpdateMoodPayload }),
]);

// Define possible actions the agent can take (using Zod schema type)
export type AgentAction =
	| z.infer<typeof AgentActionSchema>
	| { type: "generate_normal_response"; payload: Record<string, never> }
	| { type: "start_shiritori"; payload: Record<string, never> }
	| {
			type: "play_shiritori";
			payload: { previousWord: string; currentUserWord: string };
	  }
	| { type: "learn_word"; payload: { word: string } }
	| { type: "update_mood"; payload: { newMood: string } };
// Add more actions as needed

/**
 * Determines the next action the character should take based on the
 * current state, user message, and conversation history.
 * This will involve calling an LLM (e.g., Gemini).
 *
 * @param character The current state of the character.
 * @param userMessage The latest message from the user.
 * @param conversationHistory Recent conversation history (to be added).
 * @returns A ResultAsync resolving to the determined AgentAction.
 */
export function determineNextAction(
	character: Character,
	userMessage: string,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>, // Use conversation history
): ResultAsync<AgentAction, Error> {
	// Format history for the prompt
	const historyString = conversationHistory
		.map(
			(entry) =>
				`${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`,
		)
		.join("\n");

	// Construct the prompt for the controller LLM
	const prompt = `
あなたはキャラクター「${character.name}」の行動を決定するAIです。
キャラクターの現在の状態とユーザーのメッセージを考慮し、次に取るべき最も適切な行動を一つだけ選択してください。

# キャラクター情報:
- 名前: ${character.name}
- 性格: ${character.personality}
- 口調: ${character.tone}
- 現在の機嫌: ${character.mood}
- 現在の活動: ${character.current_activity}
- 覚えている単語: ${character.learned_words}
- 親密度レベル: ${character.relationship_level}

# 直近の会話履歴:
${historyString || "なし"}

# ユーザーの最新メッセージ:
"${userMessage}"

# 可能な行動リスト:
- generate_normal_response: 通常の会話応答を生成する (現在の活動が 'normal' の場合に基本)
- start_shiritori: しりとりを開始する (ユーザーがしりとりを提案した場合など)
- play_shiritori: しりとりを続ける (現在の活動が 'shiritori' の場合)
- learn_word: ユーザーが教えてくれた単語を覚える
- update_mood: 会話の流れに応じて機嫌を更新する (例: 楽しい会話なら 'happy' に)

# 指示:
上記の情報を踏まえ、キャラクターが取るべき次の行動タイプと、必要であればそのペイロード（例: しりとりなら前の単語、学習なら覚える単語、機嫌更新なら新しい機嫌）をJSONオブジェクトとして出力してください。
現在の活動が 'shiritori' で、ユーザーがしりとりに関連する言葉を言ってきた場合は 'play_shiritori' を選択し、previousWord をペイロードに含めてください。
ユーザーが「〇〇を覚えて」のように言ってきた場合は 'learn_word' を選択し、word をペイロードに含めてください。
`;

	// Call the LLM using generateObject to get structured output
	return fromPromise(
		generateObject({
			model: google("gemini-2.0-flash-lite-preview-02-05", {
				structuredOutputs: false,
			}),
			schema: AgentActionSchema, // Use the Zod schema for output validation
			prompt: prompt,
			temperature: 0.5, // Lower temperature for more deterministic action selection
		}).then((result) => result.object), // Extract the validated object
		(error) => {
			console.error("Error determining next action with Gemini:", error);
			// Fallback action if LLM fails
			const fallbackAction: AgentAction = {
				type: "generate_normal_response",
				payload: {},
			};
			return new Error(
				`LLM action determination failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		},
	);
}
