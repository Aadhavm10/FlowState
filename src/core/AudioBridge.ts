import { AudioSource } from '../types/audio';

// YouTube IFrame API types are global, declared in youtube.d.ts
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type YTPlayer = any;

/**
 * FileAudioSource - Wraps HTML Audio element for file uploads
 * This is compatible with the existing visualizer's audio setup
 */
class FileAudioSource implements AudioSource {
  type: 'file' = 'file';
  private audioElement: HTMLAudioElement;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private endedCallback: (() => void) | null = null;
  private timeUpdateCallback: ((time: number) => void) | null = null;

  constructor(
    private audioContext: AudioContext,
    existingAudioElement?: HTMLAudioElement
  ) {
    // Use existing audio element if provided, otherwise create new one
    this.audioElement = existingAudioElement || new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    // Setup event listeners
    this.audioElement.addEventListener('ended', () => {
      if (this.endedCallback) {
        this.endedCallback();
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.timeUpdateCallback) {
        this.timeUpdateCallback(this.audioElement.currentTime);
      }
    });
  }

  loadFile(file: File): void {
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.load();
  }

  loadUrl(url: string): void {
    this.audioElement.src = url;
    this.audioElement.load();
  }

  connect(analyser: AnalyserNode): void {
    // Only create MediaElementSource once
    if (!this.mediaSource) {
      try {
        this.mediaSource = this.audioContext.createMediaElementSource(this.audioElement);
      } catch (error) {
        console.error('Error creating media source:', error);
        return;
      }
    }

    // Connect: source → analyser → destination
    this.mediaSource.connect(analyser);
    analyser.connect(this.audioContext.destination);
  }

  disconnect(): void {
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (error) {
        // Already disconnected, ignore
      }
    }
  }

  async play(): Promise<void> {
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.audioElement.play();
  }

  pause(): void {
    this.audioElement.pause();
  }

  setVolume(volume: number): void {
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
  }

  getCurrentTime(): number {
    return this.audioElement.currentTime;
  }

  getDuration(): number {
    return this.audioElement.duration || 0;
  }

  seekTo(time: number): void {
    this.audioElement.currentTime = time;
  }

  onEnded(callback: () => void): void {
    this.endedCallback = callback;
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallback = callback;
  }

  getAudioElement(): HTMLAudioElement {
    return this.audioElement;
  }
}

/**
 * YouTubeAudioSource - Wraps YouTube IFrame Player
 */
class YouTubeAudioSource implements AudioSource {
  type: 'youtube' = 'youtube';
  private player: YTPlayer | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private intervalId: number | null = null;
  private endedCallback: (() => void) | null = null;
  private timeUpdateCallback: ((time: number) => void) | null = null;
  private isApiReady = false;

  constructor(
    private audioContext: AudioContext,
    private containerId: string
  ) {}

  async initialize(): Promise<void> {
    await this.waitForYouTubeAPI();
    this.isApiReady = true;
  }

  private waitForYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve();
      } else {
        window.onYouTubeIframeAPIReady = () => {
          resolve();
        };
      }
    });
  }

  async loadVideo(videoId: string): Promise<void> {
    if (!this.isApiReady) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.player) {
        // Create player for first time
        this.player = new window.YT.Player(this.containerId, {
          height: '0',
          width: '0',
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              this.setupEventListeners();
              resolve();
            },
            onError: (e) => reject(e),
          }
        });
      } else {
        // Load new video in existing player
        this.player.loadVideoById(videoId);
        resolve();
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    this.player.addEventListener('onStateChange', (event: any) => {
      // PlayerState: ENDED = 0, PLAYING = 1, PAUSED = 2
      if (event.data === 0 && this.endedCallback) {
        this.endedCallback();
      }

      // Start position tracking when playing
      if (event.data === 1) {
        this.startPositionTracking();
      } else {
        this.stopPositionTracking();
      }
    });
  }

  private startPositionTracking(): void {
    if (this.intervalId !== null) {
      return; // Already tracking
    }

    this.intervalId = window.setInterval(() => {
      if (this.player && this.timeUpdateCallback) {
        const time = this.player.getCurrentTime();
        this.timeUpdateCallback(time);
      }
    }, 1000); // Update every second
  }

  private stopPositionTracking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  connect(analyser: AnalyserNode): void {
    // YouTube IFrame MediaStream capture
    // Note: This may not work in all browsers due to cross-origin restrictions
    // If it fails, visualization won't work with YouTube but playback will

    try {
      const iframe = document.getElementById(this.containerId) as HTMLIFrameElement;
      if (!iframe) {
        console.warn('YouTube player iframe not found');
        return;
      }

      // Try to get video element from iframe
      // This may fail due to CORS, which is expected
      const video = iframe.querySelector('video');
      if (video && 'captureStream' in video) {
        this.mediaStream = (video as any).captureStream();
        this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.mediaStreamSource.connect(analyser);
        analyser.connect(this.audioContext.destination);
        console.log('YouTube audio connected to visualizer');
      } else {
        console.warn('MediaStream capture not available for YouTube');
      }
    } catch (error) {
      console.warn('Could not connect YouTube audio to visualizer:', error);
      // Playback will still work, just no visualization
    }
  }

  disconnect(): void {
    this.stopPositionTracking();
    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch (error) {
        // Already disconnected
      }
    }
  }

  async play(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  setVolume(volume: number): void {
    // YouTube volume is 0-100
    this.player?.setVolume(Math.max(0, Math.min(1, volume)) * 100);
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  getDuration(): number {
    return this.player?.getDuration() ?? 0;
  }

  seekTo(time: number): void {
    this.player?.seekTo(time, true);
  }

  onEnded(callback: () => void): void {
    this.endedCallback = callback;
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallback = callback;
  }

  destroy(): void {
    this.stopPositionTracking();
    this.disconnect();
    this.player?.destroy();
  }
}

/**
 * AudioBridge - Unified interface for file and YouTube playback
 * Manages audio playback and connects to the visualizer
 */
export class AudioBridge {
  private fileSource: FileAudioSource;
  private youtubeSource: YouTubeAudioSource;
  private activeSource: AudioSource | null = null;
  private analyser: AnalyserNode;

  constructor(
    private audioContext: AudioContext,
    analyserNode: AnalyserNode,
    existingAudioElement?: HTMLAudioElement
  ) {
    this.analyser = analyserNode;
    this.fileSource = new FileAudioSource(audioContext, existingAudioElement);
    this.youtubeSource = new YouTubeAudioSource(audioContext, 'youtube-player');
  }

  async initialize(): Promise<void> {
    // Initialize YouTube player
    await this.youtubeSource.initialize();
  }

  /**
   * Load and play a file
   */
  loadFile(file: File): void {
    this.disconnectActive();
    this.fileSource.loadFile(file);
    this.fileSource.connect(this.analyser);
    this.activeSource = this.fileSource;
  }

  /**
   * Load and play from URL
   */
  loadUrl(url: string): void {
    this.disconnectActive();
    this.fileSource.loadUrl(url);
    this.fileSource.connect(this.analyser);
    this.activeSource = this.fileSource;
  }

  /**
   * Switch to YouTube playback
   */
  async switchToYouTube(videoId: string): Promise<void> {
    this.disconnectActive();
    await this.youtubeSource.loadVideo(videoId);
    this.youtubeSource.connect(this.analyser);
    this.activeSource = this.youtubeSource;
  }

  /**
   * Disconnect currently active source
   */
  private disconnectActive(): void {
    if (this.activeSource) {
      this.activeSource.pause();
      this.activeSource.disconnect();
    }
  }

  /**
   * Get currently active source
   */
  getActiveSource(): AudioSource | null {
    return this.activeSource;
  }

  /**
   * Get file source (for accessing existing audio element)
   */
  getFileSource(): FileAudioSource {
    return this.fileSource;
  }

  // ==================== Proxy Methods ====================
  // These forward to the active source

  async play(): Promise<void> {
    if (this.activeSource) {
      await this.activeSource.play();
    }
  }

  pause(): void {
    this.activeSource?.pause();
  }

  setVolume(volume: number): void {
    this.activeSource?.setVolume(volume);
  }

  getCurrentTime(): number {
    return this.activeSource?.getCurrentTime() ?? 0;
  }

  getDuration(): number {
    return this.activeSource?.getDuration() ?? 0;
  }

  seekTo(time: number): void {
    this.activeSource?.seekTo(time);
  }

  onEnded(callback: () => void): void {
    // Set callback on both sources
    this.fileSource.onEnded(callback);
    this.youtubeSource.onEnded(callback);
  }

  onTimeUpdate(callback: (time: number) => void): void {
    // Set callback on both sources
    this.fileSource.onTimeUpdate(callback);
    this.youtubeSource.onTimeUpdate(callback);
  }
}
