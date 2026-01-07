import { SearchResult } from '../types/playlist';
import { logger } from '../utils/logger';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { formatTime } from '../utils/formatTime';

export class YouTubeSearchService {
  private apiUrl: string;

  constructor() {
    // In production (Vercel), use Vercel API proxy
    // In dev, use local backend or AWS directly
    this.apiUrl = import.meta.env.DEV
      ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
      : '';  // Empty string means use relative URLs (Vercel API routes)
  }

  /**
   * Search YouTube for videos
   */
  async search(query: string, maxResults: number = 10): Promise<SearchResult[]> {
    try {
      logger.debug('Searching YouTube:', query);

      const response = await fetchWithTimeout(`${this.apiUrl}/api/youtube-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults })
      }, 10000); // 10 second timeout for search

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search failed: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      logger.debug(`Search results from ${data.source}:`, data.count, 'videos');

      return this.normalizeResults(data.results);
    } catch (error) {
      logger.error('YouTube search error:', error);
      throw error;
    }
  }

  /**
   * Normalize results from different sources
   */
  private normalizeResults(results: any[]): SearchResult[] {
    return results.map(result => ({
      videoId: result.videoId || result.id,
      title: this.cleanTitle(result.title),
      channelTitle: result.channelTitle || result.author || 'Unknown',
      thumbnailUrl: result.thumbnailUrl || result.thumbnail || '',
      duration: result.duration || 'PT0S'
    }));
  }

  /**
   * Clean up video title (remove common suffixes)
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\s*\(Official (?:Video|Audio|Music Video)\)/gi, '')
      .replace(/\s*\[Official (?:Video|Audio|Music Video)\]/gi, '')
      .trim();
  }

  /**
   * Parse ISO 8601 duration to seconds
   * Example: PT3M45S → 225 seconds
   */
  parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS
   */
  formatDuration(seconds: number): string {
    return formatTime(seconds);
  }
}
