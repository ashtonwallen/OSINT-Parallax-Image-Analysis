import { followUpBody, replySchema, type Conversation } from './conversation';
import { asset } from './schema';
import { checkProviderResponse } from './provider-errors';
import {
  chatBody,
  configurationError,
  endpointURL,
  parseAnalysis,
  type ProviderSettings,
} from './providers';
async function requestImage(
  settings: ProviderSettings,
  image: string,
  signal: AbortSignal,
  conversation?: Conversation,
) {
  const error = configurationError(settings);
  if (error) throw new Error(error);
  const { provider } = settings;
  const profile = settings.profiles[provider];
  const direct = provider === 'local' || provider === 'compatible';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (profile.apiKey.trim()) headers.Authorization = `Bearer ${profile.apiKey.trim()}`;
  const deadline = AbortSignal.timeout(210_000);
  let response: Response;
  try {
    response = await fetch(
      direct
        ? endpointURL(profile.endpoint, provider === 'local')
        : asset(conversation ? '/api/chat' : '/api/analyze'),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(
          direct
            ? conversation
              ? followUpBody(profile.model, image, conversation)
              : chatBody(profile.model, image)
            : { image, provider, model: profile.model, ...(conversation ? { conversation } : {}) },
        ),
        signal: AbortSignal.any([signal, deadline]),
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      },
    );
  } catch (error) {
    if (signal.aborted) throw error;
    if (deadline.aborted)
      throw new Error(
        'The request timed out while waiting for the provider. Try a faster vision model.',
      );
    throw new Error(
      direct
        ? 'Cannot reach this endpoint. Check that the server is running, its CORS policy allows this site, and the browser allows local-network access. HTTPS sites may require an HTTPS endpoint.'
        : 'Could not reach the analysis service. Check your connection and retry.',
    );
  }
  if (direct && !response.ok)
    throw new Error(
      `Provider returned HTTP ${response.status}. Check the key, endpoint, model and vision support.`,
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.status === 504
        ? 'The hosting service timed out. Check that Vercel Fluid Compute is enabled and redeploy the latest code.'
        : `The service returned an unreadable response (HTTP ${response.status}). Retry in a moment.`,
    );
  }
  if (!response.ok) throw new Error(data.error || 'Analysis failed.');
  if (direct) checkProviderResponse('openai', data);
  if (conversation) {
    const parsed = replySchema.safeParse(direct ? data.choices?.[0]?.message?.content : data.reply);
    if (!parsed.success)
      throw new Error(
        'The model returned an empty or unsupported reply. Retry your question or choose another vision model.',
      );
    return parsed.data;
  }
  try {
    return parseAnalysis(direct ? data.choices?.[0]?.message?.content : data);
  } catch {
    throw new Error(
      'The model did not return complete visual-clue JSON. Choose a vision-capable model that supports JSON output.',
    );
  }
}

export async function analyzeImage(settings: ProviderSettings, image: string, signal: AbortSignal) {
  return (await requestImage(settings, image, signal)) as import('./schema').Analysis;
}
export async function askAboutImage(
  settings: ProviderSettings,
  image: string,
  conversation: Conversation,
  signal: AbortSignal,
) {
  return (await requestImage(settings, image, signal, conversation)) as string;
}
