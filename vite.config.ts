import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_LIVE_API_KEY || env.VITE_VERTEX_API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'local-token-plugin',
        configureServer(server) {
          server.middlewares.use('/api/gemini/token', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (geminiKey) {
              res.end(JSON.stringify({ apiKey: geminiKey }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'No Gemini API key configured in environment.' }));
            }
          });
        }
      }
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_LIVE_API_KEY': JSON.stringify(env.VITE_GEMINI_LIVE_API_KEY || geminiKey),
      'import.meta.env.VITE_GEMINI_TTS_API_KEY': JSON.stringify(env.VITE_GEMINI_TTS_API_KEY || geminiKey),
      'import.meta.env.VITE_VERTEX_API_KEY': JSON.stringify(env.VITE_VERTEX_API_KEY || geminiKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
