import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
}

/**
 * Direct YouTube API search with audio preference
 */
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
    console.log('[YouTube Search] Handler invoked');
    const { query, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load multiple API keys for quota rotation
    const apiKeys = [
      process.env.YOUTUBE_API_KEY,
      process.env.YOUTUBE_API_KEY_2
    ].filter(Boolean); // Remove undefined keys

    if (apiKeys.length === 0) {
      throw new Error('No YouTube API keys configured in Vercel environment');
    }

    // Randomly select an API key to distribute load evenly
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    console.log(`[YouTube Search] Using API key ${apiKeys.indexOf(apiKey) + 1} of ${apiKeys.length}`);

    // Prefer audio versions by appending "audio" to query
    const audioQuery = query.toLowerCase().includes('audio') || query.toLowerCase().includes('official')
      ? query
      : `${query} audio`;

    console.log(`[YouTube Search] Searching for: "${audioQuery}"`);

    // Fetch 2x results to filter for audio preference
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', audioQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', (maxResults * 2).toString());
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music category

    const searchResponse = await fetch(searchUrl.toString());

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[YouTube Search] API error:', errorText);
      throw new Error(`YouTube API error: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      console.log('[YouTube Search] No results found');
      return res.status(200).json({
        results: [],
        source: 'youtube',
        count: 0
      });
    }

    // Get video IDs
    const videoIds = searchData.items.map((item: any) => item.id.videoId);

    // Fetch video details for durations
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,snippet');
    detailsUrl.searchParams.set('id', videoIds.join(','));
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    // Map to results
    const allResults: VideoResult[] = detailsData.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      duration: item.contentDetails.duration
    }));

    // Sort results: prioritize "Audio" over "Video" in title
    const sortedResults = allResults.sort((a: VideoResult, b: VideoResult) => {
      const aHasAudio = /\b(audio|topic)\b/i.test(a.title);
      const bHasAudio = /\b(audio|topic)\b/i.test(b.title);
      const aHasVideo = /\b(video|music video|official video|mv)\b/i.test(a.title);
      const bHasVideo = /\b(video|music video|official video|mv)\b/i.test(b.title);

      // Prioritize: Audio > Neither > Video
      if (aHasAudio && !bHasAudio) return -1;
      if (!aHasAudio && bHasAudio) return 1;
      if (!aHasVideo && bHasVideo) return -1;
      if (aHasVideo && !bHasVideo) return 1;
      return 0;
    });

    const results = sortedResults.slice(0, maxResults);
    console.log(`[YouTube Search] Found ${results.length} results`);

    return res.status(200).json({
      results,
      source: 'youtube',
      count: results.length
    });

  } catch (error) {
    console.error('[YouTube Search] Error:', error);
    console.error('[YouTube Search] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      error: 'YouTube search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results: [],
      source: 'none',
      count: 0
    });
  }
}
