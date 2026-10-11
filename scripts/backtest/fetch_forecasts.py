"""Fetch Open-Meteo Previous Runs API data (precipitation + 10 m wind at lead days 1-6, five models)
for each location in 90-day chunks, cached on disk (re-running only fetches what is missing).

usage: fetch_forecasts.py <loc> [<loc> ...] [--from 2024-01-01] [--to 2026-10-10]
<loc> is a station code (EGAA/EGAC/EGAE) or a club id from src/clubs/clubs.ts.
"""
import argparse, datetime as dt, json, time, urllib.parse
from backtest_common import *

API = "https://previous-runs-api.open-meteo.com/v1/forecast"
CHUNK_DAYS = 90

def locations():
    locs = {k: (v["lat"], v["lon"]) for k, v in STATIONS.items()}
    for k, v in load_clubs().items():
        locs[k] = (v["lat"], v["lon"])
    return locs

def hourly_vars():
    return [f"{v}_previous_day{n}" for v in VARS for n in LEADS]

def fetch(loc, start, end, sleep=0.4):
    lat, lon = locations()[loc]
    (CACHE / "fc").mkdir(parents=True, exist_ok=True)
    d0 = dt.date.fromisoformat(start)
    d1 = dt.date.fromisoformat(end)
    calls = 0
    while d0 <= d1:
        c1 = min(d0 + dt.timedelta(days=CHUNK_DAYS - 1), d1)
        f = CACHE / "fc" / f"{loc}_{d0}_{c1}.json"
        if not f.exists():
            q = dict(latitude=lat, longitude=lon, hourly=",".join(hourly_vars()),
                     models=",".join(MODELS.values()), start_date=str(d0), end_date=str(c1),
                     wind_speed_unit="mph", timezone="UTC", timeformat="iso8601")
            data = curl_json(API + "?" + urllib.parse.urlencode(q, safe=","))
            f.write_text(json.dumps(data))
            calls += 1
            time.sleep(sleep)
        d0 = c1 + dt.timedelta(days=1)
    return calls

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("locs", nargs="+")
    ap.add_argument("--from", dest="start", default="2024-01-01")
    ap.add_argument("--to", dest="end", default="2026-10-10")
    a = ap.parse_args()
    for loc in a.locs:
        n = fetch(loc, a.start, a.end)
        print(f"{loc}: {n} chunk calls made")
