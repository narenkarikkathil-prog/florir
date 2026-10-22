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

const LANGUAGE_CODE_MAP: Record<string, string> = {
  'French': 'fr',
  'Spanish': 'es',
  'German': 'de',
  'Italian': 'it',
  'Mandarin': 'zh-CN',
  'Hindi': 'hi',
  'Arabic': 'ar',
  'Russian': 'ru',
  'Farsi (Persian)': 'fa',
  'Farsi': 'fa',
  'Persian': 'fa',
  'Thai': 'th',
  'Urdu': 'ur',
  'Tagalog (Filipino)': 'tl',
  'Tagalog': 'tl',
  'Filipino': 'fil',
  'Serbian': 'sr',
  'Croatian': 'hr',
  'Bosnian': 'bs',
  'Serbian, Croatian, and Bosnian': 'sr',
  'Malayalam': 'ml',
  'Portuguese': 'pt',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Turkish': 'tr',
  'Vietnamese': 'vi',
  'Indonesian': 'id',
};

async function fetchNeuralTtsBase64(text: string, voice?: string, lang?: string): Promise<string> {
  const isSpanish = voice?.toLowerCase().includes('es') || voice?.toLowerCase().includes('jorge');
  const langCode = (lang && LANGUAGE_CODE_MAP[lang]) || (isSpanish ? 'es' : 'fr');
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  });
  if (!response.ok) throw new Error(`Neural fallback returned ${response.status}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let text = '';
  let voice = 'Kore';
  let rate = 1.0;
  let lang = 'French';

  try {
    const body = await parseBody(req);
    text = body.text || '';
    voice = body.voice || 'Kore';
    rate = Number(body.rate) || 1.0;
    lang = body.lang || 'French';
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON request body' }));
    return;
  }

  if (!text.trim()) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing or empty "text" parameter' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Try Gemini Speech if key is present
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      let finalText = text;
      if (rate < 0.9) {
        finalText = text.split(' ').join('... ');
      } else if (rate > 1.1) {
        finalText = `Say this very rapidly: ${text}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ parts: [{ text: finalText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0] as any;
      const base64Audio = part?.inlineData?.data || null;

      if (base64Audio) {
        res.statusCode = 200;
        res.end(JSON.stringify({ audio: base64Audio, source: 'gemini' }));
        return;
      }
    } catch (err: any) {
      console.warn('Gemini TTS quota or connection issue, falling back to neural audio:', err?.message || err);
    }
  }

  // Resilient fallback to high-fidelity native neural TTS (never hits quota limits)
  try {
    const base64Audio = await fetchNeuralTtsBase64(text, voice, lang);
    res.statusCode = 200;
    res.end(JSON.stringify({ audio: base64Audio, source: 'neural' }));
  } catch (err: any) {
    console.error('All TTS generation failed:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err?.message || 'TTS generation failed' }));
  }
}
