import { env } from "cloudflare:workers";
import { type ResultAsync, fromPromise } from "neverthrow";

export function saveConversationHistory(
	userId: string,
	message: string,
	response: string,
): ResultAsync<void, Error> {
	return fromPromise(
		env.DB.prepare(
			"INSERT INTO conversations (user_id, message, response) VALUES (?, ?, ?)",
		)
			.bind(userId, message, response)
			.run(),
		(error) => (error instanceof Error ? error : new Error(String(error))),
	).map(() => {}); // 成功時はvoidを返す
}

// Define the structure of a conversation entry
export interface ConversationEntry {
	id: number;
	user_id: string;
	timestamp: string; // ISO 8601 format
	message: string;
	response: string;
}

// Function to get recent conversation history for a user
export function getConversationHistory(
	userId: string,
	limit = 5, // Default to fetching the last 5 entries
): ResultAsync<ConversationEntry[], Error> {
	return fromPromise(
		env.DB.prepare(
			"SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
		)
			.bind(userId, limit)
			.all<ConversationEntry>(), // Specify the expected row type
		(error) => (error instanceof Error ? error : new Error(String(error))),
	).map((result) => result.results || []); // Return results array or empty array
}
