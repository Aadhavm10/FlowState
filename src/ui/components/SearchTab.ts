import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { PlaylistGenerator } from '../../services/PlaylistGenerator';
import { debounce } from '../../utils/debounce';

/**
 * Search tab - AI playlist generation and YouTube search
 */
export class SearchTab {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistGenerator: PlaylistGenerator
  ) {
    this.element = document.createElement('div');
    this.element.className = 'search-tab tab-content';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>AI Playlist Generator</h2>

      <div class="section">
        <h3>Describe Your Vibe</h3>
        <div class="search-input-container">
          <input
            type="text"
            id="ai-prompt"
            class="search-input"
            placeholder="e.g., 'late night drive', 'workout energy', 'chill study music'"
          />
          <button id="generate-btn" class="btn-primary">
            Generate Playlist
          </button>
        </div>
        <p class="help-text">
          Describe a mood, activity, or genre and AI will create a personalized playlist.
        </p>
      </div>

      <div id="generation-status" class="status-message" style="display: none;">
        <div class="spinner"></div>
        <span class="status-text">Generating playlist...</span>
      </div>

      <div id="generation-error" class="error-message" style="display: none;"></div>

      <div id="generation-success" class="success-message" style="display: none;">
        <span class="success-text"></span>
      </div>

      <div class="section">
        <h3>Examples</h3>
        <div class="example-chips">
          <button class="chip" data-prompt="late night drive">Late Night Drive</button>
          <button class="chip" data-prompt="workout energy">Workout Energy</button>
          <button class="chip" data-prompt="chill study music">Chill Study</button>
          <button class="chip" data-prompt="90s nostalgia">90s Nostalgia</button>
          <button class="chip" data-prompt="indie vibes">Indie Vibes</button>
        </div>
      </div>
    `;

    // Event listeners
    const promptInput = this.element.querySelector('#ai-prompt') as HTMLInputElement;
    const generateBtn = this.element.querySelector('#generate-btn') as HTMLButtonElement;
    const statusDiv = this.element.querySelector('#generation-status') as HTMLElement;
    const errorDiv = this.element.querySelector('#generation-error') as HTMLElement;
    const successDiv = this.element.querySelector('#generation-success') as HTMLElement;

    const handleGenerate = async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      // Show loading state
      generateBtn.disabled = true;
      statusDiv.style.display = 'flex';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        const playlist = await this.playlistGenerator.generateFromPrompt(prompt);

        // Update state
        this.actions.savePlaylist(playlist);
        this.actions.setQueue(playlist.tracks);

        // Show success
        statusDiv.style.display = 'none';
        successDiv.style.display = 'flex';
        const successText = successDiv.querySelector('.success-text') as HTMLElement;
        successText.textContent = `Created "${playlist.name}" with ${playlist.tracks.length} tracks!`;

        // Switch to playlist tab after 2 seconds
        setTimeout(() => {
          this.actions.setActiveTab('playlist');
        }, 2000);

      } catch (error) {
        console.error('Playlist generation failed:', error);
        statusDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Failed to generate playlist: ${error instanceof Error ? error.message : 'Unknown error'}`;
      } finally {
        generateBtn.disabled = false;
      }
    };

    generateBtn.addEventListener('click', handleGenerate);
    promptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleGenerate();
      }
    });

    // Example chips
    this.element.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = (chip as HTMLElement).dataset.prompt || '';
        promptInput.value = prompt;
        handleGenerate();
      });
    });

    return this.element;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}
