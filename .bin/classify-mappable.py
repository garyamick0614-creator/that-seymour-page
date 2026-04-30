"""Classify each item as mappable (has real street number) or unmapped (vague address).
Run from repo root: python .bin/classify-mappable.py
- Mappable: address contains a street-number prefix (e.g. '125 S Chestnut St')
- Unmapped: vague ('Seymour, IN', 'Downtown', 'Various'), or no usable address.
For unmapped items: strip lat/lon so the map can't render them.
"""
import json, re

STREET_NUM_RE = re.compile(r'^\s*\d+[A-Za-z]?\s+\w', re.IGNORECASE)

def is_mappable(addr):
    """Returns True if address starts with a street number."""
    if not addr: return False
    return bool(STREET_NUM_RE.match(addr))

def classify(path, items_key, name_key='name'):
    print(f"\n=== {path} ===")
    with open(path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    items = doc[items_key]
    mappable_count = 0
    unmapped_count = 0
    for it in items:
        addr = it.get('address', '') or ''
        if is_mappable(addr):
            it['mappable'] = True
            mappable_count += 1
        else:
            it['mappable'] = False
            # Strip approximate coords for unmapped items so they can't render on the map
            it.pop('lat', None)
            it.pop('lon', None)
            unmapped_count += 1
            print(f"  unmapped: {it.get(name_key, '?')[:50]}  -- '{addr[:50]}'")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=2)
    print(f"  -> mappable: {mappable_count}, unmapped: {unmapped_count}")

classify('data/businesses.json', 'businesses')
classify('data/landmarks.json', 'items')
classify('data/shopping-fast-food.json', 'places')
classify('data/ibe-articles.json', 'articles', name_key='title')
classify('data/gary-reviews.json', 'reviews')
print('\nDone.')
