import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const apiKey =
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_LIVE_API_KEY ||
    process.env.VITE_VERTEX_API_KEY;

  res.setHeader('Content-Type', 'application/json');

  if (!apiKey) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'No Gemini API key configured in environment.' }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ apiKey, token: apiKey }));
}
