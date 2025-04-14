export async function replyMessage(
  accessToken: string,
  replyToken: string,
  message: string,
) {
  const url = 'https://api.line.me/v2/bot/message/reply'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
  const body = JSON.stringify({
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: message,
      },
    ],
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    })

    if (!response.ok) {
      console.error(
        'Failed to reply message:',
        response.status,
        response.statusText,
      )
      const errorBody = await response.text()
      console.error('Error body:', errorBody)
    }
  } catch (error) {
    console.error('Error sending reply:', error)
  }
}
