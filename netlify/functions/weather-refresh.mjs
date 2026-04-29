// Scheduled: every 2h, on the hour. Pulls the NWS Seymour, IN forecast and writes it to Netlify Blobs
// at the public path /data/weather.json (served via the public-data redirect).
//
// NWS API: https://www.weather.gov/documentation/services-web-api
// Endpoint chain: /points/{lat,lon} → forecast + forecastHourly + alerts(zone or county)
//
// Coordinates: Seymour, IN — 38.9556, -85.8900 (Jackson County, IN — county code INC071).
import { getStore } from '@netlify/blobs';

const UA = 'SeymourHub/1.0 (gary.amick0614@gmail.com; +https://seymour-hub.netlify.app)';
const POINT_URL = 'https://api.weather.gov/points/38.9556,-85.8900';
const ALERTS_URL = 'https://api.weather.gov/alerts/active/zone/INC071'; // Jackson County, IN

async function jget(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'application/geo+json' } });
  if (!r.ok) throw new Error(`${u} → ${r.status}`);
  return r.json();
}

export default async () => {
  let snapshot;
  try {
    const point = await jget(POINT_URL);
    const forecastUrl = point.properties.forecast;
    const hourlyUrl   = point.properties.forecastHourly;

    const [fc, hourly, alerts] = await Promise.all([
      jget(forecastUrl),
      jget(hourlyUrl).catch(() => ({ properties: { periods: [] } })),
      jget(ALERTS_URL).catch(() => ({ features: [] }))
    ]);

    const periods = fc.properties.periods || [];
    const hPeriods = hourly.properties.periods || [];
    const alertItems = (alerts.features || []).map(a => ({
      event: a.properties.event,
      severity: a.properties.severity,
      headline: a.properties.headline,
      description: a.properties.description,
      areaDesc: a.properties.areaDesc,
      effective: a.properties.effective,
      ends: a.properties.ends
    }));

    snapshot = {
      updatedAt: new Date().toISOString(),
      source: 'api.weather.gov',
      location: { name: 'Seymour, IN', lat: 38.9556, lon: -85.8900, county: 'Jackson (INC071)' },
      current: hPeriods[0] || periods[0] || null,
      hourly: hPeriods.slice(0, 24),
      daily: periods,
      alerts: alertItems
    };
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 502 });
  }

  const data = getStore('seymour-data');
  await data.setJSON('weather.json', snapshot);

  return new Response(JSON.stringify({ ok: true, periods: snapshot.daily.length, alerts: snapshot.alerts.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
