"""Short-range reference with the app's REAL rain chances (precipitation_probability) from Open-Meteo's Historical Forecast API.

That API stitches the first hours of each model run, so this is NOT a day-ahead forecast: the effective lead is a few hours
(roughly 3-12 h). It is the only archive that holds the providers' precipitation_probability. Two sections:
  1. ECMWF, ICON, GFS, GEM (+ their mean) over 2026-06-01 .. 2026-10-10.
  2. all five incl. UKMO over 2026-09-22 .. 2026-10-10 only: before 2026-09-22 the archived UKMO probability is 0 in every hour
     (filler, not a forecast), so it cannot be scored.

usage: analyse_short_range.py   (fetches into cache/hf/, writes results/short_range.txt)
"""
import json, time, urllib.parse
import numpy as np
import pandas as pd
import analyse as A
from backtest_common import *

API = "https://historical-forecast-api.open-meteo.com/v1/forecast"
START, END = "2026-06-01", "2026-10-10"
UKMO_REAL_FROM = "2026-09-22"
MODEL_IDS = list(MODELS)

def fetch(st):
    f = CACHE / "hf" / f"{st}_{START}_{END}.json"
    if not f.exists():
        (CACHE / "hf").mkdir(parents=True, exist_ok=True)
        q = dict(latitude=STATIONS[st]["lat"], longitude=STATIONS[st]["lon"],
                 hourly="precipitation_probability,precipitation,wind_speed_10m", models=",".join(MODELS.values()),
                 start_date=START, end_date=END, wind_speed_unit="mph", timezone="UTC")
        f.write_text(json.dumps(curl_json(API + "?" + urllib.parse.urlencode(q, safe=","))))
        time.sleep(0.5)
    h = json.load(open(f))["hourly"]
    df = pd.DataFrame(h).set_index("time")
    df.index = pd.to_datetime(df.index, utc=True)
    return df.reindex(pd.date_range(df.index.min(), df.index.max(), freq="h"))

def load():
    metas, probs, wnds = [], [], []
    for st in STATIONS:
        ob = A.load_obs_blocks(st)
        fc = fetch(st)
        end = ob.index + pd.Timedelta(hours=1)
        n = len(ob)
        prob = np.full((n, 5), np.nan); wnd = np.full((n, 5), np.nan)
        for mi, m in enumerate(MODEL_IDS):
            M = MODELS[m]
            prob[:, mi] = fc[f"precipitation_probability_{M}"].reindex(end).to_numpy(float) / 100.0
            w = fc[f"wind_speed_10m_{M}"]
            wnd[:, mi] = (w.reindex(ob.index).to_numpy(float) + w.reindex(end).to_numpy(float)) / 2
        o = ob.copy(); o["station"] = st
        metas.append(o); probs.append(prob); wnds.append(wnd)
    meta = pd.concat(metas).reset_index().rename(columns={"block_utc": "block"})
    return meta, np.concatenate(probs), np.concatenate(wnds)

BINS = [(-0.01, 0.1), (0.1, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.01)]

def reliability_lines(named, y):
    out = []
    for name, p in named:
        cells = []
        for lo, hi in BINS:
            s = (p > lo) & (p <= hi)
            if s.sum():
                cells.append(f"{max(lo,0)*100:.0f}-{min(hi,1)*100:.0f}%: {100*y[s].mean():.0f}% (n={s.sum()})")
        out.append(f"  {name:18s} mean chance {100*p.mean():.0f}% | " + " | ".join(cells))
    return out

def fmt_rows(named, y, ow, truth, rng, groups, base_name):
    """named: [(label, rain_p, wind)] ; first-class comparison against `base_name`."""
    res = {n: A.row_losses(p, w, y, ow, truth) for n, p, w in named}
    lines = [f"  {'forecaster':34s}{'Brier':>8s}{'windMAE':>8s}{'bias':>6s}{'match%':>7s}{'off1%':>7s}{'off2%':>7s}{'g>r%':>6s}   dBrier vs {base_name} [95% CI]       dMatch pts [95% CI]"]
    for n, _, _ in named:
        l = res[n]
        if n == base_name:
            ext = ""
        else:
            b = A.cluster_boot(l["brier"] - res[base_name]["brier"], groups, rng)
            m = A.cluster_boot(l["exact"] - res[base_name]["exact"], groups, rng)
            ext = f"   {b[0]:+.4f} [{b[1]:+.4f},{b[2]:+.4f}]   {100*m[0]:+.1f} [{100*m[1]:+.1f},{100*m[2]:+.1f}]"
        lines.append(f"  {n:34s}{l['brier'].mean():>8.4f}{l['abs_err'].mean():>8.2f}{l['err'].mean():>6.2f}{100*l['exact'].mean():>7.1f}{100*l['off1'].mean():>7.1f}{100*l['off2'].mean():>7.2f}{100*l['opt2'].mean():>6.2f}{ext}")
    return lines

def main():
    meta, prob, wnd = load()
    rng = np.random.default_rng(7)
    lines = ["SHORT-RANGE REFERENCE (Historical Forecast API; effective lead a few hours; the real precipitation_probability fields)"]
    y_all = (meta["obs_sev"].to_numpy() >= 1).astype(float)
    ow_all = meta["obs_wind"].to_numpy()
    tr_all = np.maximum(np.where(meta["obs_sev"].to_numpy() >= 2, 2, np.where(meta["obs_sev"].to_numpy() == 1, 1, 0)), A.wind_light(ow_all))
    # ---- 1. four providers over the whole window
    ok = np.isfinite(prob[:, 1:]).all(axis=1) & np.isfinite(wnd).all(axis=1)
    m, p, w, y, ow, tr = meta[ok], prob[ok], wnd[ok], y_all[ok], ow_all[ok], tr_all[ok]
    g = m["date"].to_numpy()
    lines.append(f"\n--- 1. ECMWF/ICON/GFS/GEM real chances, {m.date.min()} .. {m.date.max()}: {len(m)} station-hour blocks, {m.date.nunique()} dates; "
                 f"observed rain {100*y.mean():.1f}%; climatology Brier {y.mean()*(1-y.mean()):.4f}")
    lines += reliability_lines([("mean of the four", p[:, 1:].mean(axis=1))] + [(MODEL_IDS[i], p[:, i]) for i in range(1, 5)], y)
    named = [("mean of four (rain) / median of four (wind)", p[:, 1:].mean(axis=1), np.median(w[:, 1:], axis=1))] + \
            [(f"{MODEL_IDS[i]} alone", p[:, i], w[:, i]) for i in range(1, 5)]
    lines += fmt_rows(named, y, ow, tr, rng, g, named[0][0])
    # ---- 2. all five, only where UKMO's chance is real
    ok5 = ok & np.isfinite(prob[:, 0]) & (meta["date"].to_numpy() >= UKMO_REAL_FROM)
    m, p, w, y, ow, tr = meta[ok5], prob[ok5], wnd[ok5], y_all[ok5], ow_all[ok5], tr_all[ok5]
    g = m["date"].to_numpy()
    lines.append(f"\n--- 2. all five incl. Met Office, {m.date.min()} .. {m.date.max()}: {len(m)} station-hour blocks, {m.date.nunique()} dates (INDICATIVE ONLY: a few weeks); "
                 f"observed rain {100*y.mean():.1f}%")
    lines.append(f"  UKMO's served chance takes only these values here: {sorted(set(np.round(100*p[:,0]).astype(int)))}")
    lines += reliability_lines([("current blend (mean of 5)", p.mean(axis=1)), ("Met Office alone", p[:, 0])] + [(MODEL_IDS[i], p[:, i]) for i in range(1, 5)], y)
    named = [("current blend", p.mean(axis=1), np.median(w, axis=1)), ("Met Office only", p[:, 0], w[:, 0]),
             ("blend of the other four", p[:, 1:].mean(axis=1), np.median(w[:, 1:], axis=1)),
             ("75% blend + 25% UKMO", .75 * p.mean(axis=1) + .25 * p[:, 0], .75 * np.median(w, axis=1) + .25 * w[:, 0])] + \
            [(f"{MODEL_IDS[i]} alone", p[:, i], w[:, i]) for i in range(1, 5)]
    lines += fmt_rows(named, y, ow, tr, rng, g, "current blend")
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "short_range.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
