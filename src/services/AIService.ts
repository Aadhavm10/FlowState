import { Track, SongSuggestion } from '../types/playlist';
import { logger } from '../utils/logger';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export class AIService {
  private backendUrl: string;

  constructor() {
    // Use AWS backend for AI endpoints
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Get AI-powered song suggestions based on user prompt
   */
  async suggestSongs(prompt: string): Promise<SongSuggestion[]> {
    try {
      const count = this.determinePlaylistSize(prompt);
      logger.debug('Requesting AI suggestions:', { prompt, count });

      const response = await fetchWithTimeout(`${this.backendUrl}/api/ai/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          count
        })
      }, 15000); // 15 second timeout for AI

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI suggestion failed: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      logger.debug('AI suggested:', data.count, 'songs');

      return data.suggestions;
    } catch (error) {
      logger.error('AI suggestion error:', error);
      throw error;
    }
  }

  /**
   * Filter tracks to remove playlists, compilations, etc.
   */
  async filterRealSongs(tracks: Track[]): Promise<Track[]> {
    try {
      logger.debug('Filtering', tracks.length, 'tracks');

      const response = await fetchWithTimeout(`${this.backendUrl}/api/ai/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: tracks.map(t => ({ title: t.title, artist: t.artist }))
        })
      }, 15000); // 15 second timeout for AI

      if (!response.ok) {
        throw new Error('AI filtering failed');
      }

      const data = await response.json();
      logger.debug(`Filtered: ${data.originalCount} → ${data.filteredCount} tracks`);

      // Map valid tracks back to original Track objects
      const validTitles = new Set(data.validTracks.map((t: any) => t.title));
      return tracks.filter(track => validTitles.has(track.title));

    } catch (error) {
      logger.error('AI filtering error:', error);
      // On error, return all tracks (better than nothing)
      return tracks;
    }
  }

  /**
   * Determine playlist size based on query specificity
   */
  determinePlaylistSize(prompt: string): number {
    // LIMITING TEMPORARILY DISABLED - returning fixed size
    return 30; // Fixed size for now

    /* COMMENTED OUT - Original limiting logic
    const lowerPrompt = prompt.toLowerCase();

    // Very specific (one song or artist)
    if (
      lowerPrompt.includes('song') ||
      lowerPrompt.includes('by ') ||
      lowerPrompt.match(/^[\w\s]+ - [\w\s]+$/) // "Artist - Song" format
    ) {
      return 5;
    }

    // Specific genre or mood
    if (
      lowerPrompt.includes('playlist') ||
      lowerPrompt.includes('genre') ||
      lowerPrompt.includes('mood')
    ) {
      return 15;
    }

    // Broad or general
    if (
      lowerPrompt.includes('mix') ||
      lowerPrompt.includes('variety') ||
      lowerPrompt.length < 10
    ) {
      return 25;
    }

    // Default medium size
    return 12;
    */
  }
}
