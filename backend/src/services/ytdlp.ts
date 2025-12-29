import { spawn } from 'child_process';
import { createReadStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for temporary storage (auto-cleaned on server restart)
const TEMP_DIR = '/tmp/flowstate-audio';

// Cache directory for 30-second previews (persistent)
const CACHE_DIR = path.join(__dirname, '../../cache/previews');

// Ensure directories exist
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
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
    const outputPath = path.join(TEMP_DIR, `${jobId}.opus`);

    console.log(`[yt-dlp] Starting download: ${youtubeId} -> ${outputPath}`);

    // yt-dlp command with maximum bot evasion
    const ytdlp = spawn('yt-dlp', [
      '-x', // Extract audio
      '--audio-format', 'opus',
      '--audio-quality', '0',
      '-o', outputPath,
      '--no-playlist',

      // FIXED: Combine extractor args with semicolon separator
      '--extractor-args', 'youtube:player_client=ios;player_skip=webpage,configs;skip=hls',

      // Updated iOS user-agent (latest version as of Dec 2024)
      '--user-agent', 'com.google.ios.youtube/19.50.7 (iPhone16,2; U; CPU iOS 17_6_1 like Mac OS X)',

      // Additional bot evasion
      '--no-check-certificate',
      '--geo-bypass',
      '--sleep-interval', '1',        // Sleep 1 sec between fragments
      '--max-sleep-interval', '3',    // Random sleep up to 3 sec
      '--retries', '10',              // Retry up to 10 times on failure

      // Add referer header (makes requests look more legitimate)
      '--add-header', 'Referer:https://www.youtube.com/',

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

/**
 * Download and create 30-second MP3 preview
 * Caches result to avoid re-downloads
 * @param youtubeId - YouTube video ID
 * @returns Promise<string> - Path to cached 30s MP3 file
 */
export async function getPreview(youtubeId: string): Promise<string> {
  const previewPath = path.join(CACHE_DIR, `${youtubeId}.mp3`);

  // Check if already cached
  if (existsSync(previewPath)) {
    console.log(`[Preview] Cache hit: ${youtubeId}`);
    return previewPath;
  }

  console.log(`[Preview] Cache miss, downloading: ${youtubeId}`);

  // Download full track with yt-dlp, extract 30s as MP3
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '-x', // Extract audio
      '--audio-format', 'mp3', // Output as MP3 (not opus)
      '--audio-quality', '5', // Medium quality (smaller file size)
      '-o', previewPath,
      '--no-playlist',

      // Enhanced bot evasion
      '--extractor-args', 'youtube:player_client=ios;player_skip=webpage,configs;skip=hls',
      '--user-agent', 'com.google.ios.youtube/19.50.7 (iPhone16,2; U; CPU iOS 17_6_1 like Mac OS X)',
      '--no-check-certificate',
      '--geo-bypass',
      '--sleep-interval', '1',
      '--max-sleep-interval', '3',
      '--retries', '10',
      '--add-header', 'Referer:https://www.youtube.com/',

      // IMPORTANT: Only download first 30 seconds
      '--postprocessor-args', 'ffmpeg:-t 30', // Trim to 30 seconds

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
        console.log(`[Preview] Cached: ${previewPath}`);
        resolve(previewPath);
      } else {
        const error = stderr || stdout || 'Unknown error';
        console.error(`[Preview] Download failed (code ${code}): ${error}`);
        reject(new Error(`Preview creation failed: ${error}`));
      }
    });

    ytdlp.on('error', (error) => {
      console.error(`[Preview] Failed to spawn yt-dlp: ${error.message}`);
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });
  });
}

/**
 * Get read stream for cached preview
 * @param youtubeId - YouTube video ID
 * @returns ReadStream
 */
export async function streamPreview(youtubeId: string) {
  const previewPath = await getPreview(youtubeId);
  if (!existsSync(previewPath)) {
    throw new Error(`Preview not found: ${youtubeId}`);
  }
  return createReadStream(previewPath);
}
