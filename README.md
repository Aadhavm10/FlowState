# FlowState

AI-powered music visualizer with intelligent playlist generation and immersive 3D audio visualization.

## Features

- **FloatingLines Background** - Elegant animated background with interactive parallax effects
- **AI Playlist Generation** - Natural language playlist creation using Groq LLM (e.g., "late night drive")
- **YouTube Integration** - Automatic song search with audio version prioritization
- **3D Audio Visualization** - Real-time audio-reactive 3D visualization using Three.js
- **Smart Playback** - Seek functionality, auto-advance, volume control
- **Persistent Playlists** - Save and load playlists locally
- **Responsive Design** - Works on desktop and mobile with glassmorphism UI

## Tech Stack

- **Frontend**: Vanilla TypeScript + Vite + Three.js
- **Backend**: Express.js dev server + Vercel Serverless Functions
- **AI**: Groq (llama-3.3-70b-versatile)
- **APIs**: YouTube Data API v3, Piped/Invidious fallbacks
- **State**: Custom Observer pattern (no frameworks)
- **Audio**: YouTube IFrame API + Web Audio API

## Getting Started

### Prerequisites

- Node.js 16+
- Groq API key (get one at [console.groq.com](https://console.groq.com))
- YouTube Data API v3 key (optional, for better search results)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Aadhavm10/FlowState.git
cd FlowState
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here  # Optional
```

### Development

Run both the Vite dev server and API server:

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run api
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. **Generate Playlists**: Enter a natural language prompt (e.g., "chill study vibes") and click search
2. **3D Visualizer**: Click "3D Visualizer" button to see your music come to life
3. **My Playlists**: View and play your saved playlists
4. **File Upload**: Upload local audio files in the visualizer page

## API Rate Limits

- **General API**: 30 requests per 15 minutes
- **Playlist Generation**: 10 playlists per hour
- **Playlist Length**: 15-28 songs (automatically adjusted based on prompt)

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Make sure to add your environment variables in the Vercel dashboard.

## Project Structure

```
FlowState/
├── src/
│   ├── core/           # AudioBridge (file/YouTube audio abstraction)
│   ├── services/       # AI, YouTube search, playlist management
│   ├── state/          # Custom state management
│   ├── ui/             # Pages and components
│   ├── utils/          # Utilities
│   └── main.ts         # Entry point
├── api/                # Vercel serverless functions
├── dev-server.js       # Local API development server
└── vercel.json         # Vercel deployment config
```

## License

MIT

## Credits

- FloatingLines shader adapted from shader art techniques
- Three.js for 3D visualization
- Groq for AI-powered playlist generation
