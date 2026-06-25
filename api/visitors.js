const COUNTAPI_NAMESPACE = 'ayushkhaitan';
const COUNTAPI_KEY = 'footprint-visits';

async function incrementCount() {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  if (hasUpstash) {
    const { Redis } = await import('@upstash/redis');
    const redis = Redis.fromEnv();
    return redis.incr('footprint:visitor-count');
  }

  const res = await fetch(
    `https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${COUNTAPI_KEY}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) {
    throw new Error(`countapi responded ${res.status}`);
  }
  const data = await res.json();
  if (typeof data.value !== 'number') {
    throw new Error('countapi returned invalid payload');
  }
  return data.value;
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const count = await incrementCount();

    return Response.json(
      { count },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  } catch {
    return Response.json(
      { count: null, error: 'unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
