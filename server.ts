import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const RECEIPT_MODEL = 'gemini-4-hydrogen';

const allowedUnits = ['kg', 'Liter', 'pcs', 'Dozen', 'Packets', 'Bags', 'Other'] as const;

interface ParsedReceiptPayload {
  items: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  notes: string;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function resolveImageToInlineData(imageInput: string): Promise<{ mimeType: string; data: string }> {
  const trimmed = imageInput.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const imgResp = await fetch(trimmed);
    if (!imgResp.ok) {
      throw new Error(`Could not fetch receipt image URL (HTTP ${imgResp.status}).`);
    }
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) {
      throw new Error('The provided URL did not return an image.');
    }
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  }

  throw new Error('Unsupported receipt image format. Please upload or capture an image first.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()) });
  });

  app.post('/api/scan-receipt', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const { imageDataUrl, language } = (req.body || {}) as {
      imageDataUrl?: string;
      language?: string;
    };

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      res.status(400).json({ error: 'Receipt image is required.' });
      return;
    }

    try {
      const inlineData = await resolveImageToInlineData(imageDataUrl);
      const preferBangla = language === 'Bangla';

      const prompt = [
        'Analyze this grocery / bazaar receipt or purchase photo for a shared mess/hostel expense tracker.',
        'Extract the purchase summary into structured JSON fields:',
        '- items: concise comma-separated list of purchased items (if handwritten or printed receipt in English or Bangla, summarize clearly).',
        '- quantity: total numeric quantity (use 1 if multiple mixed items or unclear).',
        `- unit: pick the single best unit from [${allowedUnits.join(', ')}] (use "Bags" or "kg" or "pcs" for mixed groceries).`,
        '- price: unit rate / price per unit as a positive number (if mixed items with total only, set price equal to total and quantity to 1).',
        '- total: grand total amount paid on the receipt as a positive number.',
        `- notes: brief itemized breakdown, shop name, or date if visible (${preferBangla ? 'may include Bangla/English item names' : 'in English'}).`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: RECEIPT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              price: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              notes: { type: Type.STRING },
            },
            required: ['items', 'quantity', 'unit', 'price', 'total', 'notes'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('AI returned an empty response for this image.');
      }

      const parsed = JSON.parse(rawText) as Partial<ParsedReceiptPayload>;
      const safeQuantity = Number(parsed.quantity) > 0 ? Number(parsed.quantity) : 1;
      const safeTotal = Number(parsed.total) > 0 ? Number(parsed.total) : Number(parsed.price) > 0 ? Number(parsed.price) * safeQuantity : 0;
      const safePrice =
        Number(parsed.price) > 0
          ? Number(parsed.price)
          : safeTotal > 0
          ? Number((safeTotal / safeQuantity).toFixed(2))
          : 0;
      const safeUnit = allowedUnits.includes((parsed.unit || '') as (typeof allowedUnits)[number])
        ? String(parsed.unit)
        : 'kg';

      res.json({
        success: true,
        data: {
          items: String(parsed.items || '').trim() || 'Grocery Items',
          quantity: safeQuantity,
          unit: safeUnit,
          price: safePrice,
          total: safeTotal,
          notes: String(parsed.notes || '').trim(),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to scan receipt.';
      console.error('[scan-receipt] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
