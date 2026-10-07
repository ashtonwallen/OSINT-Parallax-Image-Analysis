import { z } from 'zod';
import { ProviderResponseError } from './provider-errors';
import { rateLimit } from '@/lib/rate-limit';
import {
  cloudRequest,
  cloudResult,
  cloudChatRequest,
  cloudChatResult,
} from '@/lib/provider-server';
import { conversationSchema } from './conversation';
const reply = (body: unknown, status: number, headers = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const input = z
  .object({
    conversation: conversationSchema.optional(),
    provider: z.enum(['anthropic', 'openai', 'gemini']),
    model: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-zA-Z0-9._:/-]+$/),
    image: z
      .string()
      .min(20)
      .max(3_500_000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();
async function readBounded(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3_600_000) {
        await reader.cancel();
        throw new Error('large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handleAI(request: Request, chat: boolean) {
  if (process.env.DISABLE_CLOUD_AI === 'true')
    return reply(
      {
        error:
          'Cloud analysis is disabled by this deployment. Local and compatible endpoints can still be used directly.',
      },
      403,
    );
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return reply({ error: 'Cross-origin analysis is not allowed.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return reply({ error: 'Expected a JSON image request.' }, 415);
  const key = request.headers.get('authorization')?.match(/^Bearer ([^\s]{8,4096})$/)?.[1];
  if (!key)
    return reply(
      { error: 'Add your provider API key in Provider settings. No server-owned key is used.' },
      401,
    );
  let data: z.infer<typeof input>;
  try {
    data = input.parse(await readBounded(request));
    if (chat !== Boolean(data.conversation)) throw new Error('Invalid request mode');
  } catch {
    return reply({ error: 'Invalid provider, model or image request.' }, 400);
  }
  const bytes = Buffer.from(data.image, 'base64');
  if (bytes.length > 2_625_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
    return reply({ error: 'A valid JPEG image under 2.5 MB is required.' }, 400);
  try {
    const limit = await rateLimit(request);
    if (!limit.success)
      return reply({ error: 'Analysis limit reached. Try again in a few minutes.' }, 429, {
        'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
      });
  } catch {
    return reply({ error: 'The request limiter is unavailable. Please retry later.' }, 503);
  }
  const deadline = AbortSignal.timeout(180_000);
  let stage: 'request' | 'response' = 'request';
  try {
    const upstream = data.conversation
      ? cloudChatRequest(data.provider, data.model, key, data.image, data.conversation)
      : cloudRequest(data.provider, data.model, key, data.image);
    const response = await fetch(upstream.url, {
      method: 'POST',
      headers: upstream.headers,
      body: JSON.stringify(upstream.body),
      signal: AbortSignal.any([request.signal, deadline]),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'The provider rejected this model or image request. Check vision and JSON-output support.',
        401: 'The provider rejected your API key.',
        403: 'Your key does not have access to this model.',
        404: 'The provider could not find this model. Check the model ID.',
        429: 'The provider quota or rate limit was reached. Check your account billing and limits.',
      };
      return reply(
        {
          error:
            messages[response.status] ||
            `The provider returned HTTP ${response.status}. Retry later.`,
        },
        response.status === 429 ? 429 : 502,
      );
    }
    stage = 'response';
    const result = await response.json();
    return reply(
      chat ? { reply: cloudChatResult(data.provider, result) } : cloudResult(data.provider, result),
      200,
    );
  } catch (error) {
    if (request.signal.aborted)
      return reply({ code: 'cancelled', error: 'Analysis cancelled.' }, 499);
    if (deadline.aborted || (error instanceof Error && error.name === 'TimeoutError'))
      return reply(
        {
          code: 'timeout',
          error:
            'The provider did not finish within three minutes. Try a faster vision model or a focused category inspection.',
        },
        504,
      );
    if (error instanceof ProviderResponseError)
      return reply({ code: error.code, error: error.message }, 502);
    if (stage === 'request')
      return reply(
        {
          code: 'connection',
          error:
            'Could not reach the provider. Check your connection or the provider status and retry.',
        },
        502,
      );
    if (error instanceof SyntaxError)
      return reply(
        {
          code: 'invalid_json',
          error:
            'The provider returned invalid JSON. Retry analysis or choose a vision model with reliable structured output.',
        },
        502,
      );
    return reply(
      {
        code: 'invalid_format',
        error:
          'The provider response did not match the required findings format. Retry analysis or choose a model with structured-output support.',
      },
      502,
    );
  }
}
