import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api-gemini-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/gemini/')) {
              return next();
            }

            res.setHeader('Content-Type', 'application/json');

            if (!geminiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in .env' }));
              return;
            }

            // 1. /api/gemini/token
            if (req.url === '/api/gemini/token') {
              try {
                const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                const tokenRes = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
                  method: 'POST',
                  headers: {
                    'x-goog-api-key': geminiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    config: {
                      uses: 50,
                      expireTime,
                    },
                  }),
                });
                if (tokenRes.ok) {
                  const data = await tokenRes.json();
                  if (data?.name) {
                    res.end(JSON.stringify({
                      token: data.name,
                      isEphemeral: true,
                      endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${data.name}`,
                    }));
                    return;
                  }
                }
              } catch {}

              res.end(JSON.stringify({ token: geminiKey, isEphemeral: false }));
              return;
            }

            // Parse body helper
            const readJson = () => new Promise<any>((resolve, reject) => {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
              });
              req.on('error', reject);
            });

            // 2. /api/gemini/tts
            if (req.url === '/api/gemini/tts' && req.method === 'POST') {
              try {
                const { text, voice, rate, lang } = await readJson();
                let base64Audio = null;

                if (geminiKey) {
                  try {
                    const ai = new GoogleGenAI({ apiKey: geminiKey });
                    let finalText = text || '';
                    const numRate = Number(rate) || 1.0;
                    if (numRate < 0.9) finalText = finalText.split(' ').join('... ');
                    else if (numRate > 1.1) finalText = `Say this very rapidly: ${finalText}`;

                    const response = await ai.models.generateContent({
                      model: 'gemini-3.5-flash',
                      contents: [{ parts: [{ text: finalText }] }],
                      config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } },
                        },
                      },
                    });
                    base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
                  } catch (err: any) {
                    console.warn('Local Gemini TTS rate limited, using neural fallback:', err?.message || err);
                  }
                }

                if (!base64Audio && text) {
                  const langCodeMap: Record<string, string> = {
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
                  const isSpanish = (voice || '').toLowerCase().includes('es') || (voice || '').toLowerCase().includes('jorge');
                  const langCode = (lang && langCodeMap[lang]) || (isSpanish ? 'es' : 'fr');
                  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
                  const ttsRes = await fetch(ttsUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://translate.google.com/' }
                  });
                  const buf = await ttsRes.arrayBuffer();
                  base64Audio = Buffer.from(buf).toString('base64');
                }

                res.end(JSON.stringify({ audio: base64Audio }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e?.message || 'TTS generation failed' }));
              }
              return;
            }

            // 3. /api/tts (Direct MP3 streaming for audio elements)
            if (req.url?.startsWith('/api/tts')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost:3000');
                const text = urlObj.searchParams.get('text') || '';
                const lang = urlObj.searchParams.get('lang') || 'French';
                const langCodeMap: Record<string, string> = {
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
                const langCode = langCodeMap[lang] || (lang.length === 2 ? lang.toLowerCase() : 'fr');
                const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;

                const ttsRes = await fetch(ttsUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://translate.google.com/' }
                });
                const buf = await ttsRes.arrayBuffer();
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
                res.end(Buffer.from(buf));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e?.message || 'TTS stream failed' }));
              }
              return;
            }

            // 3. /api/gemini/generate
            if (req.url === '/api/gemini/generate' && req.method === 'POST') {
              try {
                const { model, contents, config } = await readJson();
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const response = await ai.models.generateContent({
                  model: model || 'gemini-3.5-flash-lite',
                  contents,
                  config: config || undefined,
                });
                const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
                res.end(JSON.stringify({ text }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e?.message || 'Generation failed' }));
              }
              return;
            }

            next();
          });
        },
      },
    ],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-ai': ['@google/genai'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
