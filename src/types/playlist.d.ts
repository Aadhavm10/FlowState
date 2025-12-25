/**
 * Individual track in a playlist
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;      // Duration in seconds
  thumbnailUrl: string;
  youtubeId: string;
}

/**
 * Playlist containing multiple tracks
 */
export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;     // Unix timestamp
  stats: PlaylistStats;
}

/**
 * Calculated playlist statistics
 */
export interface PlaylistStats {
  totalDuration: number;    // Total duration in seconds
  averageEnergy: number;    // 0-1
  averageTempo: number;     // Average BPM
  trackCount: number;
}

/**
 * YouTube search result
 */
export interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;         // ISO 8601 duration (e.g., "PT3M45S")
}

/**
 * AI song suggestion
 */
export interface SongSuggestion {
  title: string;
  artist: string;
}
