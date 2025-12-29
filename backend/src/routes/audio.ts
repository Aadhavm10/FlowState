import express from 'express';
import { downloadAudio, getAudioStream, deleteAudioFile, streamPreview } from '../services/ytdlp.js';

const router = express.Router();

// In-memory store for download jobs
// Note: This will reset on server restart (intentional - temp storage)
interface DownloadJob {
  status: 'pending' | 'downloading' | 'completed' | 'error';
  filePath?: string;
  error?: string;
  createdAt: number;
}

const downloadJobs = new Map<string, DownloadJob>();

// Cleanup old jobs periodically (every minute)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  let cleaned = 0;

  for (const [jobId, job] of downloadJobs.entries()) {
    if (job.createdAt < fiveMinutesAgo) {
      // Delete file if it exists
      if (job.filePath) {
        deleteAudioFile(job.filePath);
      }
      downloadJobs.delete(jobId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[cleanup] Removed ${cleaned} old job(s)`);
  }
}, 60000); // Run every 60 seconds

/**
 * POST /api/download
 * Initiate YouTube audio download
 *
 * Request body: { youtubeId: string }
 * Response: { jobId, status, pollUrl, streamUrl }
 */
router.post('/download', async (req, res) => {
  try {
    const { youtubeId } = req.body;

    if (!youtubeId || typeof youtubeId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid youtubeId parameter'
      });
    }

    // Generate unique job ID
    const jobId = `${youtubeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job
    downloadJobs.set(jobId, {
      status: 'pending',
      createdAt: Date.now()
    });

    console.log(`[job-${jobId}] Initiating download for YouTube ID: ${youtubeId}`);

    // Start download asynchronously (don't await)
    downloadAudio(youtubeId, jobId)
      .then((filePath) => {
        const job = downloadJobs.get(jobId);
        if (job) {
          job.status = 'completed';
          job.filePath = filePath;
          console.log(`[job-${jobId}] Download completed: ${filePath}`);
        }
      })
      .catch((error) => {
        const job = downloadJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = error.message;
          console.error(`[job-${jobId}] Download failed: ${error.message}`);
        }
      });

    // Respond immediately with job details
    res.json({
      jobId,
      status: 'pending',
      pollUrl: `/api/status/${jobId}`,
      streamUrl: `/api/stream/${jobId}`
    });
  } catch (error: any) {
    console.error('[download] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/status/:jobId
 * Check download job status
 *
 * Response: { status, filePath?, error? }
 */
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Invalid job ID or job has expired (> 5 minutes)'
      });
    }

    res.json({
      status: job.status,
      filePath: job.filePath,
      error: job.error
    });
  } catch (error: any) {
    console.error('[status] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/stream/:jobId
 * Stream audio file once download is complete
 *
 * Response: Audio stream (audio/webm)
 */
router.get('/stream/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Invalid job ID or job has expired (> 5 minutes)'
      });
    }

    if (job.status === 'error') {
      return res.status(500).json({
        error: 'Download failed',
        message: job.error || 'Unknown error'
      });
    }

    if (job.status !== 'completed' || !job.filePath) {
      return res.status(202).json({
        status: job.status,
        message: 'Download still in progress. Please poll /api/status/:jobId'
      });
    }

    console.log(`[stream] Streaming file: ${job.filePath}`);

    // Get audio stream
    const stream = getAudioStream(job.filePath);

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for audio

    // Pipe stream to response
    stream.pipe(res);

    // Cleanup after streaming completes
    stream.on('end', () => {
      console.log(`[stream] Stream completed for job ${jobId}`);
      // Delete file after streaming
      setTimeout(() => {
        if (job.filePath) {
          deleteAudioFile(job.filePath);
        }
        downloadJobs.delete(jobId);
      }, 1000); // Small delay to ensure stream finishes
    });

    stream.on('error', (error) => {
      console.error(`[stream] Error streaming file:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream error',
          message: error.message
        });
      }
    });
  } catch (error: any) {
    console.error('[stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/preview/:youtubeId
 * Stream 30-second MP3 preview (cached)
 *
 * Response: Audio stream (audio/mpeg)
 */
router.get('/preview/:youtubeId', async (req, res) => {
  try {
    const { youtubeId } = req.params;

    if (!youtubeId || typeof youtubeId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid youtubeId parameter'
      });
    }

    console.log(`[Preview] Streaming preview: ${youtubeId}`);

    // Get cached preview or download if needed
    const stream = await streamPreview(youtubeId);

    // Set headers for MP3 streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS

    // Pipe stream to response
    stream.pipe(res);

    stream.on('end', () => {
      console.log(`[Preview] Stream complete: ${youtubeId}`);
    });

    stream.on('error', (error) => {
      console.error(`[Preview] Stream error: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream failed',
          message: error.message
        });
      }
    });

  } catch (error: any) {
    console.error('[Preview] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to get preview',
        message: error.message
      });
    }
  }
});

export default router;
