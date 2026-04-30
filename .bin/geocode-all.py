"""Geocode every address in the data files via OSM Nominatim and update lat/lon.
Run from repo root: python .bin/geocode-all.py
Respects Nominatim's 1 req/sec rate limit. Updates only entries whose geocode
result differs from the current lat/lon by more than ~150m."""
import json, urllib.request, urllib.parse, time, math

UA = "ThatSeymourPage/1.0 (gary.amick0614@gmail.com)"
SLEEP = 1.1

def geo(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'us'})
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        d = json.loads(urllib.request.urlopen(req, timeout=8).read())
        if d:
            return float(d[0]['lat']), float(d[0]['lon']), d[0].get('display_name', '')
    except Exception as e:
        print('  err:', e)
    return None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))

def update_file(path, items_key, addr_key='address', name_key='name'):
    print(f"\n=== {path} ===")
    with open(path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    items = doc[items_key]
    changes = 0
    for it in items:
        addr = it.get(addr_key, '')
        name = it.get(name_key, '')
        if not addr or 'IN' not in addr.upper():
            continue
        # Use both name and address for richer matching
        q = f"{name}, {addr}" if name else addr
        result = geo(q)
        time.sleep(SLEEP)
        if not result:
            # Fallback to address only
            result = geo(addr)
            time.sleep(SLEEP)
        if not result:
            print(f"  skip: {name[:40]} - no geocode")
            continue
        lat, lon, _ = result
        cur_lat, cur_lon = it.get('lat'), it.get('lon')
        if cur_lat is None or cur_lon is None:
            it['lat'], it['lon'] = round(lat, 6), round(lon, 6)
            changes += 1
            print(f"  set: {name[:40]} -> {lat:.4f}, {lon:.4f}")
            continue
        dist = haversine(cur_lat, cur_lon, lat, lon)
        if dist > 150:
            print(f"  fix: {name[:40]} ({dist:.0f}m off) {cur_lat:.4f},{cur_lon:.4f} -> {lat:.4f},{lon:.4f}")
            it['lat'], it['lon'] = round(lat, 6), round(lon, 6)
            changes += 1
        else:
            print(f"  ok:  {name[:40]} ({dist:.0f}m)")
    if changes:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(doc, f, indent=2)
    print(f"  -> {changes} change(s) saved")

update_file('data/businesses.json', 'businesses')
update_file('data/landmarks.json', 'items')
update_file('data/shopping-fast-food.json', 'places')
print('\nDone.')
