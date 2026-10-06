import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/app/api/analyze/route';
import { demoAnalysis } from '../src/lib/demo';

test('route requires a visitor key and never falls back to environment credentials', async () => {
  const response = await POST(
    new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('route rejects cross-origin requests and malformed content', async () => {
  assert.equal(
    (
      await POST(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { origin: 'https://other.example' },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await POST(new Request('http://localhost/api/analyze', { method: 'POST' }))).status,
    415,
  );
});
test('route passes a visitor key to the selected provider and returns validated findings without the key', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      'Bearer dummy-key-for-test',
    );
    return Response.json({
      choices: [{ message: { content: JSON.stringify(demoAnalysis.square) } }],
    });
  };
  try {
    const response = await POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy-key-for-test' },
        body: JSON.stringify({
          provider: 'openai',
          model: 'test-model',
          image: Buffer.from([255, 216, 255, ...Array(30).fill(0)]).toString('base64'),
        }),
      }),
    );
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(!body.includes('dummy-key-for-test'));
    assert.equal(JSON.parse(body).clues.length, 6);
  } finally {
    globalThis.fetch = original;
  }
});
