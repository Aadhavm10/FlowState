import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';

export class NowPlayingFooter {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions
  ) {
    this.element = document.createElement('footer');
    this.element.className = 'now-playing-footer';
    this.element.style.display = 'none';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="footer-track-info">
        <img class="footer-thumbnail" src="" alt="">
        <div class="footer-text">
          <div class="footer-title">No track playing</div>
          <div class="footer-artist"></div>
        </div>
      </div>

      <div class="footer-controls">
        <button class="footer-btn prev" title="Previous">◀◀</button>
        <button class="footer-btn play-pause" title="Play/Pause">▶</button>
        <button class="footer-btn next" title="Next">▶▶</button>
      </div>

      <div class="footer-progress">
        <span class="footer-current-time">0:00</span>
        <div class="footer-progress-bar">
          <div class="footer-progress-fill"></div>
        </div>
        <span class="footer-duration">0:00</span>
      </div>

      <div class="footer-volume">
        <span class="footer-volume-label">VOL</span>
        <input type="range" class="footer-volume-slider" min="0" max="100" value="100" />
      </div>
    `;

    const playPauseBtn = this.element.querySelector('.play-pause') as HTMLButtonElement;
    const previousBtn = this.element.querySelector('.prev') as HTMLButtonElement;
    const nextBtn = this.element.querySelector('.next') as HTMLButtonElement;
    const volumeSlider = this.element.querySelector('.footer-volume-slider') as HTMLInputElement;
    const progressBar = this.element.querySelector('.footer-progress-bar') as HTMLElement;

    playPauseBtn.addEventListener('click', () => {
      const isPlaying = this.store.getState().playback.isPlaying;
      this.actions.setPlaying(!isPlaying);
    });

    previousBtn.addEventListener('click', () => {
      this.actions.playPrevious();
    });

    nextBtn.addEventListener('click', () => {
      this.actions.playNext();
    });

    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value) / 100;
      this.actions.setVolume(volume);
    });

    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const duration = this.store.getState().playback.duration;
      const newPosition = percentage * duration;
      this.actions.setPosition(newPosition);
    });

    this.unsubscribe = this.store.selectSubscribe(
      state => ({
        track: state.playback.currentTrack,
        isPlaying: state.playback.isPlaying,
        position: state.playback.position,
        duration: state.playback.duration,
        volume: state.playback.volume
      }),
      ({ track, isPlaying, position, duration, volume }) => {
        this.updateDisplay(track, isPlaying, position, duration, volume);
      }
    );

    return this.element;
  }

  private updateDisplay(track: any, isPlaying: boolean, position: number, duration: number, volume: number): void {
    const thumbnail = this.element.querySelector('.footer-thumbnail') as HTMLImageElement;
    const title = this.element.querySelector('.footer-title') as HTMLElement;
    const artist = this.element.querySelector('.footer-artist') as HTMLElement;
    const playPauseBtn = this.element.querySelector('.play-pause') as HTMLButtonElement;
    const progressFill = this.element.querySelector('.footer-progress-fill') as HTMLElement;
    const currentTimeEl = this.element.querySelector('.footer-current-time') as HTMLElement;
    const durationEl = this.element.querySelector('.footer-duration') as HTMLElement;
    const volumeSlider = this.element.querySelector('.footer-volume-slider') as HTMLInputElement;

    if (track) {
      this.element.style.display = 'flex';
      thumbnail.src = track.thumbnailUrl || '';
      thumbnail.alt = track.title;
      title.textContent = track.title;
      artist.textContent = track.artist;
    } else {
      this.element.style.display = 'none';
      return;
    }

    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';

    const percentage = duration > 0 ? (position / duration) * 100 : 0;
    progressFill.style.width = `${percentage}%`;

    currentTimeEl.textContent = this.formatTime(position);
    durationEl.textContent = this.formatTime(duration);

    volumeSlider.value = (volume * 100).toString();
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
