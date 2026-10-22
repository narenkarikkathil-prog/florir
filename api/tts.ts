import type { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  'French': 'fr',
  'Spanish': 'es',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Hindi': 'hi',
  'Arabic': 'ar',
  'Russian': 'ru',
  'Mandarin': 'zh-CN',
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
  'Turkish': 'tr',
  'Vietnamese': 'vi',
  'Indonesian': 'id',
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { query } = parse(req.url || '', true);
  const text = (query.text as string) || '';
  const lang = (query.lang as string) || 'French';

  if (!text.trim()) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing "text" query parameter' }));
    return;
  }

  const langCode = LANGUAGE_CODE_MAP[lang] || (lang.length === 2 ? lang.toLowerCase() : 'fr');
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;

  try {
    const upstreamRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!upstreamRes.ok) {
      throw new Error(`Upstream TTS returned status ${upstreamRes.status}`);
    }

    const audioBuffer = await upstreamRes.arrayBuffer();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // Cache for 1 week
    res.end(Buffer.from(audioBuffer));
  } catch (error: any) {
    console.error('High-fidelity TTS stream error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error?.message || 'Audio fetch failed' }));
  }
}
