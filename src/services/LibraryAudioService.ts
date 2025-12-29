import { AudioBridge } from '../core/AudioBridge';
import { LibraryAPIService } from './LibraryAPIService';

/**
 * Audio Integration Service for Music Library
 * Bridges library song selection with AudioBridge playback
 */
export class LibraryAudioService {
  constructor(
    private apiService: LibraryAPIService,
    private audioBridge: AudioBridge
  ) {
    console.log('[LibraryAudioService] Initialized');
  }

  /**
   * Play 30-second preview from library
   * Uses cached MP3 previews for instant playback
   *
   * @param youtubeId - YouTube video ID
   * @param onReady - Callback when audio is ready to play
   * @param onError - Callback if playback fails
   */
  async playSong(
    youtubeId: string,
    onReady: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    console.log(`[LibraryAudioService] Playing preview: ${youtubeId}`);

    try {
      // Get preview URL (immediate - no download wait)
      const previewUrl = this.apiService.getPreviewUrl(youtubeId);
      console.log(`[LibraryAudioService] Loading preview: ${previewUrl}`);

      // Switch AudioBridge to preview URL
      await this.audioBridge.switchToFileUrl(previewUrl);

      // Notify caller that audio is ready
      console.log('[LibraryAudioService] Preview loaded successfully');
      onReady();
    } catch (error) {
      console.error('[LibraryAudioService] Failed to play preview:', error);
      onError(error as Error);
    }
  }

  /**
   * Check if backend is reachable
   * @returns Promise<boolean> - True if backend is healthy
   */
  async checkBackendHealth(): Promise<boolean> {
    return this.apiService.healthCheck();
  }
}
