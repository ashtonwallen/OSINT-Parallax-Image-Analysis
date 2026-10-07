import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProviderResponse, ProviderResponseError } from '../src/lib/provider-errors';
import { parseAnalysis } from '../src/lib/providers';
import { demoAnalysis } from '../src/lib/demo';
import { POST, maxDuration } from '../src/app/api/analyze/route';

test('provider stop reasons distinguish output limits from refusals', () => {
  for (const [provider, body] of [
    ['anthropic', { stop_reason: 'max_tokens' }],
    ['gemini', { candidates: [{ finishReason: 'MAX_TOKENS' }] }],
    ['openai', { choices: [{ finish_reason: 'length' }] }],
  ] as const)
    assert.throws(
      () => checkProviderResponse(provider, body),
      (error: unknown) => error instanceof ProviderResponseError && error.code === 'output_limit',
    );
  assert.throws(
    () => checkProviderResponse('gemini', { promptFeedback: { blockReason: 'SAFETY' } }),
    (error: unknown) => error instanceof ProviderResponseError && error.code === 'blocked',
  );
  assert.throws(
    () => checkProviderResponse('openai', { choices: [{ message: { refusal: 'No' } }] }),
    ProviderResponseError,
  );
});
test('invalid optional hypotheses do not discard validated clues; invalid clues still fail', () => {
  const result = parseAnalysis({
    ...demoAnalysis.square,
    hypotheses: { location: null },
    clues: demoAnalysis.square.clues.map((clue) => ({ ...clue, language: null })),
  });
  assert.equal(result.clues.length, 6);
  assert.equal(result.hypotheses, undefined);
  assert.equal(result.warnings?.length, 1);
  assert.equal(parseAnalysis(result).warnings?.length, 1);
  assert.throws(() => parseAnalysis({ ...demoAnalysis.square, clues: [{ category: 'invented' }] }));
});
test('route differentiates deadlines, malformed JSON, schema failures and truncated output', async () => {
  assert.equal(maxDuration, 240);
  const original = globalThis.fetch;
  const request = () =>
    new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy-error-test' },
      body: JSON.stringify({
        provider: 'openai',
        model: 'test-model',
        image: Buffer.from([255, 216, 255, ...Array(30).fill(0)]).toString('base64'),
      }),
    });
  try {
    globalThis.fetch = async () => {
      throw new DOMException('Timed out', 'TimeoutError');
    };
    let response = await POST(request());
    assert.equal(response.status, 504);
    assert.equal((await response.json()).code, 'timeout');
    globalThis.fetch = async () =>
      Response.json({ choices: [{ finish_reason: 'length', message: { content: '{' } }] });
    response = await POST(request());
    assert.equal((await response.json()).code, 'output_limit');
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: '{' } }] });
    response = await POST(request());
    assert.equal((await response.json()).code, 'invalid_json');
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: '{}' } }] });
    response = await POST(request());
    assert.equal((await response.json()).code, 'invalid_format');
  } finally {
    globalThis.fetch = original;
  }
});
