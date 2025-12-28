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
        console.log(`[AI Suggest] Rate limited. Retrying in ${delay}ms...`);
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
    console.log('[AI Suggest] Handler invoked');

    const { prompt, count = 20 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('[AI Suggest] Checking GROQ_API_KEY...');
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured in Vercel environment');
    }

    if (!apiKey.startsWith('gsk_')) {
      throw new Error('GROQ_API_KEY appears to be invalid (should start with gsk_)');
    }

    console.log('[AI Suggest] API key validated, creating Groq client');
    const groq = new Groq({ apiKey });

    console.log(`[AI Suggest] Requesting ${count} suggestions for: "${prompt}"`);
    const completion = await retryWithBackoff(() =>
      groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a music expert creating personalized playlists.
Given a user's request, suggest ${count} specific, real songs that match the mood, genre, or theme.
Return ONLY a JSON array of objects with "title" and "artist" fields.`
          },
          { role: 'user', content: prompt }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 2048
      })
    );

    const content = completion.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array in AI response');
    }

    const suggestions = JSON.parse(jsonMatch[0]).slice(0, count);
    console.log(`[AI Suggest] Successfully generated ${suggestions.length} suggestions`);

    return res.status(200).json({ suggestions, count: suggestions.length });

  } catch (error) {
    console.error('[AI Suggest] Error:', error);
    console.error('[AI Suggest] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      error: 'AI suggestion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
