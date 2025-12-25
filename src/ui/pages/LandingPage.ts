import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { PlaylistService } from '../../services/PlaylistService';
import { PlaylistGenerator } from '../../services/PlaylistGenerator';
import { FloatingLines } from '../components/FloatingLines';
import { AISearchPanel } from '../components/AISearchPanel';
import { PlaylistsGrid } from '../components/PlaylistsGrid';

export class LandingPage {
  private element: HTMLElement;
  private backgroundContainer: HTMLElement;
  private floatingLines: FloatingLines | null = null;
  private aiSearchPanel: AISearchPanel;
  private playlistsGrid: PlaylistsGrid;
  private unsubscribe: (() => void) | null = null;
  private currentView: 'search' | 'playlists' = 'search';

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService,
    private playlistGenerator: PlaylistGenerator,
    private onNavigateToVisualizer: () => void
  ) {
    this.element = document.createElement('div');
    this.element.className = 'landing-page';
    this.element.style.display = 'none';

    this.backgroundContainer = document.createElement('div');
    this.backgroundContainer.className = 'landing-background';

    this.aiSearchPanel = new AISearchPanel(
      store,
      actions,
      playlistGenerator
    );
    this.playlistsGrid = new PlaylistsGrid(
      store,
      actions,
      playlistService
    );
  }

  render(): HTMLElement {
    this.element.innerHTML = '';

    // Add floating lines background
    this.element.appendChild(this.backgroundContainer);

    // Hero section
    const hero = document.createElement('div');
    hero.className = 'landing-hero';
    hero.innerHTML = `
      <div class="hero-content">
        <h1 class="hero-title">FlowState</h1>
        <p class="hero-subtitle">Generate AI-powered playlists and visualize your music in 3D</p>

        <div class="hero-search-container">
          <input
            type="text"
            class="hero-search-input"
            placeholder="Generate playlist with AI (e.g., 'late night drive')"
            id="hero-search-input"
          />
          <button class="hero-search-btn" id="hero-search-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </div>

        <div class="hero-actions">
          <button class="hero-action-btn primary" id="visualizer-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            3D Visualizer
          </button>
          <button class="hero-action-btn secondary" id="playlists-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13M9 13c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>
            </svg>
            My Playlists
          </button>
        </div>
      </div>
    `;

    this.element.appendChild(hero);

    // Content section (AI search or playlists)
    const contentSection = document.createElement('div');
    contentSection.className = 'landing-content-section';
    contentSection.id = 'content-section';
    contentSection.style.display = 'none';

    const aiSearchContainer = document.createElement('div');
    aiSearchContainer.className = 'content-container';
    aiSearchContainer.id = 'ai-search-container';
    aiSearchContainer.appendChild(this.aiSearchPanel.render());

    const playlistsContainer = document.createElement('div');
    playlistsContainer.className = 'content-container';
    playlistsContainer.id = 'playlists-container';
    playlistsContainer.style.display = 'none';
    playlistsContainer.appendChild(this.playlistsGrid.render());

    contentSection.appendChild(aiSearchContainer);
    contentSection.appendChild(playlistsContainer);

    this.element.appendChild(contentSection);

    // Footer with links
    const footer = document.createElement('footer');
    footer.className = 'landing-footer';
    footer.innerHTML = `
      <div class="footer-links">
        <a href="#" class="footer-link" id="github-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a href="#" class="footer-link" id="portfolio-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Portfolio
        </a>
      </div>
    `;

    this.element.appendChild(footer);

    // Setup event listeners
    this.setupEventListeners();

    return this.element;
  }

  private setupEventListeners(): void {
    // Hero search
    const searchInput = this.element.querySelector('#hero-search-input') as HTMLInputElement;
    const searchBtn = this.element.querySelector('#hero-search-btn') as HTMLButtonElement;

    const handleSearch = async () => {
      const prompt = searchInput?.value.trim();
      if (!prompt) return;

      // Show AI search section and trigger generation
      this.showContent('search');

      // Trigger the AI search panel's generation
      const aiSearchInput = this.element.querySelector('.ai-search-input') as HTMLInputElement;
      const aiSearchButton = this.element.querySelector('.ai-search-button') as HTMLButtonElement;
      if (aiSearchInput && aiSearchButton) {
        aiSearchInput.value = prompt;
        aiSearchButton.click();
      }

      searchInput.value = '';
    };

    searchBtn?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });

    // Visualizer button
    const visualizerBtn = this.element.querySelector('#visualizer-btn');
    visualizerBtn?.addEventListener('click', () => {
      this.onNavigateToVisualizer();
    });

    // Playlists button
    const playlistsBtn = this.element.querySelector('#playlists-btn');
    playlistsBtn?.addEventListener('click', () => {
      this.showContent('playlists');
    });

    // Footer links (placeholders for now)
    const githubLink = this.element.querySelector('#github-link');
    const portfolioLink = this.element.querySelector('#portfolio-link');

    githubLink?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('GitHub link clicked - add your GitHub URL');
    });

    portfolioLink?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Portfolio link clicked - add your portfolio URL');
    });
  }

  private showContent(view: 'search' | 'playlists'): void {
    this.currentView = view;

    const contentSection = this.element.querySelector('#content-section') as HTMLElement;
    const aiSearchContainer = this.element.querySelector('#ai-search-container') as HTMLElement;
    const playlistsContainer = this.element.querySelector('#playlists-container') as HTMLElement;

    contentSection.style.display = 'block';

    if (view === 'search') {
      aiSearchContainer.style.display = 'block';
      playlistsContainer.style.display = 'none';
    } else {
      aiSearchContainer.style.display = 'none';
      playlistsContainer.style.display = 'block';
    }
  }

  show(): void {
    this.element.style.display = 'block';

    // Initialize floating lines background
    if (!this.floatingLines) {
      this.floatingLines = new FloatingLines(this.backgroundContainer, {
        enabledWaves: ['top', 'middle', 'bottom'],
        lineCount: [10, 15, 20],
        lineDistance: [8, 6, 4],
        bendRadius: 5.0,
        bendStrength: -0.5,
        interactive: true,
        parallax: true,
        animationSpeed: 0.6
      });
    }
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.unsubscribe?.();
    this.aiSearchPanel.destroy();
    this.playlistsGrid.destroy();
    this.floatingLines?.destroy();
  }
}
