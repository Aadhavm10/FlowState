import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

interface SongSuggestion {
  title: string;
  artist: string;
}

interface Track {
  title: string;
  artist: string;
}

/**
 * AI-powered song suggestions based on user prompt
 */
async function suggestSongs(prompt: string, count: number = 20): Promise<SongSuggestion[]> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a music expert creating personalized playlists.
Given a user's request, suggest ${count} specific, real songs that match the mood, genre, or theme.

IMPORTANT:
- Only suggest REAL songs that actually exist
- Include exact artist name and song title
- Match the vibe/mood of the request
- Vary the artists for diversity
- Return ONLY a JSON array of objects with "title" and "artist" fields
- No additional text or explanation

Example output format:
[{"title": "Blinding Lights", "artist": "The Weeknd"}, {"title": "Levitating", "artist": "Dua Lipa"}]`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 2048
    });

    const content = completion.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    return suggestions.slice(0, count); // Ensure we don't exceed requested count

  } catch (error) {
    console.error('Groq AI suggestion error:', error);
    throw error;
  }
}

/**
 * Filter out non-music content (playlists, compilations, etc.)
 */
async function filterRealSongs(tracks: Track[]): Promise<Track[]> {
  try {
    const trackList = tracks
      .map((t, i) => `${i}: "${t.title}" by ${t.artist}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a music content validator. Your job is to filter out non-music content.

REJECT these types:
- Compilation albums (e.g., "Greatest Hits", "Best of...")
- Full albums or album playlists
- Podcasts, interviews, or talk shows
- "10 hour loop" or extended versions
- Mix/mashup compilations
- Karaoke versions (unless specifically requested)
- Lyric videos that are just text

ACCEPT these types:
- Official audio/video
- Live performances
- Acoustic versions
- Remix versions (by credited artists)
- Cover versions (if clearly labeled)
- Music videos

Return ONLY a JSON array of the INDEX NUMBERS that are valid individual songs.
Example: [0, 2, 3, 5, 7]`
        },
        {
          role: 'user',
          content: trackList
        }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.2,
      max_tokens: 1024
    });

    const content = completion.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      // If AI fails, return all tracks
      return tracks;
    }

    const validIndices = JSON.parse(jsonMatch[0]) as number[];
    return validIndices
      .filter(i => i >= 0 && i < tracks.length)
      .map(i => tracks[i]);

  } catch (error) {
    console.error('Groq AI filter error:', error);
    // On error, return all tracks (better than returning nothing)
    return tracks;
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, prompt, tracks, count } = req.body;

    if (action === 'suggest') {
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const suggestions = await suggestSongs(prompt, count);
      return res.status(200).json({
        suggestions,
        count: suggestions.length
      });
    }

    if (action === 'filter') {
      if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Tracks array is required' });
      }

      const validTracks = await filterRealSongs(tracks);
      return res.status(200).json({
        validTracks,
        originalCount: tracks.length,
        filteredCount: validTracks.length
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use "suggest" or "filter"' });

  } catch (error) {
    console.error('Groq AI error:', error);
    return res.status(500).json({
      error: 'AI service failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
