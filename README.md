# FlowState - 3D Audio Visualizer with AI Playlist Generation

A music application with two distinct systems:
1. **3D Visualizer** - Local MP3 player with real-time 3D audio visualization
2. **AI Playlist Generator** - Natural language → AI → YouTube playlists

## 🚀 Quick Start

### Local Development (MP3 Player Only)
```bash
npm install
npm run dev
```
Open http://localhost:5173/

**Note:** AI playlist generation requires Vercel deployment (see below).

### Deploy to Vercel (Full Features)
```bash
npm run deploy
```

After deployment, configure environment variables in Vercel Dashboard:
- `GROQ_API_KEY` - Your Groq AI API key
- `YOUTUBE_API_KEY` - Your YouTube Data API v3 key
- `YOUTUBE_API_KEY_2` - Second YouTube API key (optional)

## 🎵 Two Music Systems

### System 1: Local MP3 Player (Works Locally)
- 16 local MP3 files from `/public/` directory
- 3D audio visualizer with Three.js
- Real-time frequency analysis
- Simple song list with search

### System 2: AI Playlist Generator (Requires Vercel)
- Type natural language prompts (e.g., "frolicking in a field")
- Groq AI generates ~30 song suggestions
- YouTube Data API searches for songs
- AI filters out compilations
- Plays via YouTube IFrame API

## 📦 API Endpoints

- `POST /api/ai-suggest` - Get AI song suggestions
- `POST /api/ai-filter` - Filter compilations
- `POST /api/youtube-search` - Search YouTube
- `GET/POST /api/library-proxy/*` - AWS backend proxy

## 🛠️ Commands

```bash
npm run dev      # Start dev server (MP3s only)
npm run build    # Build production bundle
npm run preview  # Preview production build
npm run deploy   # Deploy to Vercel
```

## 📝 Notes

- The TypeScript warning about `/api/tsconfig.json` is harmless
- AI features only work when deployed to Vercel
- Local dev only supports the MP3 player system
- See DEPLOYMENT.md for detailed deployment instructions
