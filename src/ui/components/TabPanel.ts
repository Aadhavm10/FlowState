import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { VisualizerTab } from './VisualizerTab';
import { PlaylistTab } from './PlaylistTab';
import { SearchTab } from './SearchTab';
import { SettingsTab } from './SettingsTab';
import { PlaylistService } from '../../services/PlaylistService';
import { PlaylistGenerator } from '../../services/PlaylistGenerator';

/**
 * TabPanel - main tabbed interface container
 */
export class TabPanel {
  private element: HTMLElement;
  private tabs: Map<string, any> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistService: PlaylistService,
    private playlistGenerator: PlaylistGenerator
  ) {
    this.element = document.createElement('div');
    this.element.className = 'tab-panel';
  }

  render(): HTMLElement {
    // Create tab navigation
    const tabNav = document.createElement('div');
    tabNav.className = 'tab-nav';
    tabNav.innerHTML = `
      <button class="tab-button active" data-tab="visualizer">
        <span class="tab-icon">🎨</span>
        <span class="tab-label">Visualizer</span>
      </button>
      <button class="tab-button" data-tab="search">
        <span class="tab-icon">✨</span>
        <span class="tab-label">Search</span>
      </button>
      <button class="tab-button" data-tab="playlist">
        <span class="tab-icon">📋</span>
        <span class="tab-label">Playlists</span>
      </button>
      <button class="tab-button" data-tab="settings">
        <span class="tab-icon">⚙️</span>
        <span class="tab-label">Settings</span>
      </button>
      <button class="collapse-button" title="Collapse Panel">
        <span class="collapse-icon">⬇️</span>
      </button>
    `;

    // Create tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content-container';

    // Initialize tab components
    const visualizerTab = new VisualizerTab(this.store, this.actions);
    const searchTab = new SearchTab(this.store, this.actions, this.playlistGenerator);
    const playlistTab = new PlaylistTab(this.store, this.actions, this.playlistService);
    const settingsTab = new SettingsTab(this.store, this.actions);

    this.tabs.set('visualizer', visualizerTab);
    this.tabs.set('search', searchTab);
    this.tabs.set('playlist', playlistTab);
    this.tabs.set('settings', settingsTab);

    // Render all tabs
    this.tabs.forEach((tab, id) => {
      const tabEl = tab.render();
      tabEl.dataset.tabId = id;
      tabEl.style.display = id === 'visualizer' ? 'block' : 'none';
      tabContent.appendChild(tabEl);
    });

    // Assemble panel
    this.element.appendChild(tabNav);
    this.element.appendChild(tabContent);

    // Event listeners for tab buttons
    tabNav.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = (btn as HTMLElement).dataset.tab!;
        this.switchTab(tabId);
      });
    });

    // Collapse button
    const collapseBtn = tabNav.querySelector('.collapse-button');
    collapseBtn?.addEventListener('click', () => {
      this.actions.togglePanel();
    });

    // Subscribe to active tab changes
    this.unsubscribe = this.store.selectSubscribe(
      state => ({ activeTab: state.ui.activeTab, isCollapsed: state.ui.isPanelCollapsed }),
      ({ activeTab, isCollapsed }) => {
        this.switchTab(activeTab);
        this.setCollapsed(isCollapsed);
      }
    );

    return this.element;
  }

  private switchTab(tabId: string): void {
    // Update button states
    this.element.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabId);
    });

    // Update tab content visibility
    this.element.querySelectorAll('[data-tab-id]').forEach(el => {
      (el as HTMLElement).style.display =
        (el as HTMLElement).dataset.tabId === tabId ? 'block' : 'none';
    });

    // Update state if not already set
    if (this.store.getState().ui.activeTab !== tabId) {
      this.actions.setActiveTab(tabId as any);
    }
  }

  setCollapsed(collapsed: boolean): void {
    this.element.classList.toggle('collapsed', collapsed);
    const collapseIcon = this.element.querySelector('.collapse-icon');
    if (collapseIcon) {
      collapseIcon.textContent = collapsed ? '⬆️' : '⬇️';
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    this.tabs.forEach(tab => tab.destroy?.());
  }
}
