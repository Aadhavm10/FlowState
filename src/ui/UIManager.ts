import { StateManager } from '../state/StateManager';
import { StateActions } from '../state/actions';
import { AppState } from '../state/AppState';
import { TabPanel } from './components/TabPanel';
import { NowPlaying } from './components/NowPlaying';
import { PlaybackControls } from './components/PlaybackControls';
import { PlaylistService } from '../services/PlaylistService';
import { PlaylistGenerator } from '../services/PlaylistGenerator';

/**
 * UIManager - main UI controller
 * Orchestrates all UI components and renders them to the DOM
 */
export class UIManager {
  private container: HTMLElement;
  private uiOverlay: HTMLElement | null = null;
  private tabPanel: TabPanel;
  private nowPlaying: NowPlaying;
  private playbackControls: PlaybackControls;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService,
    private playlistGenerator: PlaylistGenerator
  ) {
    this.container = document.getElementById('app')!;

    // Initialize components
    this.nowPlaying = new NowPlaying(store, actions);
    this.playbackControls = new PlaybackControls(store, actions);
    this.tabPanel = new TabPanel(store, actions, playlistService, playlistGenerator);
  }

  /**
   * Render UI overlay on top of visualizer
   */
  render(): void {
    // Create UI overlay container
    this.uiOverlay = document.createElement('div');
    this.uiOverlay.id = 'ui-overlay';
    this.uiOverlay.className = 'ui-overlay';

    // Add components
    this.uiOverlay.appendChild(this.nowPlaying.render());
    this.uiOverlay.appendChild(this.tabPanel.render());
    this.uiOverlay.appendChild(this.playbackControls.render());

    // Append to app container (overlays on canvas)
    this.container.appendChild(this.uiOverlay);

    // Setup subscriptions
    this.setupSubscriptions();
  }

  /**
   * Setup state subscriptions
   */
  private setupSubscriptions(): void {
    // Components handle their own subscriptions
    // This method can be extended for global UI updates
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.tabPanel.destroy();
    this.nowPlaying.destroy();
    this.playbackControls.destroy();

    if (this.uiOverlay) {
      this.uiOverlay.remove();
    }
  }
}
