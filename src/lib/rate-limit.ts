import { createHmac } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
const buckets = new Map<string, { count: number; reset: number }>();
let distributed: Ratelimit | undefined;
export async function rateLimit(request: Request) {
  const configured =
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.RATE_LIMIT_SALT;
  if (process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true' && !configured)
    throw new Error('Rate limit is not configured');
  // Vercel overwrites this header at its trusted proxy. Never trust arbitrary X-Forwarded-For.
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : 'local';
  const key = createHmac('sha256', process.env.RATE_LIMIT_SALT || 'development-only')
    .update(ip)
    .digest('hex');
  if (configured) {
    distributed ||= new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'parallax:analysis',
      analytics: false,
    });
    const result = await distributed.limit(key);
    return { success: result.success, reset: result.reset };
  }
  const now = Date.now();
  for (const [id, value] of buckets) if (value.reset <= now) buckets.delete(id);
  const bucket = buckets.get(key) || { count: 0, reset: now + 600_000 };
  bucket.count++;
  buckets.set(key, bucket);
  return { success: bucket.count <= 5, reset: bucket.reset };
}
