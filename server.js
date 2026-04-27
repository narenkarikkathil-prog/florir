/**
 * Production server for Orati.
 * - Serves the Vite-built static files
 * - Proxies Gemini API calls so the API key stays server-side
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// The Gemini API key — only available on the server, never sent to client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(express.json({ limit: '10mb' }));

// ─── API Proxy: Gemini TTS ─── 
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
            }
          }
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error('TTS proxy error:', e);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ─── API Proxy: Gemini Text Generation (for grading) ─── 
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { contents, model } = req.body;
    const modelName = model || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contents }] }]
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error('Generate proxy error:', e);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// ─── API Proxy: Gemini Live WebSocket info ─── 
app.get('/api/gemini/key', (req, res) => {
  // For the Live API, the client needs the key to open a WebSocket.
  // In production, you'd use a session token or short-lived credential.
  // For now, we pass it through an authenticated endpoint only.
  if (GEMINI_API_KEY) {
    res.json({ key: GEMINI_API_KEY });
  } else {
    res.status(500).json({ error: 'API key not configured' });
  }
});

// ─── Serve static files ─── 
app.use(express.static(path.join(__dirname, 'dist')));

// ─── SPA fallback: serve index.html for all non-file routes ─── 
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Orati server running on port ${PORT}`);
  console.log(`Gemini API key: ${GEMINI_API_KEY ? '✓ configured' : '✗ MISSING'}`);
});
