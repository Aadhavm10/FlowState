import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { Playlist, Track } from '../../types/playlist';
import { PlaylistService } from '../../services/PlaylistService';

/**
 * Playlist tab - view and manage playlists
 */
export class PlaylistTab {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService
  ) {
    this.element = document.createElement('div');
    this.element.className = 'playlist-tab tab-content';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>Playlists</h2>
      <div id="playlist-container"></div>
      <div id="empty-state" class="empty-state">
        <p>No playlists yet</p>
        <p class="help-text">Use the Search tab to generate AI playlists</p>
      </div>
    `;

    // Subscribe to playlists
    this.unsubscribe = this.store.selectSubscribe(
      state => state.playlists.all,
      playlists => {
        this.updatePlaylistDisplay(playlists);
      }
    );

    return this.element;
  }

  private updatePlaylistDisplay(playlists: Playlist[]): void {
    const container = this.element.querySelector('#playlist-container') as HTMLElement;
    const emptyState = this.element.querySelector('#empty-state') as HTMLElement;

    if (playlists.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = playlists
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(playlist => this.renderPlaylist(playlist))
      .join('');

    // Add event listeners
    container.querySelectorAll('.playlist-item').forEach(item => {
      const playlistId = (item as HTMLElement).dataset.playlistId!;
      const playlist = playlists.find(p => p.id === playlistId)!;

      // Play all button
      const playAllBtn = item.querySelector('.play-all-btn');
      playAllBtn?.addEventListener('click', () => {
        this.actions.setQueue(playlist.tracks);
        this.actions.setCurrentTrack(playlist.tracks[0]);
        this.actions.setPlaying(true);
      });

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', () => {
        if (confirm(`Delete "${playlist.name}"?`)) {
          this.actions.deletePlaylist(playlist.id);
          this.playlistService.deletePlaylist(playlist.id);
        }
      });

      // Track items
      item.querySelectorAll('.track-item').forEach((trackEl, index) => {
        trackEl.addEventListener('click', () => {
          this.actions.setQueue(playlist.tracks);
          this.actions.setCurrentTrack(playlist.tracks[index]);
          this.actions.setPlaying(true);
        });
      });
    });
  }

  private renderPlaylist(playlist: Playlist): string {
    const duration = this.playlistService.formatDuration(playlist.stats.totalDuration);
    const date = new Date(playlist.createdAt).toLocaleDateString();

    return `
      <div class="playlist-item" data-playlist-id="${playlist.id}">
        <div class="playlist-header">
          <div class="playlist-info">
            <h3 class="playlist-name">${playlist.name}</h3>
            <p class="playlist-meta">
              ${playlist.tracks.length} songs • ${duration} • ${date}
            </p>
          </div>
          <div class="playlist-actions">
            <button class="btn-icon play-all-btn" title="Play All">▶</button>
            <button class="btn-icon delete-btn" title="Delete">×</button>
          </div>
        </div>
        <div class="track-list">
          ${playlist.tracks.map((track, i) => this.renderTrack(track, i)).join('')}
        </div>
      </div>
    `;
  }

  private renderTrack(track: Track, index: number): string {
    const duration = this.playlistService.formatDuration(track.duration);
    return `
      <div class="track-item">
        <span class="track-number">${index + 1}</span>
        <img src="${track.thumbnailUrl}" alt="${track.title}" class="track-thumb" />
        <div class="track-info">
          <div class="track-title">${this.escapeHtml(track.title)}</div>
          <div class="track-artist">${this.escapeHtml(track.artist)}</div>
        </div>
        <span class="track-duration">${duration}</span>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
