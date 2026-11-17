import { ThinkingLevel } from '@google/genai';
import {
  FAST_TEXT_MODEL,
  buildAssistantSystemInstruction,
  createGeminiClient,
  formatAssistantContents,
  parseGeminiError,
  sanitizeContextForRole,
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

  let body: {
    messages?: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
    stream?: boolean;
  } = {};

  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  const { messages, context, stream } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'At least one message is required.' });
    return;
  }

  const sanitizedContext = sanitizeContextForRole(context);
  const systemInstruction = buildAssistantSystemInstruction(sanitizedContext);
  const formattedContents = formatAssistantContents(messages);
  const wantStream = Boolean(stream) || String(req.headers?.accept || '').includes('text/event-stream');

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
      console.error('[api/ai-assistant stream] Error:', message);
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

    res.status(200).json({ success: true, reply });
  } catch (err: unknown) {
    const { status, message } = parseGeminiError(err, 'AI assistant failed to respond.');
    console.error('[api/ai-assistant] Error:', message);
    res.status(status).json({ error: message });
  }
}
