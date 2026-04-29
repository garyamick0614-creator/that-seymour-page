// Scheduled: every 2h at :15. Pulls public RSS feeds for Indiana / US / Global headlines,
// parses items, and writes a digest to Netlify Blobs at /data/news.json.
//
// Sources:
//   Indiana: The Republic (Columbus) + Indiana Public Media news + IndyStar local-IN feed
//   US:      NPR national + AP top
//   Global:  BBC World + Reuters World
import { getStore } from '@netlify/blobs';

const UA = 'SeymourHub/1.0 (gary.amick0614@gmail.com)';

const SOURCES = {
  indiana: [
    { name: 'The Republic',          url: 'https://www.therepublic.com/feed/' },
    { name: 'Indiana Public Media',  url: 'https://indianapublicmedia.org/news/feed' },
    { name: 'WIBC',                  url: 'https://wibc.com/feed/' }
  ],
  us: [
    { name: 'NPR',                   url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'AP Top',                url: 'https://feeds.feedburner.com/TopAPNews' }
  ],
  global: [
    { name: 'BBC World',             url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Al Jazeera',            url: 'https://www.aljazeera.com/xml/rss/all.xml' }
  ]
};

// Minimal RSS/Atom item extractor — handles the two real-world shapes we hit
// without dragging in a parsing dep.
function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}
function pickTag(blob, tag) {
  const m = blob.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1] : '';
}
function pickHref(blob) {
  const m = blob.match(/<link[^>]*href="([^"]+)"/i);
  return m ? m[1] : '';
}
function parseFeed(xml, sourceName) {
  const items = [];
  // RSS <item>
  const rssRe = /<item\b[\s\S]*?<\/item>/gi;
  // Atom <entry>
  const atomRe = /<entry\b[\s\S]*?<\/entry>/gi;
  const blocks = (xml.match(rssRe) || []).concat(xml.match(atomRe) || []);
  for (const b of blocks) {
    const title = decodeEntities(pickTag(b, 'title'));
    let link = decodeEntities(pickTag(b, 'link'));
    if (!link) link = pickHref(b);
    const description = decodeEntities(pickTag(b, 'description') || pickTag(b, 'summary')).slice(0, 320);
    const pubRaw = pickTag(b, 'pubDate') || pickTag(b, 'updated') || pickTag(b, 'published');
    const pubDate = pubRaw ? new Date(pubRaw).toISOString() : null;
    if (title && link) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }
  return items;
}
function timeAgoLabel(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

async function fetchOne(src) {
  try {
    const r = await fetch(src.url, { headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' } });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseFeed(xml, src.name);
  } catch (e) {
    return [];
  }
}

async function fetchBucket(srcs) {
  const all = (await Promise.all(srcs.map(fetchOne))).flat();
  // Dedupe by link, keep newest first.
  const byLink = new Map();
  for (const it of all) {
    const k = it.link;
    if (!byLink.has(k)) byLink.set(k, it);
  }
  const list = Array.from(byLink.values())
    .sort((a, b) => (new Date(b.pubDate || 0)) - (new Date(a.pubDate || 0)))
    .slice(0, 24)
    .map(it => ({ ...it, pubDateLabel: timeAgoLabel(it.pubDate) }));
  return list;
}

export default async () => {
  const [indiana, us, global] = await Promise.all([
    fetchBucket(SOURCES.indiana),
    fetchBucket(SOURCES.us),
    fetchBucket(SOURCES.global)
  ]);

  const snapshot = {
    updatedAt: new Date().toISOString(),
    counts: { indiana: indiana.length, us: us.length, global: global.length },
    indiana, us, global
  };

  const data = getStore('seymour-data');
  await data.setJSON('news.json', snapshot);

  return new Response(JSON.stringify({ ok: true, counts: snapshot.counts }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
