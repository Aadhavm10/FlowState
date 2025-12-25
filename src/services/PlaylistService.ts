import { Playlist, Track, PlaylistStats } from '../types/playlist';
import { LocalStorageHelper } from '../utils/localStorage';
import { logger } from '../utils/logger';

export class PlaylistService {
  private storage: LocalStorageHelper;
  private storageKey = 'youtube-visualizer-playlists';

  constructor() {
    this.storage = new LocalStorageHelper(this.storageKey);
  }

  /**
   * Load all playlists from localStorage
   */
  loadAllPlaylists(): Playlist[] {
    const playlists = this.storage.get<Playlist[]>([]);
    logger.debug('Loaded', playlists.length, 'playlists from storage');
    return playlists;
  }

  /**
   * Save playlist to localStorage
   */
  savePlaylist(playlist: Playlist): void {
    const playlists = this.loadAllPlaylists();
    const existingIndex = playlists.findIndex(p => p.id === playlist.id);

    if (existingIndex >= 0) {
      playlists[existingIndex] = playlist;
      logger.debug('Updated playlist:', playlist.name);
    } else {
      playlists.push(playlist);
      logger.debug('Saved new playlist:', playlist.name);
    }

    this.storage.set(playlists);
  }

  /**
   * Delete playlist from localStorage
   */
  deletePlaylist(id: string): void {
    const playlists = this.loadAllPlaylists();
    const filtered = playlists.filter(p => p.id !== id);

    if (filtered.length < playlists.length) {
      this.storage.set(filtered);
      logger.debug('Deleted playlist:', id);
    }
  }

  /**
   * Get single playlist by ID
   */
  getPlaylist(id: string): Playlist | null {
    const playlists = this.loadAllPlaylists();
    return playlists.find(p => p.id === id) || null;
  }

  /**
   * Create a new playlist
   */
  createPlaylist(name: string, tracks: Track[]): Playlist {
    const playlist: Playlist = {
      id: this.generateId(),
      name,
      tracks,
      createdAt: Date.now(),
      stats: this.calculateStats(tracks)
    };

    return playlist;
  }

  /**
   * Calculate playlist statistics
   */
  calculateStats(tracks: Track[]): PlaylistStats {
    const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);

    // Placeholder values for energy and tempo
    // These would be calculated from audio analysis in a full implementation
    const averageEnergy = 0.5;
    const averageTempo = 120;

    return {
      totalDuration,
      averageEnergy,
      averageTempo,
      trackCount: tracks.length
    };
  }

  /**
   * Generate playlist name from prompt
   */
  generatePlaylistName(prompt: string): string {
    // Clean up prompt
    const cleaned = prompt
      .toLowerCase()
      .replace(/playlist|songs?|music|give me|play|i want/gi, '')
      .trim();

    if (!cleaned) {
      return `Playlist ${new Date().toLocaleDateString()}`;
    }

    // Extract keywords (> 3 chars, not common words)
    const commonWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from'];
    const keywords = cleaned
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 3);

    if (keywords.length === 0) {
      return `Playlist ${new Date().toLocaleDateString()}`;
    }

    // Capitalize first letter of each word
    const title = keywords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return title;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format duration (seconds → HH:MM:SS or MM:SS)
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
