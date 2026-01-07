import { StateManager } from './StateManager';
import { AppState } from './AppState';
import { Track, Playlist, SearchResult } from '../types/playlist';
import { AudioMetrics } from '../types/audio';

/**
 * State Actions - All state mutations go through here
 * This ensures consistency and makes debugging easier
 */
export class StateActions {
  constructor(private store: StateManager<AppState>) {}

  // ==================== Playback Actions ====================

  setCurrentTrack(track: Track | null): void {
    this.store.updatePath('playback', { currentTrack: track });
  }

  setPlaying(isPlaying: boolean): void {
    this.store.updatePath('playback', { isPlaying });
  }

  setPosition(position: number): void {
    this.store.updatePath('playback', { position });
  }

  setDuration(duration: number): void {
    this.store.updatePath('playback', { duration });
  }

  setVolume(volume: number): void {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.store.updatePath('playback', { volume: clampedVolume });
  }

  setRepeatMode(repeat: 'none' | 'one' | 'all'): void {
    this.store.updatePath('playback', { repeat });
  }

  toggleShuffle(): void {
    const currentShuffle = this.store.getState().playback.shuffle;
    this.store.updatePath('playback', { shuffle: !currentShuffle });
  }

  // ==================== Queue Actions ====================

  setQueue(tracks: Track[]): void {
    this.store.updatePath('queue', { tracks, currentIndex: 0 });
  }

  addToQueue(track: Track): void {
    const currentQueue = this.store.getState().queue.tracks;
    this.store.updatePath('queue', {
      tracks: [...currentQueue, track]
    });
  }

  removeFromQueue(index: number): void {
    const currentQueue = this.store.getState().queue.tracks;
    this.store.updatePath('queue', {
      tracks: currentQueue.filter((_, i) => i !== index)
    });
  }

  playNext(): void {
    const state = this.store.getState();
    const { tracks, currentIndex } = state.queue;
    const { repeat } = state.playback;

    // If repeat one, replay current track
    if (repeat === 'one') {
      this.setPosition(0);
      return;
    }

    // Calculate next index
    let nextIndex = currentIndex + 1;

    // If at end and repeat all, go to start
    if (nextIndex >= tracks.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        // End of queue, stop playing
        this.setPlaying(false);
        return;
      }
    }

    // Update index and play next track
    this.store.updatePath('queue', { currentIndex: nextIndex });
    if (tracks[nextIndex]) {
      this.setCurrentTrack(tracks[nextIndex]);
      this.setPlaying(true);
    }
  }

  playPrevious(): void {
    const state = this.store.getState();
    const { tracks, currentIndex } = state.queue;

    // If more than 3 seconds in, restart current track
    if (state.playback.position > 3) {
      this.setPosition(0);
      return;
    }

    // Go to previous track
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      this.setPosition(0); // Just restart if at beginning
      return;
    }

    this.store.updatePath('queue', { currentIndex: prevIndex });
    if (tracks[prevIndex]) {
      this.setCurrentTrack(tracks[prevIndex]);
    }
  }

  // ==================== Playlist Actions ====================

  savePlaylist(playlist: Playlist): void {
    const currentPlaylists = this.store.getState().playlists.all;
    const existingIndex = currentPlaylists.findIndex(p => p.id === playlist.id);

    const updatedPlaylists = existingIndex >= 0
      ? currentPlaylists.map((p, i) => i === existingIndex ? playlist : p)
      : [...currentPlaylists, playlist];

    this.store.updatePath('playlists', { all: updatedPlaylists });
  }

  deletePlaylist(id: string): void {
    const currentPlaylists = this.store.getState().playlists.all;
    this.store.updatePath('playlists', {
      all: currentPlaylists.filter(p => p.id !== id),
      active: this.store.getState().playlists.active === id ? null : this.store.getState().playlists.active
    });
  }

  setActivePlaylist(id: string | null): void {
    this.store.updatePath('playlists', { active: id });
  }

  loadPlaylists(playlists: Playlist[]): void {
    this.store.updatePath('playlists', { all: playlists });
  }

  // ==================== Search Actions ====================

  setSearchQuery(query: string): void {
    this.store.updatePath('search', { query });
  }

  setSearchResults(results: SearchResult[]): void {
    this.store.updatePath('search', { results, isLoading: false, error: null });
  }

  setSearchLoading(isLoading: boolean): void {
    this.store.updatePath('search', { isLoading });
  }

  setSearchError(error: string | null): void {
    this.store.updatePath('search', { error, isLoading: false });
  }

  clearSearch(): void {
    this.store.updatePath('search', {
      query: '',
      results: [],
      isLoading: false,
      error: null
    });
  }

  // ==================== UI Actions ====================

  setActiveTab(tab: AppState['ui']['activeTab']): void {
    this.store.updatePath('ui', { activeTab: tab });
  }

  togglePanel(): void {
    const current = this.store.getState().ui.isPanelCollapsed;
    this.store.updatePath('ui', { isPanelCollapsed: !current });
  }

  setVisualizerAmplitude(amplitude: number): void {
    const currentSettings = this.store.getState().ui.visualizerSettings;
    this.store.updatePath('ui', {
      visualizerSettings: { ...currentSettings, amplitude }
    });
  }

  setVisualizerColorScheme(colorScheme: string): void {
    const currentSettings = this.store.getState().ui.visualizerSettings;
    this.store.updatePath('ui', {
      visualizerSettings: { ...currentSettings, colorScheme }
    });
  }

  toggleAutoRotate(): void {
    const currentSettings = this.store.getState().ui.visualizerSettings;
    this.store.updatePath('ui', {
      visualizerSettings: { ...currentSettings, autoRotate: !currentSettings.autoRotate }
    });
  }

  // ==================== Audio Metrics Actions ====================

  setAudioMetrics(metrics: AudioMetrics | null): void {
    this.store.setState({ ...this.store.getState(), audioMetrics: metrics });
  }
}
