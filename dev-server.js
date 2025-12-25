/**
 * Local Development Server for API Endpoints
 * Simulates Vercel serverless functions locally without authentication
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const playlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 playlist generations per hour
  message: { error: 'Playlist generation limit reached. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit request body size

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import API handlers (we'll use eval to run the TypeScript files)
const fs = require('fs');
const { Groq } = require('groq-sdk');

// Groq AI endpoint
app.post('/api/groq-ai', playlistLimiter, async (req, res) => {
  try {
    const { action, prompt, count, tracks } = req.body;

    // Validation
    if (!action || !['suggest', 'filter'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (action === 'suggest') {
      // Validate prompt
      if (!prompt || typeof prompt !== 'string' || prompt.length > 200) {
        return res.status(400).json({ error: 'Invalid prompt' });
      }

      // Set base count to 18 (decently long playlist)
      const baseCount = 18;
      let dynamicCount = count || baseCount;
      const lowerPrompt = prompt.toLowerCase();

      if (lowerPrompt.includes('quick') || lowerPrompt.includes('short')) {
        dynamicCount = 10; // Short playlist
      } else if (lowerPrompt.includes('long') || lowerPrompt.includes('extended') || lowerPrompt.includes('marathon')) {
        dynamicCount = 28; // Long playlist
      } else if (lowerPrompt.includes('playlist')) {
        dynamicCount = 22; // Standard playlist
      } else {
        // Add some randomness: 15-20 songs
        dynamicCount = 15 + Math.floor(Math.random() * 6);
      }

      // Cap at 30 songs to prevent API abuse
      dynamicCount = Math.min(dynamicCount, 30);

      console.log(`Generating ${dynamicCount} song suggestions for: "${prompt}"`);

      const systemPrompt = `You are a music expert. Generate a list of ${dynamicCount} real, specific songs based on the user's prompt. Return ONLY a valid JSON array of objects with "artist" and "title" fields. No explanations, no markdown, just the JSON array.`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 2000
      });

      const responseText = completion.choices[0]?.message?.content || '[]';
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(cleanText);

      console.log(`Generated ${suggestions.length} suggestions`);
      return res.json({ suggestions, count: suggestions.length });

    } else if (action === 'filter') {
      // Validate tracks
      if (!tracks || !Array.isArray(tracks) || tracks.length === 0 || tracks.length > 50) {
        return res.status(400).json({ error: 'Invalid tracks array' });
      }

      console.log(`Filtering ${tracks.length} tracks`);

      const systemPrompt = 'You are a music curator. Filter out compilations, playlists, albums, and non-music content. Return ONLY valid JSON array of objects with "title" and "artist" fields for real individual songs.';

      const userPrompt = `Filter these to only real individual songs (remove compilations, playlists, "Best of", "Greatest Hits", etc.):\n${JSON.stringify(tracks)}`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 2000
      });

      const responseText = completion.choices[0]?.message?.content || '[]';
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const validTracks = JSON.parse(cleanText);

      console.log(`Filtered to ${validTracks.length} tracks`);
      return res.json({
        validTracks,
        originalCount: tracks.length,
        filteredCount: validTracks.length
      });
    }

  } catch (error) {
    console.error('Groq AI error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// YouTube Search endpoint
app.post('/api/youtube-search', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;

    // Validation
    if (!query || typeof query !== 'string' || query.length > 150) {
      return res.status(400).json({ error: 'Invalid query' });
    }

    if (maxResults > 20) {
      return res.status(400).json({ error: 'maxResults cannot exceed 20' });
    }

    console.log(`Searching YouTube for: "${query}" (max: ${maxResults})`);

    // Try YouTube Data API if key is available
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY.replace(/"/g, '');

        // Prioritize audio versions: add "audio" or "official audio" to query
        const audioQuery = `${query} audio`;
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults * 2}&q=${encodeURIComponent(audioQuery)}&type=video&videoCategoryId=10&key=${apiKey}`;

        const response = await fetch(searchUrl);

        if (response.ok) {
          const data = await response.json();

          // Get video details to fetch duration
          const videoIds = data.items.map(item => item.id.videoId).join(',');
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          // Filter and prioritize audio versions
          let results = detailsData.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            duration: item.contentDetails.duration,
            // Score for prioritization
            score: 0
          }));

          // Score results: prefer "audio", "official audio", avoid "music video"
          results = results.map(item => {
            const lowerTitle = item.title.toLowerCase();
            let score = 0;

            // Prioritize
            if (lowerTitle.includes('official audio')) score += 10;
            if (lowerTitle.includes('audio') && !lowerTitle.includes('music video')) score += 5;
            if (lowerTitle.includes('lyric') || lowerTitle.includes('lyrics')) score += 3;

            // Deprioritize
            if (lowerTitle.includes('music video')) score -= 5;
            if (lowerTitle.includes('official video')) score -= 3;
            if (lowerTitle.includes('live')) score -= 2;
            if (lowerTitle.includes('cover')) score -= 4;
            if (lowerTitle.includes('remix') && !query.toLowerCase().includes('remix')) score -= 3;

            return { ...item, score };
          });

          // Sort by score (highest first) and take maxResults
          results.sort((a, b) => b.score - a.score);
          results = results.slice(0, maxResults);

          // Remove score from final results
          const finalResults = results.map(({ score, ...item }) => item);

          console.log(`Found ${finalResults.length} results from YouTube Data API (audio prioritized)`);
          return res.json({
            results: finalResults,
            source: 'YouTube',
            count: finalResults.length
          });
        } else {
          console.log('YouTube API failed:', await response.text());
        }
      } catch (error) {
        console.log('YouTube API error:', error.message);
      }
    }

    // Try Piped API fallback
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api-piped.mha.fi',
      'https://piped-api.privacy.com.de'
    ];

    for (const instance of pipedInstances) {
      try {
        const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const response = await fetch(searchUrl);

        if (!response.ok) continue;

        const data = await response.json();
        const results = data.items
          .filter(item => item.type === 'stream')
          .slice(0, maxResults)
          .map(item => ({
            videoId: item.url.replace('/watch?v=', ''),
            title: item.title,
            channelTitle: item.uploaderName || 'Unknown',
            thumbnailUrl: item.thumbnail,
            duration: `PT${Math.floor(item.duration / 60)}M${item.duration % 60}S`
          }));

        console.log(`Found ${results.length} results from ${instance}`);
        return res.json({
          results,
          source: 'Piped',
          count: results.length
        });

      } catch (error) {
        console.log(`Failed to fetch from ${instance}:`, error.message);
        continue;
      }
    }

    // Fallback: try Invidious
    const invidiousInstances = [
      'https://invidious.snopyta.org',
      'https://yewtu.be',
      'https://invidious.kavin.rocks'
    ];

    for (const instance of invidiousInstances) {
      try {
        const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
        const response = await fetch(searchUrl);

        if (!response.ok) continue;

        const data = await response.json();
        const results = data
          .slice(0, maxResults)
          .map(item => ({
            videoId: item.videoId,
            title: item.title,
            channelTitle: item.author || 'Unknown',
            thumbnailUrl: item.videoThumbnails?.[0]?.url || '',
            duration: `PT${Math.floor(item.lengthSeconds / 60)}M${item.lengthSeconds % 60}S`
          }));

        console.log(`Found ${results.length} results from ${instance}`);
        return res.json({
          results,
          source: 'Invidious',
          count: results.length
        });

      } catch (error) {
        console.log(`Failed to fetch from ${instance}:`, error.message);
        continue;
      }
    }

    return res.status(503).json({ error: 'All search services unavailable' });

  } catch (error) {
    console.error('YouTube search error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/groq-ai`);
  console.log(`  POST http://localhost:${PORT}/api/youtube-search`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`\nEnvironment:`);
  console.log(`  GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
