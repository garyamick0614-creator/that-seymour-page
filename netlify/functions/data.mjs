// Public read for /data/*.json. The scheduled refreshers write to Netlify Blobs;
// this function serves the latest snapshot. If a Blob isn't there yet (first run),
// it falls back to the static seed checked into the repo.
import { getStore } from '@netlify/blobs';

const ALLOWED = new Set(['weather.json', 'news.json', 'events.json']);

export default async (req) => {
  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();
  if (!ALLOWED.has(file)) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const data = getStore('seymour-data');
  let body = await data.get(file, { type: 'json' });

  if (!body) {
    // Fallback to the seeded copy in the deployed static folder.
    try {
      const r = await fetch((process.env.URL || '') + '/data/_seed/' + file, { cache: 'no-store' });
      if (r.ok) body = await r.json();
    } catch {}
  }

  if (!body) {
    return new Response(JSON.stringify({ error: 'not yet populated' }), { status: 503 });
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60'
    }
  });
};

export const config = {
  path: ['/data/weather.json', '/data/news.json', '/data/events.json']
};
