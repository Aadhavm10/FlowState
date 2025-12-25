import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';

/**
 * Now Playing widget - displays current track info
 */
export class NowPlaying {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'now-playing';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="now-playing-content">
        <div class="track-info">
          <div class="track-title">No track playing</div>
          <div class="track-artist"></div>
        </div>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="time-display">
            <span class="current-time">0:00</span>
            <span class="total-time">0:00</span>
          </div>
        </div>
      </div>
    `;

    // Subscribe to playback state
    this.unsubscribe = this.store.selectSubscribe(
      state => ({ track: state.playback.currentTrack, position: state.playback.position, duration: state.playback.duration }),
      ({ track, position, duration }) => {
        this.updateDisplay(track, position, duration);
      }
    );

    // Make progress bar seekable
    const progressBar = this.element.querySelector('.progress-bar') as HTMLElement;
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const duration = this.store.getState().playback.duration;
      const newPosition = percentage * duration;
      this.actions.setPosition(newPosition);
    });

    return this.element;
  }

  private updateDisplay(track: any, position: number, duration: number): void {
    const titleEl = this.element.querySelector('.track-title') as HTMLElement;
    const artistEl = this.element.querySelector('.track-artist') as HTMLElement;
    const progressFill = this.element.querySelector('.progress-fill') as HTMLElement;
    const currentTimeEl = this.element.querySelector('.current-time') as HTMLElement;
    const totalTimeEl = this.element.querySelector('.total-time') as HTMLElement;

    if (track) {
      titleEl.textContent = track.title;
      artistEl.textContent = track.artist;
      this.element.classList.add('has-track');
    } else {
      titleEl.textContent = 'No track playing';
      artistEl.textContent = '';
      this.element.classList.remove('has-track');
    }

    // Update progress
    const percentage = duration > 0 ? (position / duration) * 100 : 0;
    progressFill.style.width = `${percentage}%`;

    // Update times
    currentTimeEl.textContent = this.formatTime(position);
    totalTimeEl.textContent = this.formatTime(duration);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
