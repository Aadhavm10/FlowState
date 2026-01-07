import { AIService } from './AIService';
import { YouTubeSearchService } from './YouTubeSearchService';
import { PlaylistService } from './PlaylistService';
import { Track, Playlist } from '../types/playlist';
import { logger } from '../utils/logger';

/**
 * Orchestrates playlist generation from AI suggestions
 */
export class PlaylistGenerator {
  constructor(
    private aiService: AIService,
    private searchService: YouTubeSearchService,
    private playlistService: PlaylistService
  ) {}

  /**
   * Generate complete playlist from user prompt
   *
   * Flow:
   * 1. AI suggests songs
   * 2. Search YouTube for each song (parallel)
   * 3. AI filters out compilations/playlists
   * 4. Create and save playlist
   */
  async generateFromPrompt(prompt: string): Promise<Playlist> {
    try {
      logger.group(`Generating playlist: "${prompt}"`);

      // Step 1: Get AI suggestions
      logger.info('Step 1: Getting AI suggestions...');
      const suggestions = await this.aiService.suggestSongs(prompt);
      logger.info(`Got ${suggestions.length} suggestions`);

      if (suggestions.length === 0) {
        throw new Error('No song suggestions received from AI');
      }

      // Step 2: Search YouTube for each suggestion (in parallel)
      logger.info('Step 2: Searching YouTube for each song...');
      const searchPromises = suggestions.map(async (suggestion) => {
        const query = `${suggestion.artist} ${suggestion.title} audio`;
        try {
          const results = await this.searchService.search(query, 1);

          if (results.length === 0) {
            logger.warn(`No results for: ${suggestion.artist} - ${suggestion.title}`);
            return null;
          }

          const result = results[0];
          const track: Track = {
            id: result.videoId,
            title: result.title,
            artist: result.channelTitle,
            duration: this.searchService.parseDuration(result.duration),
            thumbnailUrl: result.thumbnailUrl,
            youtubeId: result.videoId
          };

          return track;
        } catch (error) {
          logger.warn(`Search failed for: ${suggestion.artist} - ${suggestion.title}`, error);
          return null;
        }
      });

      const trackResults = await Promise.all(searchPromises);
      const tracks = trackResults.filter((t): t is Track => t !== null);

      logger.info(`Found ${tracks.length} tracks on YouTube`);

      if (tracks.length === 0) {
        throw new Error('No tracks found on YouTube');
      }

      // Step 3: AI filtering to remove compilations/playlists
      logger.info('Step 3: Filtering with AI...');
      const filteredTracks = await this.aiService.filterRealSongs(tracks);
      logger.info(`After filtering: ${filteredTracks.length} tracks`);

      // Step 4: Remove duplicates
      const uniqueTracks = this.removeDuplicates(filteredTracks);
      logger.info(`After deduplication: ${uniqueTracks.length} tracks`);

      // Step 5: Create and save playlist
      logger.info('Step 4: Creating playlist...');
      const name = this.playlistService.generatePlaylistName(prompt);
      const playlist = this.playlistService.createPlaylist(name, uniqueTracks);
      this.playlistService.savePlaylist(playlist);

      logger.info(`Playlist created: "${playlist.name}" with ${playlist.tracks.length} tracks`);
      logger.groupEnd();

      return playlist;

    } catch (error) {
      logger.error('Playlist generation failed:', error);
      logger.groupEnd();
      throw error;
    }
  }

  /**
   * Remove duplicate tracks (same videoId or very similar title)
   */
  private removeDuplicates(tracks: Track[]): Track[] {
    const seen = new Set<string>();
    const unique: Track[] = [];

    for (const track of tracks) {
      // Check by videoId
      if (seen.has(track.youtubeId)) {
        continue;
      }

      // Check by normalized title
      const normalizedTitle = this.normalizeTitle(track.title);
      if (seen.has(normalizedTitle)) {
        continue;
      }

      seen.add(track.youtubeId);
      seen.add(normalizedTitle);
      unique.push(track);
    }

    return unique;
  }

  /**
   * Normalize title for deduplication
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
