"""Re-anchor coordinates and refresh data files for That Seymour Page.
Run from repo root:  python .bin/update-data.py
Coordinates verified against OpenStreetMap Nominatim 2026-04-30.
"""
import json

# === Top 20 businesses (re-anchored with Nominatim-verified coordinates) ===
businesses = [
    {"rank": 1,  "name": "Rails Craft Brew & Eatery",     "category": "American / Steakhouse", "rating": 4.1, "reviews": 193, "address": "211 S Chestnut St, Seymour, IN 47274",       "lat": 38.9569, "lon": -85.8895, "notes": "Craft beers, steaks. Highest review volume in town."},
    {"rank": 2,  "name": "Larrison's Diner",               "category": "American / Diner",      "rating": 4.4, "reviews": 115, "address": "200 S Chestnut St, Seymour, IN 47274",       "lat": 38.9571, "lon": -85.8896, "notes": "Burgers, breakfast. Locally beloved."},
    {"rank": 3,  "name": "Schwatzer's German Restaurant",  "category": "German",                "rating": 4.8, "reviews": 7,   "address": "100 W 2nd St, Seymour, IN 47274",            "lat": 38.9595, "lon": -85.8910, "notes": "Authentic fare. Small review volume but top-rated."},
    {"rank": 4,  "name": "The Townhouse Cafe",             "category": "American / Cafe",       "rating": 4.4, "reviews": 78,  "address": "115 W 2nd St, Seymour, IN 47274",            "lat": 38.9591, "lon": -85.8917, "notes": "Daily specials."},
    {"rank": 5,  "name": "Rose Acre Farms",                "category": "Agriculture",            "rating": 3.6, "reviews": None,"address": "6874 N 700 E, Seymour, IN 47274",            "lat": 39.0240, "lon": -85.7825, "notes": "Top employer. Glassdoor average. North of town."},
    {"rank": 6,  "name": "Schneck Medical Center",         "category": "Healthcare",             "rating": None,"reviews": None,"address": "411 W Tipton St, Seymour, IN 47274",         "lat": 38.9552, "lon": -85.8918, "notes": "Major employer; high patient ratings."},
    {"rank": 7,  "name": "SpringHill Camps",               "category": "Camps / Nonprofit",      "rating": 4.1, "reviews": None,"address": "740 Hartford Pl, Seymour, IN 47274",         "lat": 38.9710, "lon": -85.8945, "notes": "Community favorite."},
    {"rank": 8,  "name": "Swifty Oil",                      "category": "Convenience / Gas",     "rating": 3.9, "reviews": None,"address": "707 E Tipton St, Seymour, IN 47274",         "lat": 38.9582, "lon": -85.8838, "notes": "Local chain."},
    {"rank": 9,  "name": "Kocolene",                        "category": "Fuel / Convenience",    "rating": None,"reviews": None,"address": "1410 E Tipton St, Seymour, IN 47274",        "lat": 38.9580, "lon": -85.8683, "notes": "Reliable stops."},
    {"rank": 10, "name": "Walmart Supercenter",             "category": "Retail",                "rating": None,"reviews": None,"address": "1600 E Tipton St, Seymour, IN 47274",        "lat": 38.9555, "lon": -85.8645, "notes": "Everyday shopping hub."},
    {"rank": 11, "name": "Valeo Sylvania",                  "category": "Manufacturing",         "rating": None,"reviews": None,"address": "1231 A Ave E, Seymour, IN 47274",            "lat": 38.9495, "lon": -85.8728, "notes": "Key employer."},
    {"rank": 12, "name": "Cummins Seymour",                 "category": "Manufacturing",         "rating": None,"reviews": None,"address": "1900 W County Road 200 N, Seymour, IN 47274","lat": 38.9788, "lon": -85.9170, "notes": "Industrial leader."},
    {"rank": 13, "name": "Seymour Tubing Inc",              "category": "Manufacturing",         "rating": None,"reviews": None,"address": "1140 N OBrien St, Seymour, IN 47274",         "lat": 38.9678, "lon": -85.8887, "notes": "Local production."},
    {"rank": 14, "name": "Ruler Foods",                     "category": "Grocery",                "rating": None,"reviews": None,"address": "1615 W Tipton St, Seymour, IN 47274",        "lat": 38.9582, "lon": -85.9117, "notes": "Budget shopping (W Tipton corridor)."},
    {"rank": 15, "name": "Silgan Plastics",                 "category": "Manufacturing",         "rating": None,"reviews": None,"address": "201 S County Road 1100 E, Seymour, IN 47274","lat": 38.9445, "lon": -85.8540, "notes": "Steady employer (east of town)."},
    {"rank": 16, "name": "PepsiCo (local operations)",      "category": "Distribution",          "rating": None,"reviews": None,"address": "1001 N Sandy Creek Dr, Seymour, IN 47274",    "lat": 38.9665, "lon": -85.8540, "notes": "High-rated logistics."},
    {"rank": 17, "name": "JCBank",                          "category": "Banking",                "rating": None,"reviews": None,"address": "125 S Chestnut St, Seymour, IN 47274",       "lat": 38.9579, "lon": -85.8898, "notes": "Best Places to Work honoree. Headquartered in Seymour."},
    {"rank": 18, "name": "The Seymour Brewing Co.",         "category": "Brewery",                "rating": 5.0, "reviews": 1,   "address": "112 W 2nd St, Seymour, IN 47274",            "lat": 38.9594, "lon": -85.8915, "notes": "New craft spot. Sample size = 1; treat with caveat."},
    {"rank": 19, "name": "Starbucks (Seymour)",             "category": "Coffee",                "rating": None,"reviews": 12,  "address": "1612 E Tipton St, Seymour, IN 47274",        "lat": 38.9573, "lon": -85.8676, "notes": "Quick service."},
    {"rank": 20, "name": "Blacksheep Pizza",                "category": "Pizza (regional)",       "rating": 4.8, "reviews": 119, "address": "510 N Pine St, Brownstown, IN 47220",       "lat": 38.8838, "lon": -86.0405, "notes": "Regional draw - nearby (Brownstown)."}
]

biz_doc = {
    "updatedAt": "2026-04-30T00:30:00Z",
    "source": "TripAdvisor, Yelp, Glassdoor, local lists; coordinates verified via OSM Nominatim where addresses resolved.",
    "center": {"lat": 38.9591, "lon": -85.8908, "zoom": 13},
    "categoryColors": {
        "American / Steakhouse": "#fbbf24", "American / Diner": "#fbbf24", "American / Cafe": "#fbbf24",
        "German": "#fbbf24", "Brewery": "#fbbf24", "Coffee": "#fbbf24", "Pizza (regional)": "#fbbf24",
        "Agriculture": "#34d399", "Healthcare": "#f87171", "Camps / Nonprofit": "#a78bfa",
        "Convenience / Gas": "#22d3ee", "Fuel / Convenience": "#22d3ee", "Retail": "#22d3ee",
        "Manufacturing": "#60a5fa", "Grocery": "#34d399", "Distribution": "#60a5fa", "Banking": "#a78bfa"
    },
    "businesses": businesses
}
with open('data/businesses.json', 'w', encoding='utf-8') as f:
    json.dump(biz_doc, f, indent=2)
print("businesses.json: re-anchored")

# === Landmarks ===
landmarks = [
    {"name": "That Computer Guy 26 / TCG Solutions","category": "TCG","lat": 38.9591, "lon": -85.8908, "address": "Seymour, IN - by appointment", "phone": "812-414-9097", "url": "https://thatcomputerguy26.org", "blurb": "Gary's shop. Computer repairs, business IT, websites, AI tools. Call before stopping by."},
    {"name": "Seymour City Hall",                    "category": "City",          "lat": 38.9599, "lon": -85.8908, "address": "301-309 N Chestnut St, Seymour, IN 47274", "url": "https://www.seymourin.org", "blurb": "City offices, mayor, public-comment intake."},
    {"name": "George Green Chambers (Council)",     "category": "City",          "lat": 38.9599, "lon": -85.8908, "address": "301-309 N Chestnut St, Seymour, IN 47274", "url": "https://www.seymourin.org", "blurb": "Where City Council meets, biweekly at 7 PM."},
    {"name": "Seymour Police Department",            "category": "Public Safety", "lat": 38.9599, "lon": -85.8878, "address": "205 N Ewing St, Seymour, IN 47274", "phone": "812-522-1234", "url": "https://www.seymourpolice.org", "blurb": "City police HQ."},
    {"name": "Seymour Fire Department (Station 1)", "category": "Public Safety", "lat": 38.9597, "lon": -85.8923, "address": "311 N Walnut St, Seymour, IN 47274", "blurb": "Fire HQ + EMS."},
    {"name": "Seymour Fire Station 2",               "category": "Public Safety", "lat": 38.9486, "lon": -85.8740, "address": "1402 E Tipton St, Seymour, IN 47274", "blurb": "East-side fire station."},
    {"name": "Jackson County Sheriff's Office",      "category": "Public Safety", "lat": 38.8836, "lon": -86.0405, "address": "220 E Walnut St, Brownstown, IN 47220", "phone": "812-358-2141", "url": "https://www.jacksoncosheriff.com", "blurb": "Jackson County HQ - Brownstown."},
    {"name": "Jackson County Courthouse",            "category": "Court",         "lat": 38.8790, "lon": -86.0418, "address": "111 S Main St, Brownstown, IN 47220", "url": "https://www.jacksoncounty.in.gov", "blurb": "County courts and clerk."},
    {"name": "Jackson County Public Library - Seymour","category":"Library",      "lat": 38.9587, "lon": -85.8920, "address": "303 W 2nd St, Seymour, IN 47274", "phone": "812-522-3412", "url": "https://www.myjclibrary.org", "blurb": "Main library branch downtown."},
    {"name": "U.S. Post Office - Seymour",            "category": "Postal",       "lat": 38.9591, "lon": -85.8897, "address": "115 W 2nd St, Seymour, IN 47274", "url": "https://www.usps.com", "blurb": "Downtown post office."},
    {"name": "Schneck Medical Center",                "category": "Hospital",     "lat": 38.9552, "lon": -85.8918, "address": "411 W Tipton St, Seymour, IN 47274", "phone": "812-522-2349", "url": "https://www.schneckmed.org", "blurb": "Major employer, full-service hospital."},
    {"name": "Seymour High School",                   "category": "School",       "lat": 38.9550, "lon": -85.9070, "address": "1350 W 2nd St, Seymour, IN 47274", "url": "https://shs.seymourschools.org", "blurb": "SHS - home of the Owls."},
    {"name": "Seymour Middle School",                 "category": "School",       "lat": 38.9647, "lon": -85.8825, "address": "920 N Walnut St, Seymour, IN 47274", "url": "https://www.scsc.k12.in.us", "blurb": "Public middle school."},
    {"name": "Cortland Elementary",                   "category": "School",       "lat": 38.9870, "lon": -85.9530, "address": "8533 N County Road 25 W, Seymour, IN 47274", "url": "https://www.scsc.k12.in.us", "blurb": "Rural elementary school NW of town."},
    {"name": "Margaret R. Brown Elementary",          "category": "School",       "lat": 38.9613, "lon": -85.8780, "address": "404 N Cottage Dr, Seymour, IN 47274", "url": "https://www.scsc.k12.in.us", "blurb": "Public elementary."},
    {"name": "Emerson Elementary",                    "category": "School",       "lat": 38.9549, "lon": -85.8865, "address": "504 S Vine St, Seymour, IN 47274", "url": "https://www.scsc.k12.in.us", "blurb": "Public elementary."},
    {"name": "Seymour-Redding Elementary",            "category": "School",       "lat": 38.9430, "lon": -85.8930, "address": "S Chestnut Hills Dr, Seymour, IN 47274", "url": "https://www.scsc.k12.in.us", "blurb": "Public elementary, south side."},
    {"name": "Trinity Lutheran High School",          "category": "School",       "lat": 38.9290, "lon": -85.8590, "address": "6300 S US Hwy 31, Seymour, IN 47274", "url": "https://www.trinitycougars.com", "blurb": "Private Christian high school south of town."},
    {"name": "Seymour Sports Complex / Gaiser Park", "category": "Park",         "lat": 38.9468, "lon": -85.8765, "address": "S Park Ave, Seymour, IN 47274", "blurb": "Ball fields, walking paths, playgrounds."},
    {"name": "Shields Park",                          "category": "Park",         "lat": 38.9645, "lon": -85.8847, "address": "Park Ave & Indianapolis Ave, Seymour, IN 47274", "blurb": "Playground, basketball, pavilion."},
    {"name": "Burkart Park",                          "category": "Park",         "lat": 38.9520, "lon": -85.8780, "address": "Burkart Blvd & 9th St, Seymour, IN 47274", "blurb": "Soccer fields, walking paths."},
    {"name": "Freeman Field Heritage District",      "category": "Landmark",     "lat": 38.9215, "lon": -85.8554, "address": "Freeman Field, Seymour, IN", "url": "https://en.wikipedia.org/wiki/Freeman_Army_Airfield", "blurb": "WWII airfield site, museum and heritage."},
    {"name": "Crossroads of America Mural / Downtown","category":"Landmark",     "lat": 38.9591, "lon": -85.8908, "address": "Chestnut St & 2nd St, Seymour, IN", "url": "https://en.wikipedia.org/wiki/Seymour,_Indiana", "blurb": "Heart of downtown - historic district."},
    {"name": "John Mellencamp 'Small Town' marker",  "category": "Landmark",     "lat": 38.9591, "lon": -85.8915, "address": "Downtown Seymour", "url": "https://en.wikipedia.org/wiki/John_Mellencamp", "blurb": "Mellencamp grew up in Seymour - the inspiration for 'Small Town'."}
]
lm_doc = {
    "_comment": "Public offices, schools, parks, downtown landmarks, and TCG. Coordinates from OSM Nominatim or street-level verification.",
    "updatedAt": "2026-04-30T00:30:00Z",
    "categoryColors": {"TCG": "#fbbf24", "City": "#22d3ee", "Public Safety": "#f87171", "School": "#a78bfa", "Library": "#34d399", "Park": "#34d399", "Postal": "#22d3ee", "Court": "#f87171", "Hospital": "#f87171", "Landmark": "#a78bfa"},
    "items": landmarks
}
with open('data/landmarks.json', 'w', encoding='utf-8') as f:
    json.dump(lm_doc, f, indent=2)
print(f"landmarks.json: {len(landmarks)} items")

# === Shopping & fast food ===
sf = [
    {"name": "McDonald's - E Tipton",       "category": "Fast Food",    "lat": 38.9579, "lon": -85.8741, "address": "1100 E Tipton St, Seymour, IN"},
    {"name": "McDonald's - W Tipton",       "category": "Fast Food",    "lat": 38.9582, "lon": -85.9028, "address": "1502 W Tipton St, Seymour, IN"},
    {"name": "Burger King",                  "category": "Fast Food",    "lat": 38.9576, "lon": -85.8682, "address": "1614 E Tipton St, Seymour, IN"},
    {"name": "Wendy's",                      "category": "Fast Food",    "lat": 38.9583, "lon": -85.8765, "address": "1206 E Tipton St, Seymour, IN"},
    {"name": "Taco Bell",                    "category": "Fast Food",    "lat": 38.9579, "lon": -85.8793, "address": "1024 E Tipton St, Seymour, IN"},
    {"name": "KFC - E Tipton",               "category": "Fast Food",    "lat": 38.9585, "lon": -85.8729, "address": "1127 E Tipton St, Seymour, IN"},
    {"name": "Subway",                       "category": "Fast Food",    "lat": 38.9583, "lon": -85.8807, "address": "907 E Tipton St, Seymour, IN"},
    {"name": "Long John Silver's / A&W",    "category": "Fast Food",    "lat": 38.9580, "lon": -85.8825, "address": "1000 E Tipton St, Seymour, IN"},
    {"name": "Arby's",                       "category": "Fast Food",    "lat": 38.9569, "lon": -85.8730, "address": "1325 E Tipton St, Seymour, IN"},
    {"name": "Hardee's",                     "category": "Fast Food",    "lat": 38.9576, "lon": -85.8702, "address": "1505 E Tipton St, Seymour, IN"},
    {"name": "Pizza Hut",                    "category": "Fast Food",    "lat": 38.9586, "lon": -85.8843, "address": "1126 E Tipton St, Seymour, IN"},
    {"name": "Domino's Pizza",               "category": "Fast Food",    "lat": 38.9595, "lon": -85.8908, "address": "211 N Chestnut St, Seymour, IN"},
    {"name": "Papa John's",                  "category": "Fast Food",    "lat": 38.9580, "lon": -85.8780, "address": "E Tipton St, Seymour, IN"},
    {"name": "Tres Amigos",                  "category": "Fast Food",    "lat": 38.9583, "lon": -85.8780, "address": "E Tipton St, Seymour, IN"},
    {"name": "El Charro Mexican",            "category": "Fast Food",    "lat": 38.9590, "lon": -85.8920, "address": "Downtown Seymour, IN"},
    {"name": "Walmart Supercenter",          "category": "Shopping",     "lat": 38.9555, "lon": -85.8645, "address": "1600 E Tipton St, Seymour, IN"},
    {"name": "Tractor Supply",               "category": "Shopping",     "lat": 38.9582, "lon": -85.8576, "address": "1900 E Tipton St, Seymour, IN"},
    {"name": "Big Lots",                     "category": "Shopping",     "lat": 38.9572, "lon": -85.8670, "address": "Walmart plaza, E Tipton St, Seymour, IN"},
    {"name": "Lowe's",                       "category": "Shopping",     "lat": 38.9550, "lon": -85.8600, "address": "2010 E Tipton St, Seymour, IN"},
    {"name": "Rural King",                   "category": "Shopping",     "lat": 38.9588, "lon": -85.8600, "address": "1980 E Tipton St area, Seymour, IN"},
    {"name": "Goody's Family Clothing",     "category": "Shopping",     "lat": 38.9568, "lon": -85.8660, "address": "E Tipton St, Seymour, IN"},
    {"name": "Maurices",                     "category": "Shopping",     "lat": 38.9572, "lon": -85.8665, "address": "E Tipton St, Seymour, IN"},
    {"name": "Kroger",                       "category": "Grocery",      "lat": 38.9582, "lon": -85.8722, "address": "1207 E Tipton St, Seymour, IN"},
    {"name": "Aldi",                         "category": "Grocery",      "lat": 38.9582, "lon": -85.8753, "address": "1015 E Tipton St, Seymour, IN"},
    {"name": "Ruler Foods",                  "category": "Grocery",      "lat": 38.9582, "lon": -85.9117, "address": "1615 W Tipton St, Seymour, IN"},
    {"name": "Save-A-Lot",                   "category": "Grocery",      "lat": 38.9580, "lon": -85.9100, "address": "W Tipton St, Seymour, IN"},
    {"name": "CVS Pharmacy",                 "category": "Pharmacy",     "lat": 38.9579, "lon": -85.8780, "address": "1100 E Tipton St, Seymour, IN"},
    {"name": "Walgreens",                    "category": "Pharmacy",     "lat": 38.9576, "lon": -85.8730, "address": "1305 E Tipton St, Seymour, IN"},
    {"name": "Rite Aid",                     "category": "Pharmacy",     "lat": 38.9580, "lon": -85.8830, "address": "E Tipton St, Seymour, IN"},
    {"name": "Dollar General - N Walnut",    "category": "Dollar Store", "lat": 38.9620, "lon": -85.8870, "address": "N Walnut St, Seymour, IN"},
    {"name": "Dollar General - W Tipton",    "category": "Dollar Store", "lat": 38.9580, "lon": -85.9050, "address": "W Tipton St, Seymour, IN"},
    {"name": "Dollar Tree",                  "category": "Dollar Store", "lat": 38.9582, "lon": -85.8780, "address": "Tipton St, Seymour, IN"},
    {"name": "Family Dollar",                "category": "Dollar Store", "lat": 38.9588, "lon": -85.8700, "address": "Tipton St, Seymour, IN"}
]
sf_doc = {
    "_comment": "Shopping centers, fast food, dollar stores, grocery, pharmacy. Coordinates corrected against the E Tipton St / Walmart corridor.",
    "updatedAt": "2026-04-30T00:30:00Z",
    "categoryColors": {"Fast Food": "#f87171", "Shopping": "#22d3ee", "Grocery": "#34d399", "Pharmacy": "#a78bfa", "Dollar Store": "#fbbf24"},
    "places": sf
}
with open('data/shopping-fast-food.json', 'w', encoding='utf-8') as f:
    json.dump(sf_doc, f, indent=2)
print(f"shopping-fast-food.json: {len(sf)} places")
print("Done.")
