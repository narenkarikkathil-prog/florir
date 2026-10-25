# Orati (Florir) 

An AI-powered language learning platform featuring real-time conversational practice, AP-style simulated examinations, situational roleplaying, vocabulary comprehension listening, and spaced-repetition verb conjugation mastery.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- npm

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
# Gemini API Key (from Google AI Studio: https://aistudio.google.com/apikey)
# Kept strictly private on the server (no public VITE_ prefix!)
GEMINI_API_KEY="your_gemini_api_key"

# Supabase Credentials (from Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel from GitHub

Orati is configured for single-click zero-config deployment on Vercel.

### Step-by-Step Instructions

1. **Push your code to GitHub**:
   Ensure all changes are pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "chore: prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in.
   - Click **Add New...** > **Project**.
   - Select your GitHub repository (`florir` / `orati`) and click **Import**.

3. **Configure Project Settings**:
   - **Framework Preset**: Vite (detected automatically).
   - **Build Command**: `npm run build` (or `vite build`).
   - **Output Directory**: `dist`.
   - **Install Command**: `npm install`.

4. **Add Secret Environment Variables** (Critical!):
   In the **Environment Variables** section on Vercel:
   
   | Variable Name | Description | Where to get it |
   | :--- | :--- | :--- |
   | `GEMINI_API_KEY` | Your Gemini API Key (Private, no `VITE_` prefix!) | [Google AI Studio](https://aistudio.google.com/apikey) |
   | `VITE_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard > Settings > API |
   | `VITE_SUPABASE_ANON_KEY` | Supabase Anon Public Key | Supabase Dashboard > Settings > API |

   > **Security Note:** `GEMINI_API_KEY` does NOT use the `VITE_` prefix to ensure it remains private on the server and is never exposed to client browsers.

5. **Deploy**:
   - Click **Deploy**.
   - Vercel will install dependencies, build the Vite application, and deploy your site to a global CDN with automatic HTTPS!

---

## Features

- **Live Voice Sessions**: Multimodal real-time conversational speaking and listening with Gemini.
- **Text Conversations**: Chat in French, Spanish, Mandarin, Italian, German, Hindi, Arabic, or Russian with real-time feedback, correction hints, and translations.
- **Situational Learning**: Roleplay realistic scenarios (ordering at a café, booking travel, checking in).
- **AP Exam Mode**: Practice AP French/Spanish simulated conversations with timers and rubric-aligned scoring.
- **Verb Mastery**: Spaced repetition verb practice with multiple-choice and written recall modes.
- **Profiles & Progress**: Track learning time and levels with Supabase integration.

---

## Available Scripts

- `npm run dev`: Start local Vite development server
- `npm run build`: Build production assets into `dist/`
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run TypeScript type-checking without emitting files

---

## Author & Credits

Developed and run independently by **Narendran Karikkathil** as a non-profit educational initiative.

