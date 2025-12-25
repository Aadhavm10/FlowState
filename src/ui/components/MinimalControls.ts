import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';

export class MinimalControls {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'minimal-controls';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <button class="control-btn play-pause" title="Play/Pause">▶</button>
      <div class="volume-control">
        <span class="volume-label">VOL</span>
        <input type="range" class="volume-slider" min="0" max="100" value="100" />
      </div>
    `;

    const playPauseBtn = this.element.querySelector('.play-pause') as HTMLButtonElement;
    const volumeSlider = this.element.querySelector('.volume-slider') as HTMLInputElement;

    playPauseBtn.addEventListener('click', () => {
      const isPlaying = this.store.getState().playback.isPlaying;
      this.actions.setPlaying(!isPlaying);
    });

    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value) / 100;
      this.actions.setVolume(volume);
    });

    this.unsubscribe = this.store.selectSubscribe(
      state => ({ isPlaying: state.playback.isPlaying, volume: state.playback.volume }),
      ({ isPlaying, volume }) => {
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
        volumeSlider.value = (volume * 100).toString();
      }
    );

    return this.element;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
