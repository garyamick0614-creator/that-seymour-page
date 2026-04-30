"""Final attempt to geocode the manufacturing-audit holdouts.
Try multiple specific address candidates per business; only keep results
that Nominatim resolves to an Indiana address.
"""
import urllib.request, urllib.parse, json, time, sys
UA = "ThatSeymourPage/1.0 (gary.amick0614@gmail.com)"

def geo(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 3, 'countrycodes': 'us'})
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        return json.loads(urllib.request.urlopen(req, timeout=8).read())
    except Exception as e:
        return []

# Specific address candidates compiled from public records, IBE article body, and
# common-knowledge industrial-park locations in Jackson County. Each list is
# tried in order; first match in Indiana wins.
candidates = {
    "mfg-silgan": [
        # IBE manufacturing audit article literally cited "5 Silgan Pl"
        "5 Silgan Place, Seymour, IN",
        "5 Silgan Pl, Seymour, IN 47274",
        "Silgan Place, Seymour, IN",
    ],
    "mfg-cerrowire": [
        # Crothersville industrial park
        "Cerrowire, Crothersville, Indiana 47229",
        "111 Industrial Drive, Crothersville, IN",
        "200 Cerrowire Way, Crothersville, IN",
    ],
    "mfg-aisin-drivetrain": [
        "Aisin Drivetrain, Crothersville, Indiana",
        "Aisin AW, Crothersville, IN",
        "1010 N Anderson Pike, Crothersville, IN",
    ],
    "mfg-lannett": [
        "Lannett, Seymour, Indiana",
        "Lannett Pharmaceuticals Seymour, IN",
    ],
    "mfg-donnelley": [
        "Donnelley, Seymour, IN",
        "RR Donnelley printing plant, Seymour, Indiana",
    ],
    "mfg-royal-group": [
        "Royal Group, Seymour, IN",
        "Royal Container, Seymour, Indiana",
    ],
}

# Load existing geo file if present
try:
    results = json.load(open('data/_ibe-geo.json', encoding='utf-8'))
except:
    results = {}

print("Geocoding manufacturing holdouts (1.1s/req)...", file=sys.stderr)
for tag, qs in candidates.items():
    if tag in results:
        print("  %-25s already have it" % tag, file=sys.stderr)
        continue
    found = None
    for q in qs:
        d = geo(q)
        time.sleep(1.1)
        for c in d:
            disp = (c.get('display_name','') or '').lower()
            if 'indiana' not in disp:
                continue
            found = (float(c['lat']), float(c['lon']), c.get('display_name',''))
            break
        if found: break
    if found:
        lat, lon, name = found
        results[tag] = {"lat": round(lat, 6), "lon": round(lon, 6), "match": name[:140], "queries": qs}
        print("  %-25s %.4f, %.4f  %s" % (tag, lat, lon, name[:80]), file=sys.stderr)
    else:
        print("  %-25s NOT FOUND  (tried %d candidates)" % (tag, len(qs)), file=sys.stderr)

with open('data/_ibe-geo.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print("\n  Total verified: %d" % len(results), file=sys.stderr)
