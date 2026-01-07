import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { PlaylistGenerator } from '../../services/PlaylistGenerator';

export class AISearchPanel {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private playlistGenerator: PlaylistGenerator
  ) {
    this.element = document.createElement('section');
    this.element.className = 'ai-search-panel';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h2>Generate Playlist</h2>

      <div class="search-input-container">
        <input
          type="text"
          id="ai-prompt-landing"
          class="search-input"
          placeholder="Describe the vibe (e.g., late night drive, workout energy)"
        />
        <button id="generate-btn-landing" class="btn-primary">
          Generate
        </button>
      </div>

      <div id="generation-status-landing" class="status-message" style="display: none;">
        <div class="spinner"></div>
        <span class="status-text">Generating playlist...</span>
      </div>

      <div id="generation-error-landing" class="error-message" style="display: none;"></div>

      <div id="generation-success-landing" class="success-message" style="display: none;">
        <span class="success-text"></span>
      </div>

      <div class="example-chips">
        <button class="chip" data-prompt="late night drive">Late Night Drive</button>
        <button class="chip" data-prompt="workout energy">Workout Energy</button>
        <button class="chip" data-prompt="chill study music">Chill Study</button>
        <button class="chip" data-prompt="90s nostalgia">90s Nostalgia</button>
        <button class="chip" data-prompt="indie vibes">Indie Vibes</button>
      </div>
    `;

    const promptInput = this.element.querySelector('#ai-prompt-landing') as HTMLInputElement;
    const generateBtn = this.element.querySelector('#generate-btn-landing') as HTMLButtonElement;
    const statusDiv = this.element.querySelector('#generation-status-landing') as HTMLElement;
    const errorDiv = this.element.querySelector('#generation-error-landing') as HTMLElement;
    const successDiv = this.element.querySelector('#generation-success-landing') as HTMLElement;

    const handleGenerate = async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      generateBtn.disabled = true;
      statusDiv.style.display = 'flex';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        // Generate playlist using AI
        const playlist = await this.playlistGenerator.generateFromPrompt(prompt);

        // Set playlist as queue and start playing
        this.actions.setQueue(playlist.tracks);
        if (playlist.tracks.length > 0) {
          this.actions.setCurrentTrack(playlist.tracks[0]);
          this.actions.setPlaying(true);
        }

        // Show success message
        statusDiv.style.display = 'none';
        successDiv.style.display = 'block';
        const successText = successDiv.querySelector('.success-text');
        if (successText) {
          successText.textContent = `Created "${playlist.name}" with ${playlist.tracks.length} songs`;
        }

        // Clear input
        promptInput.value = '';

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
