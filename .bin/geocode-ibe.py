"""Geocode the IBE-mentioned businesses (bottom-10, manufacturing audit, Don's, Superior)
against OSM Nominatim. Results saved to data/_ibe-geo.json for hand-curation,
then merged into ibe-articles.json."""
import urllib.request, urllib.parse, json, time, sys

UA = "ThatSeymourPage/1.0 (gary.amick0614@gmail.com)"

def geo(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'us'})
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        d = json.loads(urllib.request.urlopen(req, timeout=8).read())
        if d:
            return float(d[0]['lat']), float(d[0]['lon']), d[0].get('display_name', '')
    except Exception as e:
        return None
    return None

queries = [
    # Don's Auto — corrected to North Vernon per Gary
    ("dons",                "Don's Auto Sales, North Vernon, IN"),
    # Superior Auto — Seymour, IN per Gary
    ("superior",            "Superior Auto, Seymour, IN"),
    # Bottom-10 named businesses (1-7) — already in OSM mostly
    ("bottom10-subway",     "Subway, Seymour, IN"),
    ("bottom10-mcdonalds",  "McDonald's, Seymour, IN"),
    ("bottom10-tacobell",   "Taco Bell, Seymour, IN"),
    ("bottom10-dominos",    "Domino's Pizza, Seymour, IN"),
    ("bottom10-whitecastle","White Castle, Seymour, IN"),
    ("bottom10-javajoint",  "Java Joint, Seymour, IN"),
    ("bottom10-allstateinn","Allstate Inn, Seymour, IN"),
    # Manufacturing Audit — 10 employers
    ("mfg-aisin-usa",       "Aisin USA Manufacturing, Seymour, IN"),
    ("mfg-aisin-drivetrain","Aisin Drivetrain, Crothersville, IN"),
    ("mfg-cummins",         "Cummins, Seymour, IN"),
    ("mfg-valeo",           "Valeo, Seymour, IN"),
    ("mfg-lannett",         "Lannett Company, Seymour, IN"),
    ("mfg-cerrowire",       "Cerrowire, Crothersville, IN"),
    ("mfg-silgan",          "Silgan Plastics, Seymour, IN"),
    ("mfg-donnelley",       "RR Donnelley, Seymour, IN"),
    ("mfg-royal-group",     "Royal Group, Seymour, IN"),
    ("mfg-nippon",          "Nippon Steel Pipe America, Seymour, IN"),
]

results = {}
print("Geocoding %d queries (1.1s/req)..." % len(queries), file=sys.stderr)
for tag, q in queries:
    r = geo(q)
    if r:
        lat, lon, name = r
        results[tag] = {"lat": round(lat, 6), "lon": round(lon, 6), "match": name[:120], "query": q}
        print("  %-25s %.4f, %.4f  %s" % (tag, lat, lon, name[:70]), file=sys.stderr)
    else:
        print("  %-25s NOT FOUND  (%s)" % (tag, q), file=sys.stderr)
    time.sleep(1.1)

with open('data/_ibe-geo.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print("\n  Saved %d results to data/_ibe-geo.json" % len(results), file=sys.stderr)
