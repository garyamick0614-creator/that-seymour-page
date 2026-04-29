// Scheduled: every 2h at :30. Re-tags the curated event list relative to today
// so "upcoming" / "past" buckets stay correct without anyone editing a file.
//
// The source-of-truth list lives at /data/events-source.json (a curated, dated list
// committed to the repo). This function partitions and label-formats it, then writes
// the result to /data/events.json via Blobs.
import { getStore } from '@netlify/blobs';

function fmtDate(iso) {
  // YYYY-MM-DD or full ISO → "Mon DD, YYYY"
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Indiana/Indianapolis' });
}
function relLabel(iso) {
  const target = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
  const days = Math.round((target - Date.now()) / (24 * 3600 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0)  return 'in ' + days + ' day' + (days === 1 ? '' : 's');
  return Math.abs(days) + ' days ago';
}

export default async () => {
  // Load the curated source list from the deployed site (it's checked into the repo at /data/events-source.json).
  let source;
  try {
    const r = await fetch(process.env.URL + '/data/events-source.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    source = await r.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'could not load events-source.json: ' + e }), { status: 502 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = (source.events || []).map(it => ({
    ...it,
    dateLabel: fmtDate(it.date) + ' · ' + relLabel(it.date),
    _t: new Date(it.date.length === 10 ? it.date + 'T12:00:00Z' : it.date).getTime()
  }));

  const upcoming = items.filter(it => it._t >= today.getTime()).sort((a, b) => a._t - b._t);
  const thirtyAgo = today.getTime() - 30 * 24 * 3600 * 1000;
  const past = items.filter(it => it._t < today.getTime() && it._t >= thirtyAgo).sort((a, b) => b._t - a._t);

  // Strip the helper field before publishing.
  const clean = arr => arr.map(({ _t, ...rest }) => rest);

  const snapshot = {
    updatedAt: new Date().toISOString(),
    counts: { upcoming: upcoming.length, past: past.length },
    upcoming: clean(upcoming),
    past: clean(past)
  };

  const data = getStore('seymour-data');
  await data.setJSON('events.json', snapshot);

  return new Response(JSON.stringify({ ok: true, counts: snapshot.counts }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
