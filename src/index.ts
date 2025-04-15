import { zValidator } from "@hono/zod-validator";
import { validateSignature } from "@line/bot-sdk";
import { env } from "cloudflare:workers";
import { Hono, type Context } from "hono"; // Context を直接インポート
import { z } from "zod";
import { processUserMessage } from "./agent"; // Import the agent processor
import { saveConversationHistory } from "./utils/d1";
// import { analyzeIntent, type Intent } from './utils/intent-analyzer'; // No longer needed here
import { replyMessage } from "./utils/line";
// import { generateResponse } from './utils/response-generator'; // No longer needed here

const app = new Hono<{ Bindings: Env }>();

const requestBodySchema = z.object({
	events: z.array(
		z.object({
			type: z.string(),
			message: z.object({
				type: z.string(),
				text: z.string().optional(),
			}),
			replyToken: z.string(),
			source: z.object({
				type: z.string(),
				userId: z.string().optional(),
				groupId: z.string().optional(),
				roomId: z.string().optional(),
			}),
		}),
	),
});

// メッセージ処理のコアロジック
async function handleMessageEvent(
	c: Context<{ Bindings: Env }>,
	event: z.infer<typeof requestBodySchema>["events"][number],
) {
	const userId = event.source.userId || "unknown-user";
	const text = event.message.text!;

	// Use the agent to process the message
	const agentProcessingChain = processUserMessage(userId, text)
		.andThen((agentResponse) => {
			// Agent handled state updates internally (or suggested them)
			// Now, reply via LINE and save history
			console.log("Agent response:", agentResponse);
			return replyMessage(
				c.env.LINE_CHANNEL_ACCESS_TOKEN,
				event.replyToken,
				agentResponse.responseText, // Use responseText from agent
			).map(() => agentResponse); // Pass agentResponse along
		})
		.andThen((agentResponse) =>
			// Save conversation history using the agent's response text
			saveConversationHistory(userId, text, agentResponse.responseText).map(
				() => agentResponse.responseText, // Return just the text for logging
			),
		);

	// Handle the final result of the agent processing chain
	await agentProcessingChain.match(
		(finalResponseText) => {
			console.log("Successfully processed and sent:", finalResponseText);
		},
		(error) => {
			console.error("Error in processing chain:", error);
		},
	);
}

app.post("/webhook", zValidator("json", requestBodySchema), async (c) => {
	const signature = c.req.header("x-line-signature");
	const bodyText = await c.req.text();
	const channelSecret = c.env.LINE_CHANNEL_SECRET;

	if (
		!signature ||
		!channelSecret ||
		!validateSignature(bodyText, channelSecret, signature)
	) {
		return c.text("Invalid signature", 400);
	}

	const { events } = c.req.valid("json");
	for (const event of events) {
		if (
			event.type !== "message" ||
			event.message.type !== "text" ||
			!event.message.text
		) {
			continue;
		}

		// 各イベントの処理を非同期で実行
		c.executionCtx.waitUntil(handleMessageEvent(c, event));
	}

	// LINEプラットフォームにはすぐにOKを返す
	return c.text("OK");
});

app.get("/", async (c) => {
	const ret = await env.DB.prepare('SELECT datetime("now") as now').run();

	return c.json({
		now: ret.results[0].now,
		message: "Hello!",
	});
});

export default app;
