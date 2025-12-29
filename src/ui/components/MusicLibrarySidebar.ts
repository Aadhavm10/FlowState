import type { Catalog, Genre, Song } from '../../types/library';
import type { StateManager } from '../../state/StateManager';
import type { AppState } from '../../state/AppState';
import type { StateActions } from '../../state/actions';
import type { LibraryAudioService } from '../../services/LibraryAudioService';

/**
 * Music Library Sidebar Component
 * Collapsible sidebar overlay with genre-based song browsing
 */
export class MusicLibrarySidebar {
  private element: HTMLElement;
  private isExpanded: boolean = false;
  private catalog: Catalog | null = null;
  private expandedGenres: Set<string> = new Set();
  private searchQuery: string = '';
  private isLoading: boolean = false;
  private shuffledPlaylist: Song[] = [];
  private currentTrackIndex: number = 0;

  constructor(
    private store: StateManager<AppState>,
    private actions: StateActions,
    private libraryAudioService: LibraryAudioService
  ) {
    this.element = document.createElement('div');
    this.element.className = 'library-sidebar collapsed';
  }

  /**
   * Render the sidebar component
   * Loads catalog and sets up event listeners
   */
  async render(): Promise<HTMLElement> {
    // Load catalog from public folder
    try {
      const response = await fetch('/catalog.json');
      if (!response.ok) {
        throw new Error('Failed to load catalog');
      }
      this.catalog = await response.json();
      console.log(`[MusicLibrarySidebar] Loaded catalog: ${this.catalog.genres.length} genres`);
    } catch (error) {
      console.error('[MusicLibrarySidebar] Failed to load catalog:', error);
      this.catalog = { version: '1.0.0', lastUpdated: '', genres: [] };
    }

    // Build initial HTML structure
    this.element.innerHTML = `
      <button class="library-toggle" id="library-toggle" aria-label="Toggle Music Library">
        <span class="icon">🎵</span>
        <span class="text">Music Library</span>
      </button>

      <div class="library-content">
        <!-- Header with search -->
        <div class="library-header">
          <h2>Music Library</h2>
          <input
            type="text"
            class="search-input"
            id="library-search"
            placeholder="Search genres or songs..."
            aria-label="Search music"
          />
          <button class="shuffle-all-btn" id="shuffle-all-btn" aria-label="Shuffle All Songs">
            <i class="fas fa-random"></i> Shuffle All
          </button>
        </div>

        <!-- Genres container (scrollable) -->
        <div class="genres-container" id="genres-container">
          ${this.renderGenresHTML()}
        </div>

        <!-- Loading overlay -->
        <div class="loading-overlay hidden" id="loading-overlay">
          <div class="spinner"></div>
          <p id="loading-text">Loading audio...</p>
        </div>
      </div>
    `;

    // Setup event listeners
    this.setupEventListeners();

    return this.element;
  }

  /**
   * Setup all event listeners for sidebar
   */
  private setupEventListeners(): void {
    // Toggle sidebar open/close
    const toggleBtn = this.element.querySelector('#library-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Search input
    const searchInput = this.element.querySelector('#library-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.searchQuery = target.value.toLowerCase();
      this.refreshGenres();
    });

    // Shuffle all button
    const shuffleBtn = this.element.querySelector('#shuffle-all-btn');
    shuffleBtn?.addEventListener('click', () => {
      this.shuffleAllSongs();
    });

    // Genre expansion and song clicks will be set up per genre
    this.setupGenreEventListeners();
  }

  /**
   * Setup event listeners for genre cards and songs
   */
  private setupGenreEventListeners(): void {
    // Genre header clicks (expand/collapse)
    this.element.querySelectorAll('.genre-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        const genreId = (header as HTMLElement).dataset.genreId;
        if (genreId) {
          this.toggleGenre(genreId);
        }
      });
    });

    // Song item clicks (play song)
    this.element.querySelectorAll('.song-item').forEach((songEl) => {
      songEl.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger genre expand
        const youtubeId = (songEl as HTMLElement).dataset.youtubeId;
        const title = (songEl as HTMLElement).dataset.title;
        const artist = (songEl as HTMLElement).dataset.artist;
        const duration = parseInt((songEl as HTMLElement).dataset.duration || '0');

        if (youtubeId) {
          this.playSong({
            id: youtubeId,
            title: title || 'Unknown',
            artist: artist || 'Unknown',
            youtubeId,
            duration,
            thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
          });
        }
      });
    });
  }

  /**
   * Toggle sidebar open/close
   */
  private toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
    this.element.classList.toggle('collapsed', !this.isExpanded);
    console.log(`[MusicLibrarySidebar] Sidebar ${this.isExpanded ? 'expanded' : 'collapsed'}`);
  }

  /**
   * Toggle genre expansion
   */
  private toggleGenre(genreId: string): void {
    if (this.expandedGenres.has(genreId)) {
      this.expandedGenres.delete(genreId);
    } else {
      this.expandedGenres.add(genreId);
    }
    this.refreshGenres();
  }

  /**
   * Refresh genres display (after search or expand/collapse)
   */
  private refreshGenres(): void {
    const container = this.element.querySelector('#genres-container');
    if (container) {
      container.innerHTML = this.renderGenresHTML();
      this.setupGenreEventListeners(); // Re-attach event listeners
    }
  }

  /**
   * Render all genres as HTML
   */
  private renderGenresHTML(): string {
    if (!this.catalog || this.catalog.genres.length === 0) {
      return '<div class="empty-state">No music catalog loaded</div>';
    }

    // Filter genres based on search query
    const filteredGenres = this.filterGenres(this.catalog.genres);

    if (filteredGenres.length === 0) {
      return `<div class="empty-state">No results for "${this.searchQuery}"</div>`;
    }

    return filteredGenres.map((genre) => this.renderGenreCardHTML(genre)).join('');
  }

  /**
   * Filter genres based on search query
   */
  private filterGenres(genres: Genre[]): Genre[] {
    if (!this.searchQuery) {
      return genres;
    }

    return genres.filter((genre) => {
      // Search in genre name
      if (genre.name.toLowerCase().includes(this.searchQuery)) {
        return true;
      }

      // Search in songs
      return genre.songs.some(
        (song) =>
          song.title.toLowerCase().includes(this.searchQuery) ||
          song.artist.toLowerCase().includes(this.searchQuery)
      );
    });
  }

  /**
   * Render a single genre card as HTML
   */
  private renderGenreCardHTML(genre: Genre): string {
    const isExpanded = this.expandedGenres.has(genre.id);

    return `
      <div class="genre-card" style="border-left: 4px solid ${genre.color}">
        <div class="genre-header" data-genre-id="${genre.id}">
          <div class="genre-info">
            <h3>${genre.name}</h3>
            <p>${genre.description}</p>
            <span class="song-count">${genre.songs.length} song${genre.songs.length !== 1 ? 's' : ''}</span>
          </div>
          <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
        </div>

        ${isExpanded ? `
          <div class="songs-list">
            ${genre.songs.map((song) => this.renderSongItemHTML(song)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render a single song item as HTML
   */
  private renderSongItemHTML(song: Song): string {
    return `
      <div
        class="song-item"
        data-youtube-id="${song.youtubeId}"
        data-title="${this.escapeHtml(song.title)}"
        data-artist="${this.escapeHtml(song.artist)}"
        data-duration="${song.duration}"
      >
        <img
          src="${song.thumbnailUrl}"
          alt="${this.escapeHtml(song.title)}"
          class="thumbnail"
          loading="lazy"
        />
        <div class="song-info">
          <h4>${this.escapeHtml(song.title)}</h4>
          <p>${this.escapeHtml(song.artist)}</p>
          <div class="song-meta">
            <span class="duration">${this.formatDuration(song.duration)}</span>
            ${song.bpm ? `<span class="bpm">${song.bpm} BPM</span>` : ''}
            ${song.mood && song.mood.length > 0 ? `<span class="mood">${song.mood[0]}</span>` : ''}
          </div>
        </div>
        <button class="play-button" aria-label="Play ${this.escapeHtml(song.title)}">▶</button>
      </div>
    `;
  }

  /**
   * Play song through library audio service
   */
  private async playSong(song: Song): Promise<void> {
    if (this.isLoading) {
      console.log('[MusicLibrarySidebar] Already loading, ignoring click');
      return;
    }

    console.log(`[MusicLibrarySidebar] Playing: ${song.title} by ${song.artist}`);

    const loadingOverlay = this.element.querySelector('#loading-overlay');
    const loadingText = this.element.querySelector('#loading-text');

    // Show loading overlay
    this.isLoading = true;
    loadingOverlay?.classList.remove('hidden');
    if (loadingText) {
      loadingText.textContent = `Loading "${song.title}"...`;
    }

    await this.libraryAudioService.playSong(
      song.youtubeId,
      () => {
        // Success callback
        console.log('[MusicLibrarySidebar] Song loaded successfully');
        this.isLoading = false;
        loadingOverlay?.classList.add('hidden');

        // Update app state with current track
        this.actions.setCurrentTrack({
          id: song.youtubeId,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          youtubeId: song.youtubeId,
          thumbnailUrl: song.thumbnailUrl,
        });
        this.actions.setPlaying(true);
        this.actions.setAudioSource('file'); // Stream is treated as file source
      },
      (error) => {
        // Error callback
        console.error('[MusicLibrarySidebar] Failed to play song:', error);
        this.isLoading = false;
        loadingOverlay?.classList.add('hidden');

        // Show error to user
        alert(`Failed to play "${song.title}"\n\nError: ${error.message}\n\nThe backend server may be sleeping. Please try again in 30 seconds.`);
      }
    );
  }

  /**
   * Shuffle all songs from all genres and start playing
   */
  private shuffleAllSongs(): void {
    if (!this.catalog || this.catalog.genres.length === 0) {
      alert('No music catalog loaded');
      return;
    }

    // Collect all songs from all genres
    const allSongs: Song[] = [];
    this.catalog.genres.forEach((genre) => {
      allSongs.push(...genre.songs);
    });

    if (allSongs.length === 0) {
      alert('No songs available to shuffle');
      return;
    }

    console.log(`[MusicLibrarySidebar] Shuffling ${allSongs.length} songs...`);

    // Fisher-Yates shuffle algorithm
    const shuffled = [...allSongs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Store shuffled playlist
    this.shuffledPlaylist = shuffled;
    this.currentTrackIndex = 0;

    console.log(`[MusicLibrarySidebar] Shuffle complete! Starting with: ${shuffled[0].title}`);

    // Play first song in shuffled playlist
    this.playSong(shuffled[0]);
  }

  /**
   * Format duration from seconds to MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Remove event listeners if needed
    console.log('[MusicLibrarySidebar] Destroyed');
  }
}
