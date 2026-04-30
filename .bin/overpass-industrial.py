"""Query OSM Overpass for named industrial sites in the Seymour/Jackson-County area.
Targets Silgan, Cerrowire, Aisin Drivetrain, Lannett, Donnelley, Royal Group."""
import urllib.request, urllib.parse, json, time, sys

# Wider bbox covering Jackson County + Crothersville + Walesboro area
BBOX = "38.70,-86.10,39.00,-85.70"

QUERY = """
[out:json][timeout:60];
(
  node["name"~"Silgan|Cerrowire|Aisin|Lannett|Donnelley|Royal Group|Cummins|Valeo|Nippon",i](""" + BBOX + """);
  way["name"~"Silgan|Cerrowire|Aisin|Lannett|Donnelley|Royal Group|Cummins|Valeo|Nippon",i](""" + BBOX + """);
  relation["name"~"Silgan|Cerrowire|Aisin|Lannett|Donnelley|Royal Group|Cummins|Valeo|Nippon",i](""" + BBOX + """);
  node["operator"~"Silgan|Cerrowire|Aisin|Lannett|Donnelley|Royal Group|Cummins|Valeo|Nippon",i](""" + BBOX + """);
);
out center tags;
"""

ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
]
data = None
for url in ENDPOINTS:
    print("Trying " + url + "...", file=sys.stderr)
    try:
        req = urllib.request.Request(
            url, data=urllib.parse.urlencode({'data': QUERY}).encode(),
            headers={'User-Agent': 'ThatSeymourPage/1.0 (gary.amick0614@gmail.com)'}
        )
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read())
        print("  Got %d elements in %.1fs" % (len(data['elements']), time.time()-t0), file=sys.stderr)
        break
    except Exception as e:
        print("  failed: " + str(e), file=sys.stderr)
        time.sleep(2)

if data is None:
    print("All endpoints failed", file=sys.stderr); sys.exit(1)

print()
for e in data['elements']:
    t = e.get('tags', {})
    name = t.get('name', '?')
    lat = e.get('lat') or (e.get('center') or {}).get('lat')
    lon = e.get('lon') or (e.get('center') or {}).get('lon')
    addr = []
    if t.get('addr:housenumber'): addr.append(t['addr:housenumber'])
    if t.get('addr:street'):       addr.append(t['addr:street'])
    if t.get('addr:city'):         addr.append(', ' + t['addr:city'])
    addr_str = ' '.join(addr).strip(' ,') if addr else ''
    other = []
    for k in ['operator','industrial','man_made','building','landuse']:
        if t.get(k): other.append(k + '=' + t[k])
    print("%-40s %s,%s  %s  [%s]" % (name[:38], lat, lon, addr_str, ', '.join(other)))
