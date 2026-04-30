"""Retry geocoding the missing IBE businesses with broader queries."""
import urllib.request, urllib.parse, json, time, sys
UA = "ThatSeymourPage/1.0 (gary.amick0614@gmail.com)"

def geo(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 3, 'countrycodes': 'us'})
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        d = json.loads(urllib.request.urlopen(req, timeout=8).read())
        return d
    except Exception as e:
        return []

retries = [
    ("dons",                ["Don's Auto, North Vernon, IN", "Auto Sales North Vernon Indiana", "1100 N State St, North Vernon, IN"]),
    ("bottom10-dominos",    ["Dominos Pizza Seymour Indiana", "211 N Chestnut St, Seymour, IN"]),
    ("bottom10-javajoint",  ["Java Joint Seymour", "Java Joint Coffee Seymour, IN"]),
    ("bottom10-allstateinn",["Allstate Inn Seymour", "Allstate Inn 405 N Tipton St, Seymour, IN"]),
    ("mfg-aisin-usa",       ["Aisin Seymour", "1700 E 4th St, Seymour, IN", "Aisin USA Mfg, Seymour, IN"]),
    ("mfg-aisin-drivetrain",["Aisin Drivetrain, Walesboro, IN", "Aisin USA Walesboro Indiana"]),
    ("mfg-valeo",           ["Valeo Sylvania, Seymour, IN", "1231 A Avenue East, Seymour, IN"]),
    ("mfg-lannett",         ["Lannett Pharmaceuticals Seymour", "9000 State Highway 50, Seymour, IN"]),
    ("mfg-cerrowire",       ["Cerrowire, Crothersville Indiana", "Cerrowire 7807 W Industrial Dr, Crothersville, IN"]),
    ("mfg-silgan",          ["Silgan Plastics Seymour", "5 Silgan Place, Seymour, IN"]),
    ("mfg-donnelley",       ["RR Donnelley Seymour", "Donnelley Seymour Indiana print"]),
    ("mfg-royal-group",     ["Royal Group, Seymour, IN", "Royal Container Seymour"]),
]

# Load existing results
try:
    results = json.load(open('data/_ibe-geo.json', encoding='utf-8'))
except: results = {}

print("Retry pass with broader queries (1.1s/req)...", file=sys.stderr)
for tag, qs in retries:
    if tag in results:
        print("  %-25s already have it" % tag, file=sys.stderr)
        continue
    found = None
    for q in qs:
        d = geo(q)
        time.sleep(1.1)
        for cand in d:
            disp = cand.get('display_name','').lower()
            # Filter out anything not in Indiana
            if 'indiana' not in disp: continue
            found = (float(cand['lat']), float(cand['lon']), cand.get('display_name',''))
            break
        if found: break
    if found:
        lat, lon, name = found
        results[tag] = {"lat": round(lat, 6), "lon": round(lon, 6), "match": name[:120], "query": qs[0]}
        print("  %-25s %.4f, %.4f  %s" % (tag, lat, lon, name[:70]), file=sys.stderr)
    else:
        print("  %-25s NOT FOUND" % tag, file=sys.stderr)

with open('data/_ibe-geo.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print("\n  Total verified: %d" % len(results), file=sys.stderr)
