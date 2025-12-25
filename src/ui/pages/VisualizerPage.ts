import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { AudioBridge } from '../../core/AudioBridge';
import { BackButton } from '../components/BackButton';
import { MinimalControls } from '../components/MinimalControls';

export class VisualizerPage {
  private element: HTMLElement;
  private backButton: BackButton;
  private minimalControls: MinimalControls;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private audioBridge: AudioBridge,
    private onNavigateBack: () => void
  ) {
    this.element = document.createElement('div');
    this.element.className = 'visualizer-page';
    this.element.style.display = 'none';

    this.backButton = new BackButton(onNavigateBack);
    this.minimalControls = new MinimalControls(store, actions);
  }

  render(): HTMLElement {
    this.element.innerHTML = '';

    // Add back button
    this.element.appendChild(this.backButton.render());

    // Add file upload and sample controls
    const controlsPanel = document.createElement('div');
    controlsPanel.className = 'visualizer-file-controls';
    controlsPanel.innerHTML = `
      <div class="file-controls-inner">
        <input type="file" id="viz-file-input" accept="audio/*" style="display: none;" />
        <button class="btn-secondary" id="viz-choose-file">Choose Audio File</button>
        <button class="btn-secondary" id="viz-load-sample">Load Sample Song</button>
      </div>
    `;
    this.element.appendChild(controlsPanel);

    // Add minimal playback controls
    this.element.appendChild(this.minimalControls.render());

    // Setup event listeners for file controls
    const fileInput = controlsPanel.querySelector('#viz-file-input') as HTMLInputElement;
    const chooseFileBtn = controlsPanel.querySelector('#viz-choose-file') as HTMLButtonElement;
    const loadSampleBtn = controlsPanel.querySelector('#viz-load-sample') as HTMLButtonElement;

    chooseFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        console.log('File selected:', file.name);

        try {
          // Switch audio bridge to file source
          this.audioBridge.switchToFile(file);

          // Update state
          this.actions.setAudioSource('file');
          this.actions.setPlaying(true);

          console.log('File loaded successfully');
        } catch (error) {
          console.error('Failed to load file:', error);
        }
      }
    });

    loadSampleBtn.addEventListener('click', async () => {
      console.log('Loading sample song...');

      try {
        // Switch audio bridge to sample song URL
        this.audioBridge.switchToFileUrl('./song.mp3');

        // Update state
        this.actions.setAudioSource('file');
        this.actions.setPlaying(true);

        console.log('Sample song loaded successfully');
      } catch (error) {
        console.error('Failed to load sample song:', error);
      }
    });

    return this.element;
  }

  show(): void {
    this.element.style.display = 'block';
    console.log('VisualizerPage.show() called');
    console.log('Body classes:', document.body.className);
    console.log('Canvas element:', document.getElementById('webgl'));
    const canvas = document.getElementById('webgl');
    if (canvas) {
      console.log('Canvas z-index:', window.getComputedStyle(canvas).zIndex);
      console.log('Canvas opacity:', window.getComputedStyle(canvas).opacity);
      console.log('Canvas display:', window.getComputedStyle(canvas).display);
      console.log('Canvas position:', window.getComputedStyle(canvas).position);
    }
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.unsubscribe?.();
    this.minimalControls.destroy();
  }
}
