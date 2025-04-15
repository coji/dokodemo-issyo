import { fromPromise } from "neverthrow";

export function replyMessage(
	accessToken: string,
	replyToken: string,
	message: string,
) {
	const url = "https://api.line.me/v2/bot/message/reply";
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	};
	const body = JSON.stringify({
		replyToken: replyToken,
		messages: [
			{
				type: "text",
				text: message,
			},
		],
	});

	// fetch を fromPromise でラップ
	return fromPromise(
		fetch(url, {
			method: "POST",
			headers: headers,
			body: body,
		}).then(async (response) => {
			// fetch のレスポンスをチェック
			if (!response.ok) {
				const errorBody = await response.text();
				console.error(
					"Failed to reply message:",
					response.status,
					response.statusText,
					errorBody,
				);
				// エラー時は Error オブジェクトを throw して fromPromise にキャッチさせる
				throw new Error(
					`Failed to reply message: ${response.status} ${response.statusText} - ${errorBody}`,
				);
			}
			// 成功時は void (undefined) を返す Promise になる
		}),
		// fromPromise のエラーハンドラ
		(error) => {
			console.error("Error sending reply:", error);
			return error instanceof Error ? error : new Error(String(error));
		},
	);
}
