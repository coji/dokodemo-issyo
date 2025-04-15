import { errAsync, fromPromise, okAsync, type ResultAsync } from "neverthrow";
import { executeAction } from "./utils/agent/action-executor"; // Import executor
import { determineNextAction } from "./utils/agent/controller-llm"; // Import controller
import {
	fetchCharacterByName,
	updateCharacterState,
	type Character,
} from "./utils/character";
import { getConversationHistory } from "./utils/d1"; // Import history functions

interface AgentResponse {
	responseText: string;
	updatedCharacter: Character | null;
}

export function processUserMessage(
	userId: string,
	userMessage: string,
): ResultAsync<AgentResponse, Error> {
	let fetchedCharacter: Character | null = null;

	// 1. Fetch current character state
	return (
		fromPromise(fetchCharacterByName("トロ"), (e) =>
			e instanceof Error ? e : new Error(String(e)),
		)
			.andThen((character) => {
				if (!character) {
					return errAsync(new Error("Character not found: トロ"));
				}
				fetchedCharacter = character; // Store character state
				// 1.5 Fetch conversation history
				return getConversationHistory(userId);
			})
			// 2. Determine next action using Controller LLM (with history)
			.andThen((history) => {
				if (!fetchedCharacter) {
					// Should not happen if previous step succeeded
					return errAsync(new Error("Character state lost during processing"));
				}

				// Convert history format for determineNextAction, interleaving turns
				const formattedHistory: Array<{
					role: "user" | "assistant";
					content: string;
				}> = [];
				history.reverse();
				for (const entry of history) {
					formattedHistory.push({ role: "assistant", content: entry.response });
					formattedHistory.push({ role: "user", content: entry.message });
				}

				return determineNextAction(
					fetchedCharacter,
					userMessage,
					formattedHistory,
				).map(
					(action) => ({ character: fetchedCharacter as Character, action }), // Cast as Character, already checked
				);
			})
			// 3. Execute the action
			.andThen(({ character, action }) =>
				executeAction(action, character, userMessage).map((result) => ({
					character,
					result, // Pass character and execution result
				})),
			)
			// 4. Update character state in DB (if necessary)
			.andThen(({ character, result }) => {
				if (Object.keys(result.stateChanges).length > 0) {
					// Only update if there are changes
					return fromPromise(
						updateCharacterState(character.id, result.stateChanges),
						(e) => (e instanceof Error ? e : new Error(String(e))),
					).map(
						(updatedChar): AgentResponse => ({
							// updatedChar can be null, matches AgentResponse
							responseText: result.responseText,
							updatedCharacter: updatedChar,
						}),
					);
				}
				// No state changes, pass original character (which is not null here)
				// Ensure the return type matches AgentResponse
				return okAsync({
					responseText: result.responseText,
					updatedCharacter: character,
				});
			})
	);
	// 5. Return final response (already mapped in step 4)
}

// Removed custom fromPromise helper, will use the one from neverthrow directly
