import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ThinkingLevel } from '@google/genai';
import {
  FAST_TEXT_MODEL,
  buildAssistantSystemInstruction,
  createGeminiClient,
  formatAssistantContents,
  parseGeminiError,
  runReceiptScan,
  sanitizeContextForRole,
} from './api/_gemini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

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
      const data = await runReceiptScan(ai, imageDataUrl, language);
      res.json({ success: true, data });
    } catch (err: unknown) {
      const { status, message } = parseGeminiError(err, 'Failed to scan receipt.');
      console.error('[scan-receipt] Error:', message);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai-assistant', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const { messages, context, stream } = (req.body || {}) as {
      messages?: Array<{ role: string; content: string }>;
      context?: Record<string, unknown>;
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'At least one message is required.' });
      return;
    }

    const wantStream = Boolean(stream) || req.headers.accept?.includes('text/event-stream');
    const sanitizedContext = sanitizeContextForRole(context);
    const systemInstruction = buildAssistantSystemInstruction(sanitizedContext);
    const formattedContents = formatAssistantContents(messages);

    if (wantStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      try {
        const streamResp = await ai.models.generateContentStream({
          model: FAST_TEXT_MODEL,
          contents: formattedContents,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            systemInstruction,
          },
        });

        let hasContent = false;
        for await (const chunk of streamResp) {
          const text = chunk.text;
          if (text) {
            hasContent = true;
            res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }
        }

        if (!hasContent) {
          res.write(`data: ${JSON.stringify({ error: 'AI returned an empty response.' })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        res.end();
      } catch (err: unknown) {
        const { message } = parseGeminiError(err, 'AI assistant failed to respond.');
        console.error('[ai-assistant stream] Error:', message);
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: FAST_TEXT_MODEL,
        contents: formattedContents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          systemInstruction,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('AI returned an empty response.');
      }

      res.json({ success: true, reply });
    } catch (err: unknown) {
      const { status, message } = parseGeminiError(err, 'AI assistant failed to respond.');
      console.error('[ai-assistant] Error:', message);
      res.status(status).json({ error: message });
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
