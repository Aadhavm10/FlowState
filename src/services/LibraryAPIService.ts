import type { DownloadJob, DownloadStatusResponse } from '../types/library';

/**
 * API Service for Music Library backend communication
 * Handles YouTube audio download requests via backend server
 */
export class LibraryAPIService {
  private readonly apiUrl: string;

  constructor() {
    // In production: Use Vercel API proxy (avoids mixed content HTTPS→HTTP)
    // In development: Direct connection to local backend
    if (import.meta.env.DEV) {
      this.apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    } else {
      // Production: Use Vercel API proxy at /api/library-proxy
      this.apiUrl = '';  // Empty = use relative URLs
    }
    console.log(`[LibraryAPIService] Mode: ${import.meta.env.DEV ? 'DEV' : 'PROD'}, API URL: ${this.apiUrl || 'Vercel Proxy'}`);
  }

  /**
   * Get stream URL for a 30-second MP3 preview (cached)
   * @param youtubeId - YouTube video ID
   * @returns string - URL to stream MP3 preview
   */
  getPreviewUrl(youtubeId: string): string {
    return this.apiUrl
      ? `${this.apiUrl}/api/preview/${youtubeId}`
      : `/api/library-proxy/preview/${youtubeId}`;
  }

  /**
   * Initiate download of audio from YouTube
   * @param youtubeId - YouTube video ID
   * @returns Promise<DownloadJob> - Job details for polling
   */
  async initiateDownload(youtubeId: string): Promise<DownloadJob> {
    console.log(`[LibraryAPIService] Initiating download for: ${youtubeId}`);

    try {
      const url = this.apiUrl ? `${this.apiUrl}/api/download` : '/api/library-proxy/download';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || 'Failed to initiate download');
      }

      const data: DownloadJob = await response.json();
      console.log(`[LibraryAPIService] Download initiated. Job ID: ${data.jobId}`);
      return data;
    } catch (error) {
      console.error('[LibraryAPIService] Download initiation failed:', error);
      throw error;
    }
  }

  /**
   * Check status of download job
   * @param jobId - Job ID from initiateDownload
   * @returns Promise<DownloadStatusResponse> - Current status
   */
  async checkStatus(jobId: string): Promise<DownloadStatusResponse> {
    try {
      const url = this.apiUrl ? `${this.apiUrl}/api/status/${jobId}` : `/api/library-proxy/status/${jobId}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || 'Failed to check status');
      }

      const data: DownloadStatusResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[LibraryAPIService] Status check failed:', error);
      throw error;
    }
  }

  /**
   * Get stream URL for completed download
   * @param jobId - Job ID from initiateDownload
   * @returns string - URL to stream audio
   */
  getStreamUrl(jobId: string): string {
    return this.apiUrl ? `${this.apiUrl}/api/stream/${jobId}` : `/api/library-proxy/stream/${jobId}`;
  }

  /**
   * Wait for download to complete by polling status
   * @param jobId - Job ID from initiateDownload
   * @param maxAttempts - Maximum number of poll attempts (default: 30)
   * @param pollInterval - Interval between polls in ms (default: 1000)
   * @returns Promise<string> - Stream URL when download completes
   */
  async waitForDownload(
    jobId: string,
    maxAttempts: number = 30,
    pollInterval: number = 1000
  ): Promise<string> {
    console.log(`[LibraryAPIService] Waiting for download completion (max ${maxAttempts}s)...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkStatus(jobId);

      console.log(`[LibraryAPIService] Poll ${attempt}/${maxAttempts}: ${status.status}`);

      if (status.status === 'completed') {
        const streamUrl = this.getStreamUrl(jobId);
        console.log(`[LibraryAPIService] Download completed! Stream URL: ${streamUrl}`);
        return streamUrl;
      }

      if (status.status === 'error') {
        throw new Error(status.error || 'Download failed');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Download timeout - took longer than expected');
  }

  /**
   * Health check - verify backend is reachable
   * @returns Promise<boolean> - True if backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`);
      const data = await response.json();
      console.log('[LibraryAPIService] Health check:', data);
      return data.status === 'ok';
    } catch (error) {
      console.error('[LibraryAPIService] Health check failed:', error);
      return false;
    }
  }
}
