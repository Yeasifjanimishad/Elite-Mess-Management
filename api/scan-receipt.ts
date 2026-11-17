import {
  createGeminiClient,
  parseGeminiError,
  runReceiptScan,
} from './_gemini.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const ai = createGeminiClient();
  if (!ai) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in your hosting environment variables.',
    });
    return;
  }

  let body: { imageDataUrl?: string; language?: string } = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  const { imageDataUrl, language } = body;
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.status(400).json({ error: 'Receipt image is required.' });
    return;
  }

  try {
    const data = await runReceiptScan(ai, imageDataUrl, language);
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const { status, message } = parseGeminiError(err, 'Failed to scan receipt.');
    console.error('[api/scan-receipt] Error:', message);
    res.status(status).json({ error: message });
  }
}
