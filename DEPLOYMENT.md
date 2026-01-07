# Deployment Guide

## AI Playlist Generation - Testing Instructions

The AI playlist generation feature requires backend API routes that run on Vercel's serverless platform. Here's how to test it:

### Option 1: Deploy to Vercel (Recommended)

1. **Deploy to Vercel:**
   ```bash
   npm run deploy
   ```

2. **Configure Environment Variables on Vercel:**
   - Go to your Vercel dashboard → Your Project → Settings → Environment Variables
   - Add the following variables:
     - `GROQ_API_KEY`: Your Groq AI API key
     - `YOUTUBE_API_KEY`: Your YouTube Data API v3 key
     - `YOUTUBE_API_KEY_2`: Your second YouTube API key (optional)

3. **Redeploy after adding environment variables**

4. **Test the AI playlist feature** on your deployed URL

### Option 2: Local Development (Frontend Only)

For local development, you can work on the frontend with local MP3 files:

```bash
npm run dev
```

**Note:** The AI playlist generation feature will NOT work in local development because the API routes require Vercel's serverless runtime. Only the local MP3 player will work.

---

## Two Separate Systems

This project has two independent music systems:

### 1. Local MP3 Player (Works Locally)
- 16 local MP3 files from `/public/` directory
- 3D audio visualizer
- Simple song list sidebar
- No AI or YouTube

### 2. AI Playlist Generator (Requires Vercel Deployment)
- Natural language prompts (e.g., "late night drive")
- Groq AI generates song suggestions
- YouTube Data API searches for songs
- AI filters out compilations/playlists
- Plays music via YouTube IFrame API

---

## API Routes

The following API endpoints are configured in `/api/`:

- `POST /api/ai-suggest` - Get AI song suggestions
- `POST /api/ai-filter` - Filter out compilations
- `POST /api/youtube-search` - Search YouTube
- `POST /api/groq-ai` - Combined AI service
- `GET/POST /api/library-proxy/:path*` - AWS backend proxy

---

## Environment Variables

All API keys should be in `.env` file for local reference, but they must be configured in Vercel dashboard for production:

```env
GROQ_API_KEY=your_groq_key_here
YOUTUBE_API_KEY=your_youtube_key_here
YOUTUBE_API_KEY_2=your_second_youtube_key_here
```

---

## Build and Test

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview

# Deploy to production
npm run deploy
```
