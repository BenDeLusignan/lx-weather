"""Download hourly-ish METARs (routine + special reports) for the Northern Ireland stations from the
Iowa Environmental Mesonet ASOS service into cache/obs/<STATION>.csv. Re-running overwrites the files.

usage: fetch_obs.py [--from 2024-01-01] [--to 2026-10-11]
"""
import argparse, datetime as dt, subprocess
from backtest_common import *

URL = ("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station={st}&data=sknt&data=gust&data=wxcodes&data=metar&data=drct"
       "&year1={y1}&month1={m1}&day1={d1}&year2={y2}&month2={m2}&day2={d2}&tz=Etc/UTC&format=onlycomma&latlon=yes&elev=no"
       "&missing=empty&trace=T&direct=no&report_type=3&report_type=4")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="start", default="2024-01-01")
    ap.add_argument("--to", dest="end", default=(dt.date.today() + dt.timedelta(days=1)).isoformat())
    a = ap.parse_args()
    s, e = dt.date.fromisoformat(a.start), dt.date.fromisoformat(a.end)
    (CACHE / "obs").mkdir(parents=True, exist_ok=True)
    for st in STATIONS:
        url = URL.format(st=st, y1=s.year, m1=s.month, d1=s.day, y2=e.year, m2=e.month, d2=e.day)
        out = CACHE / "obs" / f"{st}.csv"
        subprocess.run(["curl", "-s", "--max-time", "300", url, "-o", str(out)], check=True)
        print(st, sum(1 for _ in open(out)) - 1, "reports")
