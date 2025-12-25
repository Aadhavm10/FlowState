import { StateManager } from './state/StateManager';
import { StateActions } from './state/actions';
import { AppState, initialAppState } from './state/AppState';
import { AudioBridge } from './core/AudioBridge';
import { PageManager } from './ui/PageManager';
import { NowPlayingFooter } from './ui/components/NowPlayingFooter';
import { AIService } from './services/AIService';
import { YouTubeSearchService } from './services/YouTubeSearchService';
import { PlaylistService } from './services/PlaylistService';
import { PlaylistGenerator } from './services/PlaylistGenerator';
import { logger } from './utils/logger';

// Import styles
import './ui/styles/layout.css';
import './ui/styles/landing.css';
import './ui/styles/visualizer.css';
import './ui/styles/footer.css';
import './ui/styles/components.css';

/**
 * Main Application Class
 * Orchestrates all services, state management, and UI
 */
export class App {
  private store: StateManager<AppState>;
  private actions: StateActions;
  private audioBridge: AudioBridge;
  private pageManager: PageManager;
  private nowPlayingFooter: NowPlayingFooter;
  private playlistService: PlaylistService;
  private playlistGenerator: PlaylistGenerator;

  constructor(
    private audioContext: AudioContext,
    private analyser: AnalyserNode,
    existingAudioElement?: HTMLAudioElement
  ) {
    logger.info('Initializing YouTube Music System...');

    // Initialize state management
    this.store = new StateManager<AppState>(initialAppState);
    this.actions = new StateActions(this.store);

    // Initialize audio bridge
    this.audioBridge = new AudioBridge(audioContext, analyser, existingAudioElement);

    // Initialize services
    const aiService = new AIService();
    const searchService = new YouTubeSearchService();
    this.playlistService = new PlaylistService();
    this.playlistGenerator = new PlaylistGenerator(
      aiService,
      searchService,
      this.playlistService
    );

    // Initialize UI
    this.pageManager = new PageManager(
      this.store,
      this.actions,
      this.playlistService,
      this.playlistGenerator,
      this.audioBridge
    );

    this.nowPlayingFooter = new NowPlayingFooter(
      this.store,
      this.actions
    );

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing audio bridge...');
      await this.audioBridge.initialize();

      logger.info('Rendering UI...');
      const appRoot = await this.pageManager.render();
      const footerRoot = this.nowPlayingFooter.render();

      document.body.appendChild(appRoot);
      document.body.appendChild(footerRoot);

      logger.info('Loading saved playlists...');
      const savedPlaylists = this.playlistService.loadAllPlaylists();
      this.actions.loadPlaylists(savedPlaylists);

      logger.info('YouTube Music System initialized successfully!');
    } catch (error) {
      logger.error('Failed to initialize YouTube Music System:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for state changes
   */
  private setupEventListeners(): void {
    // Listen for playback state changes
    this.store.selectSubscribe(
      state => state.playback.isPlaying,
      async (isPlaying) => {
        if (isPlaying) {
          await this.audioBridge.play();
        } else {
          this.audioBridge.pause();
        }
      }
    );

    // Listen for volume changes
    this.store.selectSubscribe(
      state => state.playback.volume,
      (volume) => {
        this.audioBridge.setVolume(volume);
      }
    );

    // Listen for track changes
    this.store.selectSubscribe(
      state => state.playback.currentTrack,
      async (track) => {
        if (track) {
          logger.info('Loading track:', track.title);
          try {
            await this.audioBridge.switchToYouTube(track.youtubeId);
            this.actions.setAudioSource('youtube');
            this.actions.setDuration(track.duration);
          } catch (error) {
            logger.error('Failed to load track:', error);
          }
        }
      }
    );

    // Auto-advance to next track when current track ends
    this.audioBridge.onEnded(() => {
      logger.info('Track ended, playing next...');
      this.actions.playNext();
    });

    // Update position as track plays
    this.audioBridge.onTimeUpdate((time) => {
      this.actions.setPosition(time);
    });

    // Listen for manual position changes (seeking)
    let lastNaturalPosition = 0;
    this.audioBridge.onTimeUpdate((time) => {
      lastNaturalPosition = time;
    });

    this.store.selectSubscribe(
      state => state.playback.position,
      (position) => {
        // Only seek if the position differs significantly from natural playback
        // This prevents seeking on every natural time update
        const currentTime = this.audioBridge.getCurrentTime();
        const diff = Math.abs(position - currentTime);

        // If difference is > 1 second, it's a manual seek
        if (diff > 1) {
          logger.info(`Seeking to ${position.toFixed(1)}s`);
          this.audioBridge.seekTo(position);
        }
      }
    );

    // Log state changes in development
    if (import.meta.env.DEV) {
      this.store.subscribe((state) => {
        logger.debug('State updated:', {
          isPlaying: state.playback.isPlaying,
          currentTrack: state.playback.currentTrack?.title,
          queueLength: state.queue.tracks.length,
          playlistCount: state.playlists.all.length
        });
      });
    }
  }

  /**
   * Get audio bridge for external use (e.g., file upload)
   */
  getAudioBridge(): AudioBridge {
    return this.audioBridge;
  }

  /**
   * Get state store for external use
   */
  getStore(): StateManager<AppState> {
    return this.store;
  }

  /**
   * Get state actions for external use
   */
  getActions(): StateActions {
    return this.actions;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.pageManager.destroy();
    this.nowPlayingFooter.destroy();
  }
}
