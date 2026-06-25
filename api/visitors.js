const COUNTERAPI_NAMESPACE = 'ayushkhaitan';
const COUNTERAPI_NAME = 'footprint-visits';

async function incrementViaCounterApi() {
  const res = await fetch(
    `https://api.counterapi.dev/v1/${COUNTERAPI_NAMESPACE}/${COUNTERAPI_NAME}/up`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) {
    throw new Error(`counterapi responded ${res.status}`);
  }
  const data = await res.json();
  if (typeof data.count !== 'number') {
    throw new Error('counterapi returned invalid payload');
  }
  return data.count;
}

async function incrementCount() {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  if (hasUpstash) {
    const { Redis } = await import('@upstash/redis');
    const redis = Redis.fromEnv();
    return redis.incr('footprint:visitor-count');
  }

  return incrementViaCounterApi();
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
