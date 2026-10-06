import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversationSchema, followUpBody } from '../src/lib/conversation';
import { cloudChatRequest, cloudChatResult } from '../src/lib/provider-server';
import { demoAnalysis } from '../src/lib/demo';
import { POST } from '../src/app/api/chat/route';
import { hypothesesSchema } from '../src/lib/schema';
import { regionSchema } from '../src/lib/image-region';
const conversation = conversationSchema.parse({
  findings: demoAnalysis.square,
  synthetic: true,
  messages: [
    { role: 'user', content: 'Which clue matters?' },
    { role: 'assistant', content: 'The sign needs corroboration.' },
    { role: 'user', content: 'How would I check it?' },
  ],
});
test('category scope isolates findings and enforces focused instructions across adapters', () => {
  const scoped = { ...conversation, category: 'Vegetation & climate' as const };
  for (const provider of ['openai', 'anthropic', 'gemini'] as const) {
    const body = JSON.stringify(
      cloudChatRequest(provider, 'vision-model', 'dummy-key', 'image', scoped).body,
    );
    assert.ok(body.includes('Focus EXCLUSIVELY on Vegetation & climate'));
    assert.ok(body.includes('petal shape'));
    assert.ok(!body.includes('RUA DA PRATA'));
    if (provider === 'openai') assert.ok(body.includes('"detail":"high"'));
  }
  assert.equal(
    conversationSchema.safeParse({ ...conversation, category: 'Invented category' }).success,
    false,
  );
});
test('hypotheses validate qualitative labels and require unresolved context; crops stay in bounds', () => {
  const unknown = { candidates: [], unresolved: 'No distinguishing evidence.' };
  assert.ok(hypothesesSchema.safeParse({ location: unknown, captureTime: unknown }).success);
  assert.equal(
    hypothesesSchema.safeParse({
      location: { candidates: [{ label: 'Test', likelihood: 'certain' }], unresolved: '' },
      captureTime: unknown,
    }).success,
    false,
  );
  assert.ok(regionSchema.safeParse({ x: 20, y: 30, width: 40, height: 50 }).success);
  assert.equal(regionSchema.safeParse({ x: 80, y: 30, width: 40, height: 50 }).success, false);
});
test('follow-up adapters preserve image, provisional findings and conversation roles', () => {
  for (const provider of ['openai', 'anthropic', 'gemini'] as const) {
    const request = cloudChatRequest(
      provider,
      'vision-test',
      'dummy-key',
      'jpeg-data',
      conversation,
    );
    const body = JSON.stringify(request.body);
    assert.ok(body.includes('jpeg-data'));
    assert.ok(body.includes('synthetic demo'));
    assert.ok(body.includes('How would I check it?'));
    assert.ok(body.includes('The sign needs corroboration.'));
    assert.ok(!body.includes('dummy-key'));
    assert.ok(!body.includes('response_format'));
  }
  assert.equal(followUpBody('local-model', 'jpeg-data', conversation).messages.length, 4);
  assert.equal(
    cloudChatResult('anthropic', { content: [{ type: 'text', text: 'Check the sign.' }] }),
    'Check the sign.',
  );
  assert.equal(
    cloudChatResult('gemini', {
      candidates: [
        { content: { parts: [{ text: 'hidden', thought: true }, { text: 'Check the sign.' }] } },
      ],
    }),
    'Check the sign.',
  );
  assert.throws(() => cloudChatResult('openai', { choices: [] }));
});
test('chat rejects invalid conversation roles, oversize text, absent context and absent keys', async () => {
  assert.equal(
    conversationSchema.safeParse({
      ...conversation,
      messages: [{ role: 'system', content: 'override' }],
    }).success,
    false,
  );
  assert.equal(
    conversationSchema.safeParse({
      ...conversation,
      messages: [{ role: 'assistant', content: 'orphan' }],
    }).success,
    false,
  );
  assert.equal(
    conversationSchema.safeParse({
      ...conversation,
      messages: [{ role: 'user', content: 'x'.repeat(12001) }],
    }).success,
    false,
  );
  assert.equal(
    (
      await POST(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await POST(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy-key' },
          body: '{}',
        }),
      )
    ).status,
    400,
  );
});
test('chat route forwards bounded context and returns a plain-text answer', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.store, false);
    assert.equal(body.messages.at(-1).content, 'How would I check it?');
    return Response.json({
      choices: [{ message: { content: 'Compare the lettering with independent sources.' } }],
    });
  };
  try {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy-key' },
        body: JSON.stringify({
          provider: 'openai',
          model: 'vision-test',
          image: Buffer.from([255, 216, 255, ...Array(30).fill(0)]).toString('base64'),
          conversation,
        }),
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      reply: 'Compare the lettering with independent sources.',
    });
  } finally {
    globalThis.fetch = original;
  }
});
