# Myanmar Text-to-Speech Converter

A React app that converts Myanmar (Burmese) text to speech using the Google Gemini TTS API. Supports multiple voice styles, English-to-Myanmar translation, and TTS history.

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/myanmar-tts.git
git push -u origin main
```

### 2. Import into Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Select your GitHub repository
3. Vercel auto-detects the config from `vercel.json`
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` → your key from [aistudio.google.com](https://aistudio.google.com/app/apikey)
5. Click **Deploy**

## Local Development

```bash
npm install
# Install Vercel CLI for running serverless functions locally
npm i -g vercel
vercel dev   # runs both Vite + API functions on http://localhost:3000
```

Or run Vite only (API calls will fail without the functions):
```bash
npm run dev
```

## Project Structure

```
├── api/
│   ├── tts.ts          # Vercel function: POST /api/tts
│   ├── translate.ts    # Vercel function: POST /api/translate
│   └── suggest.ts      # Vercel function: POST /api/suggest
├── src/
│   ├── App.tsx
│   ├── components/
│   └── ...
├── vercel.json         # Vercel routing + build config
└── package.json
```
