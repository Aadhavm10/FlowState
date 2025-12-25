import { spawn } from 'child_process';
import { createReadStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for temporary storage (auto-cleaned on server restart)
const TEMP_DIR = '/tmp/flowstate-audio';

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Download audio from YouTube using yt-dlp
 * @param youtubeId - YouTube video ID
 * @param jobId - Unique job identifier
 * @returns Promise<string> - Path to downloaded audio file
 */
export async function downloadAudio(
  youtubeId: string,
  jobId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(TEMP_DIR, `${jobId}.webm`);

    console.log(`[yt-dlp] Starting download: ${youtubeId} -> ${outputPath}`);

    // yt-dlp command with optimized settings
    const ytdlp = spawn('yt-dlp', [
      '-x', // Extract audio
      '--audio-format', 'webm', // Use webm (faster, smaller than mp3)
      '--audio-quality', '0', // Best quality
      '-o', outputPath,
      '--no-playlist', // Don't download playlists
      '--no-warnings', // Suppress warnings
      '--no-check-certificate', // Skip certificate validation (some proxies)
      `https://www.youtube.com/watch?v=${youtubeId}`
    ]);

    let stderr = '';
    let stdout = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[yt-dlp] ${data.toString().trim()}`);
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`[yt-dlp] ${data.toString().trim()}`);
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        console.log(`[yt-dlp] Download completed: ${outputPath}`);
        resolve(outputPath);
      } else {
        const error = stderr || stdout || 'Unknown error';
        console.error(`[yt-dlp] Download failed (code ${code}): ${error}`);
        reject(new Error(`yt-dlp failed: ${error}`));
      }
    });

    ytdlp.on('error', (error) => {
      console.error(`[yt-dlp] Failed to spawn: ${error.message}`);
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });
  });
}

/**
 * Get read stream for audio file
 * @param filePath - Path to audio file
 * @returns ReadStream
 */
export function getAudioStream(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return createReadStream(filePath);
}

/**
 * Delete audio file from disk
 * @param filePath - Path to audio file
 */
export function deleteAudioFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`[cleanup] Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`[cleanup] Failed to delete file ${filePath}:`, error);
  }
}

/**
 * Clean up old audio files (> 5 minutes old)
 */
export function cleanupOldFiles(): void {
  try {
    const files = require('fs').readdirSync(TEMP_DIR);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    files.forEach((file: string) => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = require('fs').statSync(filePath);

      if (stats.mtimeMs < fiveMinutesAgo) {
        deleteAudioFile(filePath);
      }
    });
  } catch (error) {
    console.error('[cleanup] Failed to cleanup old files:', error);
  }
}
