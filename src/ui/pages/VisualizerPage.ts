import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { AudioBridge } from '../../core/AudioBridge';
import { BackButton } from '../components/BackButton';
import { SimpleSongList } from '../components/SimpleSongList';
import { MP3LibraryService } from '../../services/MP3LibraryService';

export class VisualizerPage {
  private element: HTMLElement;
  private backButton: BackButton;
  private musicLibrary: SimpleSongList;
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

    // Initialize MP3 library service
    const mp3LibraryService = new MP3LibraryService();

    // Create simple song list with file upload capability
    this.musicLibrary = new SimpleSongList(
      store,
      actions,
      mp3LibraryService,
      audioBridge
    );
  }

  async render(): Promise<HTMLElement> {
    this.element.innerHTML = '';

    // Add back button
    this.element.appendChild(this.backButton.render());

    // Add music library sidebar (includes file upload)
    const librarySidebar = await this.musicLibrary.render();
    this.element.appendChild(librarySidebar);

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
    this.musicLibrary.destroy();
  }
}
