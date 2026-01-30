---
title: FlowState Music Backend
emoji: 🎵
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
---

# FlowState Music Backend

Backend service for FlowState Music visualizer - handles YouTube audio streaming via yt-dlp.

## Endpoints

- `GET /api/health` - Health check
- `POST /api/download` - Initiate audio download
- `GET /api/status/:jobId` - Check download status
- `GET /api/stream/:jobId` - Stream audio file
- `POST /api/ai/suggest` - AI song suggestions
- `POST /api/youtube/search` - YouTube search
