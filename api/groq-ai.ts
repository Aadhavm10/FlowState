import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

/**
 * Get Groq client with validation
 */
function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set. Please configure it in Vercel dashboard.');
  }

  if (!apiKey.startsWith('gsk_')) {
    throw new Error('GROQ_API_KEY appears to be invalid (should start with gsk_)');
  }

  return new Groq({ apiKey });
}

interface SongSuggestion {
  title: string;
  artist: string;
}

interface Track {
  title: string;
  artist: string;
}

/**
 * Retry wrapper with exponential backoff for rate limit handling
 * TEMPORARILY DISABLED strict rate limiting - will retry aggressively
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5, // Increased from 3
  initialDelay: number = 500 // Start with 500ms
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimitError =
        error?.message?.includes('Too many requests') ||
        error?.status === 429 ||
        error?.error?.message?.includes('rate limit');

      if (isRateLimitError && attempt < maxRetries - 1) {
        // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not rate limit or max retries reached, throw
      throw error;
    }
  }

  throw lastError || new Error('Max retries reached');
}

/**
 * AI-powered song suggestions based on user prompt
 */
async function suggestSongs(groq: Groq, prompt: string, count: number = 20): Promise<SongSuggestion[]> {
  try {
    // Wrap Groq API call with retry logic
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
        model: 'mixtral-8x7b-32768',
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
async function filterRealSongs(groq: Groq, tracks: Track[]): Promise<Track[]> {
  try {
    const trackList = tracks
      .map((t, i) => `${i}: "${t.title}" by ${t.artist}`)
      .join('\n');

    // Wrap Groq API call with retry logic
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
        model: 'mixtral-8x7b-32768',
        temperature: 0.2,
        max_tokens: 1024
      })
    );

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

  // Initialize Groq client with error handling
  let groq: Groq;
  try {
    console.log('[Groq AI] Handler invoked');
    console.log('[Groq AI] Checking GROQ_API_KEY...');
    console.log('[Groq AI] API key present:', !!process.env.GROQ_API_KEY);

    groq = getGroqClient();
    console.log('[Groq AI] Groq client initialized successfully');
  } catch (error) {
    console.error('[Groq AI] Failed to initialize Groq client:', error);
    return res.status(500).json({
      error: 'Groq API configuration error',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check that GROQ_API_KEY is set in Vercel environment variables'
    });
  }

  try {
    const { action, prompt, tracks, count } = req.body;
    console.log('[Groq AI] Action:', action);

    if (action === 'suggest') {
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('[Groq AI] Suggesting songs for prompt:', prompt);
      const suggestions = await suggestSongs(groq, prompt, count);
      console.log('[Groq AI] Generated', suggestions.length, 'suggestions');

      return res.status(200).json({
        suggestions,
        count: suggestions.length
      });
    }

    if (action === 'filter') {
      if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Tracks array is required' });
      }

      console.log('[Groq AI] Filtering', tracks.length, 'tracks');
      const validTracks = await filterRealSongs(groq, tracks);
      console.log('[Groq AI] Filtered to', validTracks.length, 'valid tracks');

      return res.status(200).json({
        validTracks,
        originalCount: tracks.length,
        filteredCount: validTracks.length
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use "suggest" or "filter"' });

  } catch (error) {
    console.error('[Groq AI] Handler error:', error);
    console.error('[Groq AI] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      error: 'AI service failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
