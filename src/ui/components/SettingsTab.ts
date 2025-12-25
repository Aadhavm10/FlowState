import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';

/**
 * Settings tab - app configuration
 */
export class SettingsTab {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'settings-tab tab-content';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>Settings</h2>

      <div class="section">
        <h3>Playback</h3>

        <div class="setting-row">
          <label for="volume-setting">Volume</label>
          <input
            type="range"
            id="volume-setting"
            min="0"
            max="100"
            value="100"
          />
          <span id="volume-value">100%</span>
        </div>

        <div class="setting-row">
          <label for="repeat-mode">Repeat Mode</label>
          <select id="repeat-mode">
            <option value="none">Off</option>
            <option value="one">Repeat One</option>
            <option value="all">Repeat All</option>
          </select>
        </div>

        <div class="setting-row">
          <label>
            <input type="checkbox" id="shuffle-mode" />
            Shuffle
          </label>
        </div>
      </div>

      <div class="section">
        <h3>API Status</h3>
        <div class="api-status">
          <div class="status-item">
            <span class="status-label">YouTube API:</span>
            <span class="status-badge">Configured</span>
          </div>
          <div class="status-item">
            <span class="status-label">Groq AI:</span>
            <span class="status-badge">Configured</span>
          </div>
        </div>
        <p class="help-text">
          API keys are configured via environment variables on the server.
        </p>
      </div>

      <div class="section">
        <h3>Storage</h3>
        <button id="clear-playlists" class="btn-danger">
          Clear All Playlists
        </button>
        <p class="help-text">
          This will permanently delete all saved playlists from local storage.
        </p>
      </div>

      <div class="section">
        <h3>About</h3>
        <p>3D Audio Visualizer - YouTube Edition</p>
        <p class="help-text">
          Visualize music in 3D with AI-powered playlist generation.
          Built with Three.js, TypeScript, and Groq AI.
        </p>
      </div>
    `;

    // Event listeners
    const volumeSlider = this.element.querySelector('#volume-setting') as HTMLInputElement;
    const volumeValue = this.element.querySelector('#volume-value') as HTMLElement;
    const repeatMode = this.element.querySelector('#repeat-mode') as HTMLSelectElement;
    const shuffleCheckbox = this.element.querySelector('#shuffle-mode') as HTMLInputElement;
    const clearBtn = this.element.querySelector('#clear-playlists') as HTMLButtonElement;

    volumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      volumeValue.textContent = `${value}%`;
      this.actions.setVolume(value / 100);
    });

    repeatMode.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as 'none' | 'one' | 'all';
      this.actions.setRepeatMode(mode);
    });

    shuffleCheckbox.addEventListener('change', () => {
      this.actions.toggleShuffle();
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all playlists? This cannot be undone.')) {
        const playlists = this.store.getState().playlists.all;
        playlists.forEach(p => this.actions.deletePlaylist(p.id));
        localStorage.removeItem('youtube-visualizer-playlists');
        alert('All playlists cleared!');
      }
    });

    // Subscribe to state
    this.unsubscribe = this.store.selectSubscribe(
      state => state.playback,
      playback => {
        volumeSlider.value = (playback.volume * 100).toString();
        volumeValue.textContent = `${Math.round(playback.volume * 100)}%`;
        repeatMode.value = playback.repeat;
        shuffleCheckbox.checked = playback.shuffle;
      }
    );

    return this.element;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
