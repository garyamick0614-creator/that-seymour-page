# That Seymour Page

Local news, weather, events, schools, businesses, blog, and tips for Seymour, Indiana.

Part of the TCG family of sites by Gary Amick — That Computer Guy 26 / TCG Solutions.

## Stack

- Static HTML + CSS (no build step) — matches the rest of the TCG family
- Netlify Functions (Node) for the blog handle generator, blog read/write, and tip storage
- Netlify Scheduled Functions (every 2 hours) for weather, news, and event refreshes
- Netlify Blobs for blog post storage
- Netlify Forms for tip persistence

## Local dev

```
npm install
netlify dev
```

## Deploy

`netlify deploy --prod` (CI auto-deploys on push to `main`).

## Scheduled refreshes

| Function | Cadence | Source |
| --- | --- | --- |
| `weather-refresh` | every 2h on the hour | National Weather Service (api.weather.gov) |
| `news-refresh` | every 2h at :15 | Public RSS feeds (state / national / world) |
| `events-refresh` | every 2h at :30 | Re-tags upcoming events from `data/events-source.json` relative to today |

Each function writes a JSON snapshot into `/data/` so pages can render statically while staying fresh.

## TCG family links

- [That Computer Guy 26](https://thatcomputerguy26.org)
- [Indiana Businesses Exposed](https://ibetcg.netlify.app)
- [TCG Predictions](https://tcgpredictions.netlify.app)
- [Civic Hub](https://ibetcg.netlify.app/civic-hub.html)
- [Southern Indiana Justice (judicial stats hub)](https://southern-indiana-justice.netlify.app)
