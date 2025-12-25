import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SearchRequest {
  query: string;
  maxResults: number;
}

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
}

/**
 * YouTube Data API v3 search (Primary method)
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
    throw new Error(`YouTube API failed: ${response.statusText}`);
  }

  const data = await response.json();

  return data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: 'PT0S' // Would need separate API call for duration
  }));
}

/**
 * Piped API search (Fallback 1)
 */
async function searchPiped(query: string, maxResults: number): Promise<VideoResult[]> {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.privacy.com.de',
    'https://api-piped.mha.fi'
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        return data.items.slice(0, maxResults).map((item: any) => ({
          videoId: item.url.replace('/watch?v=', ''),
          title: item.title,
          channelTitle: item.uploaderName || item.uploaderUrl?.replace('/@', '') || 'Unknown',
          thumbnailUrl: item.thumbnail,
          duration: item.duration ? `PT${item.duration}S` : 'PT0S'
        }));
      }
    } catch (err) {
      console.log(`Piped instance ${instance} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All Piped instances failed');
}

/**
 * Invidious API search (Fallback 2)
 */
async function searchInvidious(query: string, maxResults: number): Promise<VideoResult[]> {
  const instances = [
    'https://invidious.snopyta.org',
    'https://yewtu.be',
    'https://invidious.kavin.rocks'
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        return data.slice(0, maxResults).map((item: any) => ({
          videoId: item.videoId,
          title: item.title,
          channelTitle: item.author,
          thumbnailUrl: item.videoThumbnails?.[0]?.url || '',
          duration: item.lengthSeconds ? `PT${item.lengthSeconds}S` : 'PT0S'
        }));
      }
    } catch (err) {
      console.log(`Invidious instance ${instance} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All Invidious instances failed');
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
    const { query, maxResults = 10 } = req.body as SearchRequest;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let results: VideoResult[];
    let source: string;

    // Multi-tier fallback
    try {
      console.log('Trying YouTube API...');
      results = await searchYouTubeAPI(query, maxResults);
      source = 'youtube';
      console.log(`YouTube API success: ${results.length} results`);
    } catch (err) {
      console.log('YouTube API failed, trying Piped...');
      try {
        results = await searchPiped(query, maxResults);
        source = 'piped';
        console.log(`Piped success: ${results.length} results`);
      } catch (err) {
        console.log('Piped failed, trying Invidious...');
        results = await searchInvidious(query, maxResults);
        source = 'invidious';
        console.log(`Invidious success: ${results.length} results`);
      }
    }

    return res.status(200).json({
      results,
      source,
      count: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results: [],
      source: 'none',
      count: 0
    });
  }
}
