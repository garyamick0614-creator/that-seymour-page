"""Pull verified businesses from OpenStreetMap (Overpass API) for Seymour bbox.
Every entry is real OSM data with real coordinates contributed by mappers."""
import urllib.request, urllib.parse, json, time, sys

BBOX = "38.70,-86.10,39.00,-85.70"  # south,west,north,east — Jackson County wide

QUERY = """
[out:json][timeout:60];
(
  node["amenity"~"restaurant|fast_food|cafe|bar|pub|bank|atm|pharmacy|hospital|clinic|doctors|dentist|veterinary|fuel|police|fire_station|library|post_office|townhall|courthouse|school|college|kindergarten|childcare|community_centre|theatre|cinema|place_of_worship|nightclub|fitness_centre|ice_cream"](""" + BBOX + """);
  node["shop"~"supermarket|convenience|grocery|department_store|hardware|car|car_repair|car_parts|tyres|bicycle|bakery|butcher|florist|gift|jewelry|optician|clothes|shoes|hairdresser|beauty|electronics|mobile_phone|furniture|appliance|paint|farm|garden_centre|nursery|deli|kiosk|liquor|alcohol|toys|sports|books|stationery|music|tobacco|laundry|dry_cleaning|copyshop|tailor|video|pawnbroker|second_hand|charity|funeral_directors|pet|tattoo|massage|car_wash|hardware_store"](""" + BBOX + """);
  node["leisure"~"park|playground|sports_centre|fitness_station|swimming_pool|bowling_alley|fitness_centre"](""" + BBOX + """);
  node["tourism"~"hotel|motel|attraction|museum|information|guest_house"](""" + BBOX + """);
  way["amenity"~"restaurant|fast_food|cafe|bar|pub|bank|pharmacy|hospital|library|post_office|townhall|school|place_of_worship|community_centre|fuel"](""" + BBOX + """);
  way["shop"~"supermarket|convenience|grocery|department_store|hardware|car|car_repair"](""" + BBOX + """);
  way["leisure"~"park|sports_centre"](""" + BBOX + """);
);
out center;
"""

ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
data = None
for url in ENDPOINTS:
    print("Trying " + url + "...", file=sys.stderr)
    try:
        req = urllib.request.Request(
            url,
            data=urllib.parse.urlencode({'data': QUERY}).encode(),
            headers={'User-Agent': 'ThatSeymourPage/1.0 (gary.amick0614@gmail.com)'}
        )
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read())
        print("  Got %d elements in %.1fs" % (len(data['elements']), time.time() - t0), file=sys.stderr)
        break
    except Exception as e:
        print("  failed: " + str(e), file=sys.stderr)
        time.sleep(2)
if data is None:
    print("All Overpass endpoints failed; aborting.", file=sys.stderr)
    sys.exit(1)

def addr_str(t):
    parts = []
    if t.get('addr:housenumber'): parts.append(t['addr:housenumber'])
    if t.get('addr:street'):       parts.append(t['addr:street'])
    if not parts: return None
    out = ' '.join(parts)
    if t.get('addr:city'):     out += ', ' + t['addr:city']
    if t.get('addr:state'):    out += ', ' + t['addr:state']
    if t.get('addr:postcode'): out += ' ' + t['addr:postcode']
    return out

def category(t):
    a, s, l, to = t.get('amenity', ''), t.get('shop', ''), t.get('leisure', ''), t.get('tourism', '')
    if a in ('restaurant', 'cafe', 'bar', 'pub', 'nightclub', 'ice_cream'): return 'Restaurant'
    if a == 'fast_food': return 'Fast Food'
    if s in ('supermarket', 'grocery', 'convenience', 'deli', 'butcher', 'bakery', 'liquor', 'alcohol'): return 'Grocery'
    if s in ('hardware', 'paint', 'garden_centre', 'nursery', 'farm', 'hardware_store'): return 'Hardware / Garden'
    if s in ('car', 'car_repair', 'car_parts', 'tyres', 'car_wash', 'bicycle'): return 'Auto'
    if s in ('clothes', 'shoes', 'jewelry', 'department_store', 'gift', 'furniture', 'appliance', 'electronics', 'mobile_phone', 'optician', 'toys', 'sports', 'books', 'stationery', 'music', 'second_hand', 'charity', 'tobacco'): return 'Retail'
    if s in ('hairdresser', 'beauty', 'tattoo', 'massage', 'laundry', 'dry_cleaning', 'tailor'): return 'Personal Service'
    if s in ('florist', 'funeral_directors', 'pet', 'copyshop', 'video', 'pawnbroker', 'kiosk'): return 'Other Shop'
    if a in ('bank', 'atm'): return 'Banking'
    if a == 'pharmacy' or s == 'pharmacy': return 'Pharmacy'
    if a in ('hospital', 'clinic', 'doctors', 'dentist', 'veterinary'): return 'Medical'
    if a == 'fuel': return 'Gas / Fuel'
    if a in ('police', 'fire_station'): return 'Public Safety'
    if a == 'library': return 'Library'
    if a == 'post_office': return 'Postal'
    if a in ('townhall', 'courthouse'): return 'Government'
    if a in ('school', 'college', 'university', 'kindergarten', 'childcare'): return 'School'
    if a == 'place_of_worship': return 'Faith'
    if a == 'community_centre': return 'Community'
    if a in ('theatre', 'cinema'): return 'Entertainment'
    if a == 'fitness_centre' or l == 'fitness_centre' or l == 'fitness_station': return 'Fitness'
    if l in ('park', 'playground'): return 'Park'
    if l in ('sports_centre', 'swimming_pool', 'bowling_alley'): return 'Sports'
    if to in ('hotel', 'motel', 'guest_house'): return 'Lodging'
    if to in ('attraction', 'museum', 'information'): return 'Landmark'
    return 'Other'

CATEGORY_COLORS = {
    "Restaurant": "#fbbf24", "Fast Food": "#f87171", "Grocery": "#34d399",
    "Hardware / Garden": "#34d399", "Auto": "#60a5fa", "Retail": "#22d3ee",
    "Personal Service": "#a78bfa", "Other Shop": "#22d3ee", "Banking": "#a78bfa",
    "Pharmacy": "#a78bfa", "Medical": "#f87171", "Gas / Fuel": "#22d3ee",
    "Public Safety": "#f87171", "Library": "#34d399", "Postal": "#22d3ee",
    "Government": "#22d3ee", "School": "#a78bfa", "Faith": "#a78bfa",
    "Community": "#34d399", "Entertainment": "#fbbf24", "Fitness": "#34d399",
    "Park": "#34d399", "Sports": "#34d399", "Lodging": "#fbbf24",
    "Landmark": "#a78bfa", "Other": "#9aa6b2"
}

places = []
seen = set()
for e in data['elements']:
    t = e.get('tags', {})
    name = t.get('name')
    if not name: continue
    # ways have 'center' lat/lon, nodes have direct lat/lon
    lat = e.get('lat') or (e.get('center') or {}).get('lat')
    lon = e.get('lon') or (e.get('center') or {}).get('lon')
    if lat is None or lon is None: continue
    key = (round(lat, 5), round(lon, 5), name.lower())
    if key in seen: continue
    seen.add(key)
    cat = category(t)
    if cat == 'Other': continue
    item = {
        "name": name,
        "category": cat,
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "osm_id": e['id']
    }
    addr = addr_str(t)
    if addr: item['address'] = addr
    if t.get('phone'):    item['phone'] = t['phone']
    if t.get('website'):  item['url'] = t['website']
    if t.get('opening_hours'): item['hours'] = t['opening_hours']
    if t.get('cuisine'):       item['cuisine'] = t['cuisine']
    if t.get('religion'):      item['religion'] = t['religion']
    if t.get('denomination'):  item['denomination'] = t['denomination']
    item['mappable'] = True
    places.append(item)

places.sort(key=lambda p: (p['category'], p['name']))

doc = {
    "_comment": "Verified businesses and amenities in Seymour, IN. Source: OpenStreetMap via Overpass API. Every entry has real coordinates from OSM contributors. Run .bin/fetch-osm.py to refresh.",
    "updatedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    "source": "OpenStreetMap (Overpass API)",
    "bbox": BBOX,
    "categoryColors": CATEGORY_COLORS,
    "places": places
}

with open('data/osm-places.json', 'w', encoding='utf-8') as f:
    json.dump(doc, f, indent=2)

by_cat = {}
for p in places:
    by_cat[p['category']] = by_cat.get(p['category'], 0) + 1
print("\n=== %d OSM-verified places saved ===" % len(places), file=sys.stderr)
for c in sorted(by_cat.keys()):
    print("  %-22s %d" % (c, by_cat[c]), file=sys.stderr)
