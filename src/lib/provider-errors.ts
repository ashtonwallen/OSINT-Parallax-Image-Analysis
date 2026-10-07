import { z } from 'zod';

export class ProviderResponseError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const metadata = z.object({
  stop_reason: z.string().nullish(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z.array(z.object({ finishReason: z.string().optional() })).optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ refusal: z.string().nullish() }).optional(),
      }),
    )
    .optional(),
});
export function checkProviderResponse(provider: string, data: unknown) {
  const parsed = metadata.safeParse(data);
  if (!parsed.success) return;
  const result = parsed.data;
  const reason =
    provider === 'anthropic'
      ? result.stop_reason
      : provider === 'gemini'
        ? result.candidates?.[0]?.finishReason
        : result.choices?.[0]?.finish_reason;
  if (['max_tokens', 'MAX_TOKENS', 'length'].includes(reason || ''))
    throw new ProviderResponseError(
      'output_limit',
      'The model reached its output limit before finishing. Try a narrower category inspection or a model with a larger output budget.',
    );
  if (
    result.promptFeedback?.blockReason ||
    result.choices?.[0]?.message?.refusal ||
    [
      'refusal',
      'SAFETY',
      'RECITATION',
      'BLOCKLIST',
      'PROHIBITED_CONTENT',
      'IMAGE_SAFETY',
      'content_filter',
    ].includes(reason || '')
  )
    throw new ProviderResponseError(
      'blocked',
      'The provider declined this image or request. Try another image or review the provider restrictions.',
    );
}
