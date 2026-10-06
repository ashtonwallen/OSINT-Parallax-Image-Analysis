import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/lib/rate-limit';
test('local limiter accepts five requests and rejects the sixth', async () => {
  for (let i = 0; i < 5; i++)
    assert.equal((await rateLimit(new Request('http://localhost'))).success, true);
  assert.equal((await rateLimit(new Request('http://localhost'))).success, false);
});
