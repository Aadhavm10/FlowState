import type { VercelRequest, VercelResponse } from '@vercel/node';
import { corsHeaders } from './utils/cors';

/**
 * Proxy requests to backend to avoid mixed content issues
 * HTTPS (Vercel) → HTTPS (this proxy) → HTTPS (HF Spaces backend)
 *
 * Environment variable required:
 * - BACKEND_URL: Hugging Face Spaces endpoint URL
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get backend URL from environment variable
  const BACKEND_URL = process.env.BACKEND_URL || 'https://aadhavm10-flowstate.hf.space';

  // Extract the path to proxy (e.g., preview/abc123, health, download, etc.)
  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : path || '';
  const targetUrl = `${BACKEND_URL}/api/${targetPath}`;

  console.log(`[Library Proxy] ${req.method} ${targetUrl}`);

  try {
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    // For audio streams (preview endpoint), pipe binary data
    if (targetPath.startsWith('preview/')) {
      const arrayBuffer = await proxyResponse.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(proxyResponse.status).send(Buffer.from(arrayBuffer));
    }

    // For JSON responses (health, download, status, etc.)
    const data = await proxyResponse.json();
    return res.status(proxyResponse.status).json(data);
  } catch (error) {
    console.error('[Library Proxy] Error:', error);
    return res.status(500).json({
      error: 'Backend proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
