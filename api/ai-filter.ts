import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

// Retry logic for rate limits
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('rate limit');
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Max retries reached');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { tracks } = req.body;
    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Tracks array required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const groq = new Groq({ apiKey });
    const trackList = tracks.map((t: any, i: number) => `${i}: "${t.title}" by ${t.artist}`).join('\n');

    const completion = await retryWithBackoff(() =>
      groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Filter out compilations, full albums, podcasts, 10-hour loops.
Return ONLY a JSON array of valid song index numbers. Example: [0, 2, 5]`
          },
          { role: 'user', content: trackList }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1024
      })
    );

    const content = completion.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    const validIndices = jsonMatch ? JSON.parse(jsonMatch[0]) : tracks.map((_: any, i: number) => i);
    const validTracks = validIndices
      .filter((i: number) => i >= 0 && i < tracks.length)
      .map((i: number) => tracks[i]);

    return res.status(200).json({
      validTracks,
      originalCount: tracks.length,
      filteredCount: validTracks.length
    });

  } catch (error) {
    console.error('[AI Filter] Error:', error);
    // On error, return all tracks (better than failing)
    return res.status(200).json({
      validTracks: req.body.tracks || [],
      originalCount: req.body.tracks?.length || 0,
      filteredCount: req.body.tracks?.length || 0
    });
  }
}
