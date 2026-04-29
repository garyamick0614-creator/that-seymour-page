// Shared helpers for Seymour Hub functions.
import { createHash } from 'node:crypto';

const ADJ = [
  'Quiet','Bright','Brave','Calm','Clever','Curious','Eager','Fancy','Gentle','Happy',
  'Honest','Jolly','Keen','Kind','Lively','Loyal','Lucky','Merry','Mighty','Modest',
  'Noble','Plucky','Polite','Proud','Quick','Sharp','Silent','Steady','Stout','Sunny',
  'Swift','Thoughtful','True','Wary','Witty','Zesty','Amber','Cobalt','Crimson','Indigo',
  'Bronze','Copper','Pewter','Russet','Hazel','Misty','Frosty','Sandy','Stormy','Sunlit'
];

const NOUN = [
  'Pelican','Otter','Sparrow','Heron','Falcon','Owl','Hawk','Wren','Swallow','Raven',
  'Catbird','Cardinal','Bluejay','Robin','Goldfinch','Chickadee','Mallard','Egret','Loon','Sandpiper',
  'Beaver','Fox','Deer','Coyote','Raccoon','Possum','Squirrel','Mink','Bobcat','Hare',
  'Sycamore','Oak','Maple','Hickory','Walnut','Cedar','Birch','Willow','Pine','Aspen',
  'River','Creek','Hollow','Ridge','Meadow','Prairie','Bluff','Crossing','Junction','Lantern'
];

// Stable, daily-rotating handle from IP+UA. Returns "Adj-Noun-NNN".
export function handleFromRequest(req) {
  const ip = (req.headers['x-nf-client-connection-ip']
            || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['client-ip']
            || 'unknown').toString();
  const ua = (req.headers['user-agent'] || '').toString();
  // Daily salt: same handle for the same person across the day; rotates at UTC midnight.
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.HANDLE_SALT || 'seymour-hub-default-salt';
  const seed = createHash('sha256').update(ip + '|' + ua + '|' + day + '|' + salt).digest();
  const a = ADJ[seed[0] % ADJ.length];
  const n = NOUN[seed[1] % NOUN.length];
  const num = (seed[2] << 8 | seed[3]) % 1000;
  return { handle: `${a}-${n}-${String(num).padStart(3,'0')}`, ipHash: seed.slice(4, 12).toString('hex') };
}

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export function badRequest(msg) {
  return jsonResponse({ error: msg }, { status: 400 });
}

export function getHeader(req, name) {
  if (typeof req.headers?.get === 'function') return req.headers.get(name);
  return req.headers?.[name.toLowerCase()];
}

// Reverse "headers as object" used in older handler signatures.
export function headersAsObject(req) {
  if (typeof req.headers?.get !== 'function') return req.headers || {};
  const out = {};
  for (const [k, v] of req.headers.entries()) out[k.toLowerCase()] = v;
  return out;
}
