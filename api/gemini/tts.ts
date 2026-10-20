import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Modality } from '@google/genai';

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
    const { text, voice, rate } = await parseBody(req);
    if (!text || typeof text !== 'string') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing or invalid "text" in request body.' }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const finalVoice = voice || 'Kore';

    let finalText = text;
    const numRate = Number(rate) || 1.0;
    if (numRate < 0.9) {
      finalText = text.split(' ').join('... ');
    } else if (numRate > 1.1) {
      finalText = `Say this very rapidly: ${text}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ parts: [{ text: finalText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: finalVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0] as any;
    const base64Audio = part?.inlineData?.data || null;

    if (!base64Audio) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'No audio returned from Gemini speech model.' }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ audio: base64Audio }));
  } catch (error: any) {
    console.error('Server Gemini TTS error:', error);
    const statusCode = error?.status === 429 ? 429 : 500;
    res.statusCode = statusCode;
    res.end(JSON.stringify({ error: error?.message || 'TTS generation failed' }));
  }
}
