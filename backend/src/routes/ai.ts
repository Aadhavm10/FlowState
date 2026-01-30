import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';

const router = Router();

interface SongSuggestion {
  title: string;
  artist: string;
}

interface Track {
  title: string;
  artist: string;
}

/**
 * Get Groq client with validation
 */
function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set. Please configure it in your deployment platform.');
  }

  if (!apiKey.startsWith('gsk_')) {
    throw new Error('GROQ_API_KEY appears to be invalid (should start with gsk_)');
  }

  return new Groq({ apiKey });
}

/**
 * Retry wrapper with exponential backoff for rate limit handling
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const isRateLimitError =
        error?.message?.includes('Too many requests') ||
        error?.status === 429 ||
        error?.error?.message?.includes('rate limit');

      if (isRateLimitError && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[AI] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries reached');
}

/**
 * POST /api/ai/suggest
 * Generate AI-powered song suggestions based on user prompt
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { prompt, count = 20 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('[AI] Suggesting songs for prompt:', prompt, 'count:', count);

    const groq = getGroqClient();
    const completion = await retryWithBackoff(() =>
      groq.chat.completions.create({
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
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2048
      })
    );

    const content = completion.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }

    const suggestions: SongSuggestion[] = JSON.parse(jsonMatch[0]);
    const limitedSuggestions = suggestions.slice(0, count);

    console.log('[AI] Generated', limitedSuggestions.length, 'suggestions');

    return res.status(200).json({
      suggestions: limitedSuggestions,
      count: limitedSuggestions.length
    });

  } catch (error) {
    console.error('[AI] Suggestion error:', error);
    return res.status(500).json({
      error: 'AI suggestion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/ai/filter
 * Filter out non-music content (playlists, compilations, etc.)
 */
router.post('/filter', async (req: Request, res: Response) => {
  try {
    const { tracks } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Tracks array is required' });
    }

    console.log('[AI] Filtering', tracks.length, 'tracks');

    const trackList = tracks
      .map((t: Track, i: number) => `${i}: "${t.title}" by ${t.artist}`)
      .join('\n');

    const groq = getGroqClient();
    const completion = await retryWithBackoff(() =>
      groq.chat.completions.create({
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
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1024
      })
    );

    const content = completion.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      // If AI fails, return all tracks
      console.log('[AI] No JSON in filter response, returning all tracks');
      return res.status(200).json({
        validTracks: tracks,
        originalCount: tracks.length,
        filteredCount: tracks.length
      });
    }

    const validIndices = JSON.parse(jsonMatch[0]) as number[];
    const validTracks = validIndices
      .filter((i: number) => i >= 0 && i < tracks.length)
      .map((i: number) => tracks[i]);

    console.log('[AI] Filtered to', validTracks.length, 'valid tracks');

    return res.status(200).json({
      validTracks,
      originalCount: tracks.length,
      filteredCount: validTracks.length
    });

  } catch (error) {
    console.error('[AI] Filter error:', error);
    // On error, return all tracks (better than returning nothing)
    const { tracks } = req.body;
    return res.status(200).json({
      validTracks: tracks || [],
      originalCount: tracks?.length || 0,
      filteredCount: tracks?.length || 0
    });
  }
});

export default router;
