import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { Playlist, Track } from '../../types/playlist';
import { PlaylistService } from '../../services/PlaylistService';

export class PlaylistsGrid {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService
  ) {
    this.element = document.createElement('section');
    this.element.className = 'playlists-section';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>Your Playlists</h2>
      <div id="playlists-grid-container" class="playlists-grid"></div>
      <div id="empty-state-grid" class="empty-state">
        <p>No playlists yet</p>
        <p class="help-text">Generate a playlist above to get started</p>
      </div>
    `;

    this.unsubscribe = this.store.selectSubscribe(
      state => state.playlists.all,
      playlists => {
        this.updatePlaylistDisplay(playlists);
      }
    );

    return this.element;
  }

  private updatePlaylistDisplay(playlists: Playlist[]): void {
    const container = this.element.querySelector('#playlists-grid-container') as HTMLElement;
    const emptyState = this.element.querySelector('#empty-state-grid') as HTMLElement;

    if (playlists.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = playlists
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(playlist => this.renderPlaylistCard(playlist))
      .join('');

    container.querySelectorAll('.playlist-card').forEach(card => {
      const playlistId = (card as HTMLElement).dataset.playlistId!;
      const playlist = playlists.find(p => p.id === playlistId)!;

      const playBtn = card.querySelector('.play-all-btn');
      playBtn?.addEventListener('click', () => {
        this.actions.setQueue(playlist.tracks);
        this.actions.setCurrentTrack(playlist.tracks[0]);
        this.actions.setPlaying(true);
      });

      const deleteBtn = card.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', () => {
        if (confirm(`Delete "${playlist.name}"?`)) {
          this.actions.deletePlaylist(playlist.id);
          this.playlistService.deletePlaylist(playlist.id);
        }
      });
    });
  }

  private renderPlaylistCard(playlist: Playlist): string {
    const duration = this.playlistService.formatDuration(playlist.stats.totalDuration);
    const date = new Date(playlist.createdAt).toLocaleDateString();

    return `
      <div class="playlist-card" data-playlist-id="${playlist.id}">
        <div class="playlist-card-header">
          <h3 class="playlist-name">${this.escapeHtml(playlist.name)}</h3>
          <div class="playlist-actions">
            <button class="btn-icon play-all-btn" title="Play All">▶</button>
            <button class="btn-icon delete-btn" title="Delete">×</button>
          </div>
        </div>
        <p class="playlist-meta">
          ${playlist.tracks.length} songs • ${duration}
        </p>
        <p class="playlist-date">${date}</p>
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
