import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  res.setHeader('Content-Type', 'application/json');

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }));
    return;
  }

  // Attempt to generate a short-lived ephemeral token for client Live WebSocket connection
  try {
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const tokenRes = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          uses: 1,
          expireTime,
          liveConnectConstraints: {
            model: 'models/gemini-2.5-flash',
            config: {
              responseModalities: ['AUDIO'],
            },
          },
        },
      }),
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      if (data?.name) {
        res.statusCode = 200;
        res.end(JSON.stringify({
          token: data.name,
          isEphemeral: true,
          endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${data.name}`,
        }));
        return;
      }
    }
  } catch (err) {
    console.warn('Ephemeral token creation failed, falling back to session token:', err);
  }

  // Fallback to authorized session token
  res.statusCode = 200;
  res.end(JSON.stringify({ token: apiKey, isEphemeral: false }));
}
