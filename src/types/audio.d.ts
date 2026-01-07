/**
 * Audio source abstraction for file uploads and YouTube
 */
export interface AudioSource {
  type: 'file' | 'youtube';
  connect(analyser: AnalyserNode): void;
  disconnect(): void;
  play(): Promise<void>;
  pause(): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(time: number): void;
  onEnded(callback: () => void): void;
  onTimeUpdate(callback: (time: number) => void): void;
}

/**
 * Audio analysis metrics
 */
export interface AudioMetrics {
  energy: number;           // 0-1, overall energy level
  tempo: number;            // BPM estimate
  spectralCentroid: number; // Brightness measure
  rms: number;              // Root mean square amplitude
}
