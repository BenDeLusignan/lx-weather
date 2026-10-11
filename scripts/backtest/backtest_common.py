"""Shared config for the lx-weather forecast backtest (throwaway analysis; not shipped)."""
import json, os, re, subprocess, time, urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
RESULTS = HERE / "results"
REPO = HERE.parent.parent

# The app's five providers: src/forecast/providers.ts (id -> Open-Meteo model)
MODELS = {
    "ukmo": "ukmo_seamless",
    "ecmwf": "ecmwf_ifs025",
    "icon": "icon_seamless",
    "gfs": "gfs_seamless",
    "gem": "gem_seamless",
}
LEADS = [1, 2, 3, 4, 5, 6]
VARS = ["precipitation", "wind_speed_10m"]

# IEM ASOS/METAR stations in Northern Ireland (coordinates as IEM lists them)
STATIONS = {
    "EGAA": dict(name="Belfast International (Aldergrove)", lat=54.6633, lon=-6.2258),
    "EGAC": dict(name="Belfast City", lat=54.6135, lon=-5.8735),
    "EGAE": dict(name="City of Derry", lat=55.0428, lon=-7.1611),
}

def load_clubs():
    """Parse id/lat/lon from src/clubs/clubs.ts (top-level club entries only)."""
    src = (REPO / "src/clubs/clubs.ts").read_text()
    clubs = {}
    for m in re.finditer(r'\n    id: "([a-z]+)",\n    name: "([^"]+)",.*?\n    latitude: ([-0-9.]+),\n    longitude: ([-0-9.]+),', src, re.S):
        clubs[m.group(1)] = dict(name=m.group(2), lat=float(m.group(3)), lon=float(m.group(4)))
    return clubs

def haversine_km(a, b):
    from math import radians, sin, cos, asin, sqrt
    la1, lo1, la2, lo2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((la2 - la1) / 2) ** 2 + cos(la1) * cos(la2) * sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * asin(sqrt(h))

def nearest_station(lat, lon):
    best = min(STATIONS, key=lambda s: haversine_km((lat, lon), (STATIONS[s]["lat"], STATIONS[s]["lon"])))
    return best, haversine_km((lat, lon), (STATIONS[best]["lat"], STATIONS[best]["lon"]))

def curl_json(url, retries=6):
    """GET JSON through curl (the system Python here has no CA bundle)."""
    for i in range(retries):
        p = subprocess.run(["curl", "-s", "--max-time", "120", url], capture_output=True, text=True)
        try:
            d = json.loads(p.stdout)
        except Exception:
            d = None
        if d is not None and not (isinstance(d, dict) and d.get("error")):
            return d
        reason = (d or {}).get("reason", "no/invalid response") if isinstance(d, dict) or d is None else ""
        if d is not None and "limit" not in reason.lower():
            raise RuntimeError(f"Open-Meteo error: {reason}  url={url}")
        time.sleep(10 * (i + 1))
    raise RuntimeError(f"gave up after {retries} tries: {url}")
