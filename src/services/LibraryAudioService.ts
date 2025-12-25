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
   * Play song from library
   * Downloads audio from backend, then plays through AudioBridge
   *
   * @param youtubeId - YouTube video ID
   * @param onReady - Callback when audio is ready to play
   * @param onError - Callback if download/playback fails
   */
  async playSong(
    youtubeId: string,
    onReady: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    console.log(`[LibraryAudioService] Playing song: ${youtubeId}`);

    try {
      // Step 1: Initiate download on backend
      console.log('[LibraryAudioService] Step 1: Initiating backend download...');
      const { jobId } = await this.apiService.initiateDownload(youtubeId);

      // Step 2: Wait for download to complete
      console.log('[LibraryAudioService] Step 2: Waiting for download...');
      const streamUrl = await this.apiService.waitForDownload(jobId);

      // Step 3: Switch AudioBridge to stream URL
      console.log('[LibraryAudioService] Step 3: Loading audio into AudioBridge...');
      await this.audioBridge.switchToFileUrl(streamUrl);

      // Step 4: Notify caller that audio is ready
      console.log('[LibraryAudioService] Step 4: Audio ready!');
      onReady();
    } catch (error) {
      console.error('[LibraryAudioService] Failed to play song:', error);
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
