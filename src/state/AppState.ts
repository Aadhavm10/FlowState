import { Track, Playlist, SearchResult } from '../types/playlist';
import { AudioMetrics } from '../types/audio';

/**
 * Complete application state shape
 */
export interface AppState {
  // Playback state
  playback: {
    currentTrack: Track | null;
    isPlaying: boolean;
    position: number;           // Current position in seconds
    duration: number;           // Total duration in seconds
    volume: number;             // 0-1
    audioSource: 'file' | 'youtube';
    repeat: 'none' | 'one' | 'all';
    shuffle: boolean;
  };

  // Queue state
  queue: {
    tracks: Track[];
    currentIndex: number;
    history: Track[];
  };

  // Playlists state
  playlists: {
    all: Playlist[];
    active: string | null;      // ID of active playlist
  };

  // Search state
  search: {
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    error: string | null;
  };

  // UI state
  ui: {
    activeTab: 'visualizer' | 'playlist' | 'search' | 'settings';
    isPanelCollapsed: boolean;
    visualizerSettings: {
      amplitude: number;
      colorScheme: string;
      autoRotate: boolean;
    };
  };

  // Audio analysis
  audioMetrics: AudioMetrics | null;
}

/**
 * Initial application state
 */
export const initialAppState: AppState = {
  playback: {
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 1.0,
    audioSource: 'file',
    repeat: 'none',
    shuffle: false
  },
  queue: {
    tracks: [],
    currentIndex: 0,
    history: []
  },
  playlists: {
    all: [],
    active: null
  },
  search: {
    query: '',
    results: [],
    isLoading: false,
    error: null
  },
  ui: {
    activeTab: 'search',
    isPanelCollapsed: false,
    visualizerSettings: {
      amplitude: 2.0,
      colorScheme: 'default',
      autoRotate: false
    }
  },
  audioMetrics: null
};
