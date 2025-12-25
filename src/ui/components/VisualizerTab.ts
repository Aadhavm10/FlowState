import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';

/**
 * Visualizer tab - file upload and visualizer settings
 */
export class VisualizerTab {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions
  ) {
    this.element = document.createElement('div');
    this.element.className = 'visualizer-tab tab-content';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>Visualizer</h2>

      <div class="section">
        <h3>Audio Source</h3>
        <div class="file-upload-area">
          <input type="file" id="viz-file-input" accept="audio/*" />
          <label for="viz-file-input" class="file-upload-label">
            Choose Audio File
          </label>
          <button id="viz-load-sample" class="btn-secondary">
            Load Sample Song
          </button>
        </div>
      </div>

      <div class="section">
        <h3>Visualizer Settings</h3>

        <div class="setting-row">
          <label for="amplitude-slider">Amplitude</label>
          <input
            type="range"
            id="amplitude-slider"
            min="0.5"
            max="5"
            step="0.1"
            value="2.0"
          />
          <span id="amplitude-value">2.0</span>
        </div>

        <div class="setting-row">
          <label>
            <input type="checkbox" id="auto-rotate" />
            Auto Rotate Camera
          </label>
        </div>
      </div>

      <div class="section">
        <h3>About</h3>
        <p class="help-text">
          Upload an audio file or use the YouTube search to visualize music in 3D.
          The visualizer reacts to audio frequencies in real-time.
        </p>
      </div>
    `;

    // Event listeners
    const amplitudeSlider = this.element.querySelector('#amplitude-slider') as HTMLInputElement;
    const amplitudeValue = this.element.querySelector('#amplitude-value') as HTMLElement;
    const autoRotateCheckbox = this.element.querySelector('#auto-rotate') as HTMLInputElement;

    amplitudeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      amplitudeValue.textContent = value.toFixed(1);
      this.actions.setVisualizerAmplitude(value);
    });

    autoRotateCheckbox.addEventListener('change', () => {
      this.actions.toggleAutoRotate();
    });

    // Subscribe to state
    this.unsubscribe = this.store.selectSubscribe(
      state => state.ui.visualizerSettings,
      settings => {
        amplitudeSlider.value = settings.amplitude.toString();
        amplitudeValue.textContent = settings.amplitude.toFixed(1);
        autoRotateCheckbox.checked = settings.autoRotate;
      }
    );

    return this.element;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
