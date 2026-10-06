import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudRequest, cloudResult } from '../src/lib/provider-server';
import { defaultSettings, endpointURL, parseAnalysis, settingsSchema } from '../src/lib/providers';
import { demoAnalysis } from '../src/lib/demo';
test('all cloud adapters send keys only to fixed provider hosts and parse their native responses', () => {
  const sample = demoAnalysis.square;
  const anthropic = cloudRequest('anthropic', 'model', 'test-key', 'image-bytes');
  assert.equal(new URL(anthropic.url).hostname, 'api.anthropic.com');
  assert.equal(anthropic.headers['x-api-key'], 'test-key');
  assert.deepEqual(
    cloudResult('anthropic', {
      content: [{ type: 'tool_use', name: 'record_clues', input: sample }],
    }),
    sample,
  );
  const openai = cloudRequest('openai', 'model', 'test-key', 'image-bytes');
  assert.equal(openai.headers.Authorization, 'Bearer test-key');
  assert.equal(new URL(openai.url).hostname, 'api.openai.com');
  assert.deepEqual(
    cloudResult('openai', { choices: [{ message: { content: JSON.stringify(sample) } }] }),
    sample,
  );
  const gemini = cloudRequest('gemini', 'model', 'test-key', 'image-bytes');
  assert.equal(gemini.headers['x-goog-api-key'], 'test-key');
  assert.ok(!gemini.url.includes('test-key'));
  assert.deepEqual(
    cloudResult('gemini', {
      candidates: [{ content: { parts: [{ text: JSON.stringify(sample) }] } }],
    }),
    sample,
  );
});
test('local URLs are loopback only and custom endpoints cannot leak keys via URL credentials or redirects', () => {
  assert.equal(
    endpointURL('http://localhost:11434/v1/', true),
    'http://localhost:11434/v1/chat/completions',
  );
  assert.throws(() => endpointURL('http://192.168.1.2:8000/v1', true));
  assert.throws(() => endpointURL('http://evil.example/v1', false));
  assert.throws(() => endpointURL('https://user:secret@example.com/v1', false));
  assert.throws(() => endpointURL('https://example.com/v1?api_key=secret', false));
});
test('config import validates schema, and incomplete provider results are rejected', () => {
  assert.deepEqual(
    settingsSchema.parse(JSON.parse(JSON.stringify(defaultSettings))),
    defaultSettings,
  );
  assert.throws(() => settingsSchema.parse({ ...defaultSettings, provider: 'untrusted' }));
  assert.throws(() => parseAnalysis({ summary: 'Incomplete', clues: [] }));
});
