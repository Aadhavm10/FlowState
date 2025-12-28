import { Router, Request, Response } from 'express';

const router = Router();

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
}

/**
 * YouTube Data API v3 search
 */
async function searchYouTubeAPI(query: string, maxResults: number): Promise<VideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', maxResults.toString());
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10'); // Music category
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: 'PT0S' // Would need separate API call for duration
  }));
}

/**
 * POST /api/youtube/search
 * Search YouTube for videos
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('[YouTube] Searching for:', query, 'maxResults:', maxResults);

    const results = await searchYouTubeAPI(query, maxResults);
    
    console.log('[YouTube] Found', results.length, 'results');

    return res.status(200).json({
      results,
      source: 'youtube',
      count: results.length
    });

  } catch (error) {
    console.error('[YouTube] Search error:', error);
    return res.status(500).json({
      error: 'YouTube search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results: [],
      source: 'none',
      count: 0
    });
  }
});

export default router;
