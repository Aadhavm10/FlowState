# 3D Audio Visualizer - YouTube Edition

A stunning 3D audio visualizer with AI-powered YouTube music integration!

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/1NxAxhUVn38/0.jpg)](https://www.youtube.com/watch?v=1NxAxhUVn38)

## 🎵 Features

- **3D Audio Visualization**: Real-time frequency-reactive visualizer with Three.js
- **AI Playlist Generation**: Natural language playlists powered by Groq AI ("late night drive", "workout energy")
- **YouTube Integration**: Multi-tier search fallback (YouTube API → Piped → Invidious)
- **File Upload Support**: Upload local audio files for visualization
- **Playlist Management**: Save and manage playlists in localStorage
- **Responsive UI**: Semi-transparent tabbed overlay

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env and add your API keys:
# YOUTUBE_API_KEY=your_key
# GROQ_API_KEY=your_key
```

Get API keys:
- **YouTube**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Groq AI**: [Groq Console](https://console.groq.com/keys)

### 3. Run Development
```bash
# Terminal 1 - Vite dev server
npm run dev

# Terminal 2 - Vercel serverless functions
npx vercel dev --listen 3000
```

Open [http://localhost:5173](http://localhost:5173)

## 📖 Usage

- **Visualizer Tab**: Upload files, adjust settings
- **Search Tab**: "late night drive" → AI generates playlist
- **Playlist Tab**: View & manage saved playlists
- **Settings Tab**: Volume, repeat, shuffle controls

## 🏗️ Architecture

```
User Prompt → Groq AI → YouTube Search → AI Filter → Playlist → YouTube Player → 3D Viz
```

## 🚢 Deploy to Vercel

```bash
npm run build
vercel --prod
```

Add environment variables in Vercel dashboard (Settings → Environment Variables).

## 🛠️ Tech Stack

- Vanilla TypeScript + Vite + Three.js
- Vercel Serverless Functions
- Groq AI (Mixtral-8x7b)
- YouTube IFrame Player API

## Known Issues

* YouTube visualization limited by CORS (playback works, visualization works with files)

---

**Enjoy the vibes! 🎵✨**