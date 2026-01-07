import { StateManager } from '../../state/StateManager';
import { StateActions } from '../../state/actions';
import { AppState } from '../../state/AppState';
import { MP3LibraryService, LocalTrack } from '../../services/MP3LibraryService';
import { AudioBridge } from '../../core/AudioBridge';
import { MP3MetadataService } from '../../services/MP3MetadataService';
import { formatTime } from '../../utils/formatTime';

export class SimpleSongList {
  private element: HTMLElement;
  private isExpanded: boolean = false;
  private tracks: LocalTrack[] = [];
  private searchQuery: string = '';

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private libraryService: MP3LibraryService,
    private audioBridge: AudioBridge
  ) {
    this.element = document.createElement('div');
    this.element.className = 'song-list collapsed';
  }

  async render(): Promise<HTMLElement> {
    // Load tracks from library
    try {
      this.tracks = await this.libraryService.loadLibrary();
    } catch (error) {
      console.error('Failed to load library:', error);
      this.tracks = [];
    }

    this.element.innerHTML = `
      <button class="song-list-toggle" id="song-list-toggle">
        <span class="icon">🎵</span>
        <span class="text">Music</span>
      </button>

      <div class="song-list-content">
        <div class="song-list-header">
          <h2>Local Music</h2>

          <input type="file" id="song-file-input" accept="audio/*" style="display: none;" />
          <button class="btn-secondary upload-btn" id="upload-btn">
            📁 Upload File
          </button>

          <input
            type="text"
            class="search-input"
            id="song-search"
            placeholder="Search songs..."
          />
        </div>

        <div class="songs-container" id="songs-container">
          ${this.renderSongsHTML()}
        </div>
      </div>
    `;

    this.setupEventListeners();
    return this.element;
  }

  private renderSongsHTML(): string {
    const filteredTracks = this.filterTracks(this.tracks);

    if (filteredTracks.length === 0) {
      return '<div class="empty-state">No songs found</div>';
    }

    return filteredTracks.map((track) => `
      <div
        class="song-item"
        data-track-id="${track.id}"
      >
        <div class="song-info">
          <h4>${this.escapeHtml(track.title)}</h4>
          <p>${this.escapeHtml(track.artist)}</p>
          <span class="duration">${this.formatDuration(track.duration)}</span>
        </div>
        <button class="play-button" aria-label="Play">▶</button>
      </div>
    `).join('');
  }

  private setupEventListeners(): void {
    // Toggle sidebar
    const toggleBtn = this.element.querySelector('#song-list-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.element.classList.toggle('collapsed', !this.isExpanded);
    });

    // File upload
    const fileInput = this.element.querySelector('#song-file-input') as HTMLInputElement;
    const uploadBtn = this.element.querySelector('#upload-btn') as HTMLButtonElement;

    uploadBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        console.log('File selected:', file.name);

        try {
          // Load file through AudioBridge
          this.audioBridge.loadFile(file);

          // Extract metadata from file
          const metadataService = new MP3MetadataService();
          const metadata = await metadataService.extractMetadata(URL.createObjectURL(file));

          // Update state with track info
          this.actions.setCurrentTrack({
            id: Date.now().toString(),
            title: metadata.title,
            artist: metadata.artist,
            duration: metadata.duration,
            url: URL.createObjectURL(file)
          });
          this.actions.setPlaying(true);

          console.log('File loaded successfully');
        } catch (error) {
          console.error('Failed to load file:', error);
        }

        // Reset file input
        fileInput.value = '';
      }
    });

    // Search
    const searchInput = this.element.querySelector('#song-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      this.refreshSongs();
    });

    // Song clicks
    this.setupSongClickListeners();
  }

  private setupSongClickListeners(): void {
    this.element.querySelectorAll('.song-item').forEach((songEl) => {
      songEl.addEventListener('click', () => {
        const trackId = (songEl as HTMLElement).dataset.trackId;
        const track = this.tracks.find(t => t.id === trackId);
        if (track) {
          this.playSong(track);
        }
      });
    });
  }

  private playSong(track: LocalTrack): void {
    // Convert all LocalTracks to Track format for the queue
    const queueTracks = this.tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnailUrl: '',
      url: t.url
    }));

    // Find the index of the clicked track
    const clickedIndex = this.tracks.findIndex(t => t.id === track.id);

    // Set the queue with all tracks
    this.actions.setQueue(queueTracks);

    // Update queue index to the clicked track
    this.store.updatePath('queue', { currentIndex: clickedIndex });

    // Set current track and start playing
    this.actions.setCurrentTrack(queueTracks[clickedIndex]);
    this.actions.setPlaying(true);
  }

  private filterTracks(tracks: LocalTrack[]): LocalTrack[] {
    if (!this.searchQuery) return tracks;

    return tracks.filter(track =>
      track.title.toLowerCase().includes(this.searchQuery) ||
      track.artist.toLowerCase().includes(this.searchQuery)
    );
  }

  private refreshSongs(): void {
    const container = this.element.querySelector('#songs-container');
    if (container) {
      container.innerHTML = this.renderSongsHTML();
      this.setupSongClickListeners();
    }
  }

  private formatDuration(seconds: number): string {
    return formatTime(seconds);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    // Cleanup if needed
  }
}
