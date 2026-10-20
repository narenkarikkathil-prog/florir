import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

async function parseBody(req: any): Promise<any> {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: any) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }));
    return;
  }

  try {
    const { model, contents, config } = await parseBody(req);
    if (!contents) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing "contents" in request body.' }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const targetModel = model || 'gemini-3.5-flash-lite';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: config || undefined,
    });

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.statusCode = 200;
    res.end(JSON.stringify({ text }));
  } catch (error: any) {
    console.error('Server Gemini generate error:', error);
    const statusCode = error?.status === 429 ? 429 : 500;
    res.statusCode = statusCode;
    res.end(JSON.stringify({ error: error?.message || 'Text generation failed' }));
  }
}
