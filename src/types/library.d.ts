/**
 * Music Library Type Definitions
 * For FlowState genre-based music catalog
 */

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  duration: number; // seconds
  bpm?: number;
  key?: string;
  mood?: string[];
  year?: number;
  thumbnailUrl: string;
}

export interface Genre {
  id: string;
  name: string;
  description: string;
  color: string; // hex color for UI theming
  songs: Song[];
}

export interface Catalog {
  version: string;
  lastUpdated: string;
  genres: Genre[];
}

export interface DownloadJob {
  jobId: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  pollUrl: string;
  streamUrl: string;
  error?: string;
}

export interface DownloadStatusResponse {
  status: 'pending' | 'downloading' | 'completed' | 'error';
  filePath?: string;
  error?: string;
}
