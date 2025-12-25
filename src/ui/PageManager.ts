import { StateManager } from '../state/StateManager';
import { StateActions } from '../state/actions';
import { AppState } from '../state/AppState';
import { LandingPage } from './pages/LandingPage';
import { VisualizerPage } from './pages/VisualizerPage';
import { PlaylistService } from '../services/PlaylistService';
import { PlaylistGenerator } from '../services/PlaylistGenerator';
import { AudioBridge } from '../core/AudioBridge';

export type PageType = 'landing' | 'visualizer';

export class PageManager {
  private currentPage: PageType | null = null;
  private landingPage: LandingPage;
  private visualizerPage: VisualizerPage;
  private container: HTMLElement;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService,
    private playlistGenerator: PlaylistGenerator,
    private audioBridge: AudioBridge
  ) {
    this.container = document.createElement('div');
    this.container.id = 'app-root';
    this.container.className = 'app-container';

    this.landingPage = new LandingPage(
      store,
      actions,
      playlistService,
      playlistGenerator,
      () => this.navigateTo('visualizer')
    );

    this.visualizerPage = new VisualizerPage(
      store,
      actions,
      audioBridge,
      () => this.navigateTo('landing')
    );

    this.setupRouting();
  }

  private setupRouting(): void {
    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });

    window.addEventListener('load', () => {
      this.handleRoute();
    });
  }

  private handleRoute(): void {
    const hash = window.location.hash;

    if (hash === '#/visualizer') {
      this.showPage('visualizer');
    } else {
      this.showPage('landing');
    }
  }

  private showPage(page: PageType): void {
    if (this.currentPage === page) return;

    this.currentPage = page;

    if (page === 'landing') {
      this.landingPage.show();
      this.visualizerPage.hide();
      document.body.classList.remove('page-visualizer');
      document.body.classList.add('page-landing');
    } else {
      this.landingPage.hide();
      this.visualizerPage.show();
      document.body.classList.remove('page-landing');
      document.body.classList.add('page-visualizer');
    }
  }

  navigateTo(page: PageType): void {
    if (page === 'landing') {
      window.location.hash = '#/';
    } else if (page === 'visualizer') {
      window.location.hash = '#/visualizer';
    }
  }

  render(): HTMLElement {
    this.container.appendChild(this.landingPage.render());
    this.container.appendChild(this.visualizerPage.render());

    const hash = window.location.hash || '#/';
    if (hash === '#/visualizer') {
      this.showPage('visualizer');
    } else {
      this.showPage('landing');
    }

    return this.container;
  }

  destroy(): void {
    this.landingPage.destroy();
    this.visualizerPage.destroy();
  }
}
