import { google } from "@ai-sdk/google"; // Import google
import { generateText } from "ai"; // Import generateText
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow"; // Import fromPromise
import type { Character } from "../character";
import type { AgentAction } from "./controller-llm";

// Define the result of executing an action
export interface ExecutionResult {
	responseText: string;
	stateChanges: Partial<
		Pick<Character, "mood" | "learned_words" | "current_activity">
	>; // Suggested changes to state
}

/**
 * Executes the given action based on the character's state and user message.
 *
 * @param action The action determined by the controller LLM.
 * @param character The current state of the character.
 * @param userMessage The latest message from the user.
 * @returns A ResultAsync resolving to the ExecutionResult.
 */
export function executeAction(
	action: AgentAction,
	character: Character,
	userMessage: string,
): ResultAsync<ExecutionResult, Error> {
	switch (action.type) {
		case "generate_normal_response":
			return executeGenerateNormalResponse(character, userMessage);
		case "start_shiritori":
			return executeStartShiritori(character);
		case "play_shiritori":
			// Pass the entire payload object
			return executePlayShiritori(character, action.payload);
		case "learn_word":
			return executeLearnWord(character, action.payload.word);
		case "update_mood":
			return executeUpdateMood(character, action.payload.newMood);
		default:
			// Ensure all action types are handled, or provide a fallback
			console.warn("Unhandled action type:", (action as AgentAction).type);
			return errAsync(
				new Error(`Unhandled action type: ${(action as AgentAction).type}`),
			);
	}
}

// --- Action Implementation Functions ---

function executeGenerateNormalResponse(
	character: Character,
	userMessage: string,
): ResultAsync<ExecutionResult, Error> {
	// Generate response using LLM, considering character state
	const prompt = `
あなたはキャラクター「${character.name}」です。
性格: ${character.personality}
口調: ${character.tone}
現在の機嫌: ${character.mood}
現在の活動: ${character.current_activity}

ユーザーから以下のメッセージを受け取りました。キャラクターとして応答してください。
ユーザーメッセージ: "${userMessage}"
`;
	return fromPromise(
		generateText({
			model: google("gemini-2.0-flash-lite-preview-02-05"),
			prompt: prompt,
			temperature: 0.7,
		}).then((result) => result.text.trim()),
		(error) => {
			console.error("Error generating normal response with Gemini:", error);
			return error instanceof Error ? error : new Error(String(error));
		},
	).map((responseText) => ({
		responseText: responseText,
		stateChanges: {}, // Normal response doesn't change state by default
	}));
}

function executeStartShiritori(
	character: Character,
): ResultAsync<ExecutionResult, Error> {
	console.log("TODO: Implement start_shiritori action", character);
	const responseText = "しりとりしよう！いいよ！僕から言うね。「りんご」！";
	return okAsync({
		responseText: responseText,
		stateChanges: { current_activity: "shiritori", mood: "playful" }, // Example state change
	});
}

// Helper function to get the last character (handling potential variations)
function getLastChar(word: string): string | null {
	if (!word) return null;
	// Basic handling for Japanese vowels and small tsu, extend as needed
	const lastChar = word.slice(-1);
	// TODO: Add more sophisticated handling for Japanese specific rules (long vowels, small kana etc.)
	return lastChar;
}

// Helper function to check if a word ends with 'ん' or 'ン'
function endsWithN(word: string): boolean {
	return word.endsWith("ん") || word.endsWith("ン");
}

function executePlayShiritori(
	character: Character,
	payload: { previousWord: string; currentUserWord: string },
): ResultAsync<ExecutionResult, Error> {
	const { previousWord, currentUserWord } = payload;
	console.log("Executing play_shiritori action:", character, payload);

	// 1. Validate user's word
	const lastCharOfPrevious = getLastChar(previousWord);
	const firstCharOfCurrent = currentUserWord ? currentUserWord.charAt(0) : null;

	if (!lastCharOfPrevious || !firstCharOfCurrent) {
		return okAsync({
			responseText:
				"あれ？前の単語か今の単語がよくわからないや。もう一回言ってくれる？",
			stateChanges: {},
		});
	}

	if (endsWithN(currentUserWord)) {
		return okAsync({
			responseText: `あ！「${currentUserWord}」って「ん」で終わっちゃった！僕の勝ちかな？もう一回やる？`,
			stateChanges: { current_activity: "normal", mood: "happy" }, // Game ends
		});
	}

	if (lastCharOfPrevious.toLowerCase() !== firstCharOfCurrent.toLowerCase()) {
		// TODO: Add more sophisticated comparison (Hiragana/Katakana, small/large kana)
		return okAsync({
			responseText: `えーっと、「${currentUserWord}」は「${lastCharOfPrevious}」から始まってないみたいだよ？`,
			stateChanges: {},
		});
	}

	// 2. Generate next word using LLM
	const prompt = `
あなたはキャラクター「${character.name}」です。今ユーザーと「しりとり」をしています。
性格: ${character.personality}
口調: ${character.tone}
前の単語: ${currentUserWord}

ルールに従って、前の単語「${currentUserWord}」に続く、ひらがなかカタカナの単語を一つだけ答えてください。
「ん」で終わる単語はダメです。キャラクターになりきって、応答も考えてください。
例: 「次は〇〇だよ！」
`;
	return fromPromise(
		generateText({
			model: google("gemini-2.0-flash-lite-preview-02-05"),
			prompt: prompt,
			temperature: 0.8, // Slightly higher temperature for variety
		}).then((result) => result.text.trim()),
		(error) => {
			console.error("Error generating shiritori response with Gemini:", error);
			return error instanceof Error ? error : new Error(String(error));
		},
	).map((llmResponse) => {
		// TODO: Extract the actual next word from llmResponse if needed for state
		// For now, assume llmResponse is the full character response including the next word.
		// We might need to update 'previousWord' in the character state if we store it.
		return {
			responseText: llmResponse,
			stateChanges: {}, // Keep activity as 'shiritori'
		};
	});
}

function executeLearnWord(
	character: Character,
	word: string,
): ResultAsync<ExecutionResult, Error> {
	console.log("TODO: Implement learn_word action", character, word);
	const currentWords: string[] = JSON.parse(character.learned_words || "[]");
	// Ensure word is a string before adding
	const safeWord = typeof word === "string" ? word : String(word);
	const updatedWords = JSON.stringify([
		...new Set([...currentWords, safeWord]),
	]); // Add word, ensure unique

	const responseText = `「${safeWord}」だね! 覚えたよ! えっへん!`; // Use half-width symbols
	return okAsync({
		responseText: responseText,
		stateChanges: { learned_words: updatedWords },
	});
}

function executeUpdateMood(
	character: Character,
	newMood: string,
): ResultAsync<ExecutionResult, Error> {
	console.log("TODO: Implement update_mood action", character, newMood);
	// This action might not generate a direct response,
	// but could influence the *next* response generation.
	// Or it could generate a simple acknowledgement.
	const safeNewMood = typeof newMood === "string" ? newMood : String(newMood);
	const responseText = `(なんだか気分が${safeNewMood}になった気がする...)`; // Correct template literal syntax and use half-width parentheses
	return okAsync({
		responseText: responseText, // Or maybe "" if no direct output
		stateChanges: { mood: safeNewMood },
	});
}
