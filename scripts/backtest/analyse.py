"""Score the five Open-Meteo providers and combiners against METAR observations, by lead time (1-6 days).

Data in:  cache/obs/<STATION>.csv   (fetch_obs.py)      Iowa Environmental Mesonet METARs
          cache/fc/<loc>_*.json     (fetch_forecasts.py) Open-Meteo Previous Runs API
Data out: results/summary.txt, results/by_lead.csv, results/bootstrap.csv, results/reliability.csv

Everything is evaluated per UK-time hour block 10:00-11:00 .. 21:00-22:00 exactly as src/forecast/blocks.ts builds
blocks: rain = the stamp at the block END (precipitation is the preceding-hour sum), wind = mean of the START and END stamps.
"""
import argparse, glob, json, re, sys
import numpy as np
import pandas as pd
from backtest_common import *

KT_TO_MPH = 1.150779
RAIN_MM = 0.1                    # a model "forecasts rain" in the hour when precipitation >= this (mm)
W_GRID = [0.0, 0.25, 0.5, 0.75, 1.0]   # UKMO share in w*UKMO + (1-w)*current blend
MODEL_IDS = list(MODELS)         # ukmo, ecmwf, icon, gfs, gem
N_BOOT = 2000
SEASONS = {"all year": range(1, 13), "Apr-Sep (tennis season)": range(4, 10)}

# ---------------------------------------------------------------- observations
PRECIP = re.compile(r"^([+-]?)(?:MI|BC|PR|DR|BL|SH|TS|FZ)*(?:DZ|RA|SN|SG|PL|GR|GS|UP)+$")

def precip_severity(wx):
    """0 none, 1 light (-), 2 moderate/heavy. Tokens starting VC (vicinity) or RE (recent) are not at-station weather."""
    if not isinstance(wx, str):
        return 0
    sev = 0
    for tok in wx.split():
        if tok.startswith(("VC", "RE")):
            continue
        m = PRECIP.match(tok)
        if m:
            sev = max(sev, 1 if m.group(1) == "-" else 2)
    return sev

def load_obs_blocks(station):
    d = pd.read_csv(CACHE / "obs" / f"{station}.csv", dtype={"wxcodes": str})
    t = pd.to_datetime(d["valid"]).dt.tz_localize("UTC").dt.tz_convert("Europe/London")
    d["local"] = t
    d["hour"] = t.dt.hour
    d = d[(d.hour >= 10) & (d.hour <= 21)].copy()
    d["mph"] = d["sknt"] * KT_TO_MPH
    d["sev"] = d["wxcodes"].map(precip_severity)
    d["block_utc"] = d["local"].dt.floor("h").dt.tz_convert("UTC")
    g = d.groupby("block_utc")
    out = pd.DataFrame({
        "n_obs": g.size(),
        "obs_wind": g["mph"].mean(),
        "obs_sev": g["sev"].max(),
    })
    out["date"] = out.index.tz_convert("Europe/London").strftime("%Y-%m-%d")
    out["month"] = out.index.tz_convert("Europe/London").month
    out["ym"] = out.index.tz_convert("Europe/London").strftime("%Y-%m")
    return out[out.n_obs >= 2]  # METARs come twice an hour; need both for a fair hourly value

# ---------------------------------------------------------------- forecasts
def load_fc(loc):
    files = sorted(glob.glob(str(CACHE / "fc" / f"{loc}_*.json")))
    frames = []
    for f in files:
        h = json.load(open(f))["hourly"]
        frames.append(pd.DataFrame(h).set_index("time"))
    df = pd.concat(frames)
    df = df[~df.index.duplicated()]
    df.index = pd.to_datetime(df.index, utc=True)
    return df.reindex(pd.date_range(df.index.min(), df.index.max(), freq="h"))

def block_arrays(fc, block_index):
    """AMT[n, lead, model] (rain amount at the block-end stamp) and WIND[n, lead, model] (mean of start & end stamps)."""
    n = len(block_index)
    amt = np.full((n, len(LEADS), len(MODEL_IDS)), np.nan)
    wnd = np.full((n, len(LEADS), len(MODEL_IDS)), np.nan)
    end_idx = block_index + pd.Timedelta(hours=1)
    for li, L in enumerate(LEADS):
        for mi, m in enumerate(MODEL_IDS):
            p = fc.get(f"precipitation_previous_day{L}_{MODELS[m]}")
            w = fc.get(f"wind_speed_10m_previous_day{L}_{MODELS[m]}")
            if p is not None:
                amt[:, li, mi] = p.reindex(end_idx).to_numpy(dtype=float)
            if w is not None:
                a = w.reindex(block_index).to_numpy(dtype=float)
                b = w.reindex(end_idx).to_numpy(dtype=float)
                wnd[:, li, mi] = (a + b) / 2
    return amt, wnd

def build_panel(pairs, balanced=True):
    """pairs: [(forecast_location, obs_station)]. balanced: rows = blocks where obs exist and every lead x model has rain and wind;
    otherwise every block with obs is kept (NaN where a model has no value) for per-lead filtering."""
    parts = []
    for loc, st in pairs:
        ob = load_obs_blocks(st)
        fc = load_fc(loc)
        amt, wnd = block_arrays(fc, ob.index)
        ok = (np.isfinite(amt).all(axis=(1, 2)) & np.isfinite(wnd).all(axis=(1, 2))) if balanced else np.ones(len(ob), bool)
        o = ob[ok].copy()
        o["loc"] = loc
        o["station"] = st
        parts.append((o, amt[ok], wnd[ok], ok.sum(), len(ob)))
    meta = pd.concat([p[0] for p in parts])
    amt = np.concatenate([p[1] for p in parts])
    wnd = np.concatenate([p[2] for p in parts])
    return meta.reset_index().rename(columns={"block_utc": "block"}), amt, wnd, [(p[3], p[4]) for p in parts]

# ---------------------------------------------------------------- lights (src/forecast/rain-light.ts, wind-light.ts)
def rnd(x):
    return np.floor(np.asarray(x, dtype=float) + 0.5)  # JS Math.round

def rain_light(pct):
    r = rnd(pct)
    return np.where(r > 70, 2, np.where(r > 30, 1, 0))

def wind_light(mph):
    r = rnd(mph)
    return np.where(r > 15, 2, np.where(r >= 10, 1, 0))

# ---------------------------------------------------------------- calibration of amount -> chance (cross-validated)
BIN_EDGES = [0.05, 0.15, 0.35, 0.75, 1.5]   # amounts are reported to 0.1 mm

def calibrated(amt_l, y, ym):
    """amt_l [n, model] -> P(rain) [n, model], per model amount-bin observed frequency, leave-one-month-out."""
    n, M = amt_l.shape
    out = np.zeros((n, M))
    months = np.unique(ym)
    for mi in range(M):
        b = np.digitize(amt_l[:, mi], BIN_EDGES)
        nb = len(BIN_EDGES) + 1
        tot_n = np.bincount(b, minlength=nb).astype(float)
        tot_y = np.bincount(b, weights=y, minlength=nb)
        for mo in months:
            sel = ym == mo
            bn = np.bincount(b[sel], minlength=nb).astype(float)
            by = np.bincount(b[sel], weights=y[sel], minlength=nb)
            rate = (tot_y - by + 0.5) / (tot_n - bn + 1.0)   # Laplace-smoothed, month held out
            out[sel, mi] = rate[b[sel]]
    return out

# ---------------------------------------------------------------- combiners
def make_forecasts(amt_l, wnd_l, p_model, w):
    """Per-row rain chance (0-1) and wind (mph) for a combiner = w*UKMO + (1-w)*blend, blend = mean rain / median wind of five."""
    blend_rain = p_model.mean(axis=1)
    blend_wind = np.median(wnd_l, axis=1)
    return w * p_model[:, 0] + (1 - w) * blend_rain, w * wnd_l[:, 0] + (1 - w) * blend_wind

def row_losses(rain_p, wind_v, y, ow, truth_light):
    """Per-row loss arrays for one forecast."""
    light = np.maximum(rain_light(rain_p * 100), wind_light(wind_v))
    d = light - truth_light  # >0 forecast worse (pessimistic), <0 forecast lighter (optimistic)
    wd = wind_light(wind_v) - wind_light(ow)
    return {
        "brier": (rain_p - y) ** 2,
        "abs_err": np.abs(wind_v - ow),
        "err": wind_v - ow,
        "exact": (d == 0).astype(float),
        "off1": (np.abs(d) == 1).astype(float),
        "off2": (np.abs(d) == 2).astype(float),
        "opt1": (d == -1).astype(float),
        "opt2": (d == -2).astype(float),   # forecast green, truth red: the costly miss
        "pes1": (d == 1).astype(float),
        "pes2": (d == 2).astype(float),
        "wexact": (wd == 0).astype(float),
        "woff1": (np.abs(wd) == 1).astype(float),
        "woff2": (np.abs(wd) == 2).astype(float),
        "wopt2": (wd == -2).astype(float),   # wind forecast green, observed red
        "wpes2": (wd == 2).astype(float),
    }

def cluster_boot(diff, groups, rng, n_boot=N_BOOT):
    """95% CI of mean(diff) resampling whole dates (blocks within a date are strongly correlated)."""
    codes, uniq = pd.factorize(groups)
    s = np.bincount(codes, weights=diff)
    c = np.bincount(codes).astype(float)
    k = len(uniq)
    idx = rng.integers(0, k, size=(n_boot, k))
    est = s[idx].sum(axis=1) / c[idx].sum(axis=1)
    return diff.mean(), np.percentile(est, 2.5), np.percentile(est, 97.5)

# ---------------------------------------------------------------- scoring
def score_all(meta, amt, wnd, truth_mode, rain_mode, extra_ws=(), leads=None, given=None):
    """Return dict[(combiner, lead)] -> loss dict, plus bookkeeping. combiner names:
    single:<model>, w<value> (UKMO share), blend4 (mean/median of the four non-UKMO)."""
    y = (meta["obs_sev"].to_numpy() >= (2 if truth_mode == "moderate" else 1)).astype(float)
    ow = meta["obs_wind"].to_numpy()
    sev = meta["obs_sev"].to_numpy()
    if truth_mode == "intensity":
        tr_rain = np.where(sev >= 2, 2, np.where(sev == 1, 1, 0))
    elif truth_mode == "moderate":   # only moderate/heavy precipitation counts (light drizzle/-RA ignored)
        tr_rain = np.where(sev >= 2, 2, 0)
    else:   # any precipitation at all = red
        tr_rain = np.where(sev >= 1, 2, 0)
    truth_light = np.maximum(tr_rain, wind_light(ow))
    ym = meta["ym"].to_numpy()
    out = {}
    pcache = {}
    for li, L in enumerate(leads or LEADS):
        a, w_ = amt[:, li, :], wnd[:, li, :]
        if rain_mode == "binary":
            p = (a >= RAIN_MM - 1e-9).astype(float)
        elif rain_mode == "given":
            p = given[:, li, :]   # real model probabilities (0-1), [n, lead, model]
        else:
            p = calibrated(a, y, ym)
        pcache[L] = p
        for wv in sorted(set(W_GRID) | set(extra_ws)):
            rp, wv_ = make_forecasts(a, w_, p, wv)
            out[(f"w{wv:.2f}", L)] = row_losses(rp, wv_, y, ow, truth_light)
        for mi, m in enumerate(MODEL_IDS):
            out[(f"single:{m}", L)] = row_losses(p[:, mi], w_[:, mi], y, ow, truth_light)
        out[("blend4", L)] = row_losses(p[:, 1:].mean(axis=1), np.median(w_[:, 1:], axis=1), y, ow, truth_light)
    base = y.mean()
    clim = {"brier": base * (1 - base), "mae": np.abs(ow - np.median(ow)).mean(), "base_rate": base}
    return out, clim, truth_light, y, ow

NAMES = {"w0.00": "current blend (mean rain, median wind)", "w1.00": "Met Office only",
         "w0.25": "mix: 25% UKMO + 75% blend", "w0.50": "mix: 50% UKMO + 50% blend", "w0.75": "mix: 75% UKMO + 25% blend",
         "blend4": "blend of the other four (no UKMO)"}
for m in MODEL_IDS:
    NAMES[f"single:{m}"] = f"{m} alone"

def table_rows(out, clim, combos, leads=LEADS):
    rows = []
    for c in combos:
        for L in leads:
            l = out[(c, L)]
            rows.append(dict(combiner=c, lead=L, n=len(l["brier"]),
                             brier=l["brier"].mean(), bss=1 - l["brier"].mean() / clim["brier"],
                             wind_mae=l["abs_err"].mean(), wind_bias=l["err"].mean(),
                             light_exact=100 * l["exact"].mean(), off1=100 * l["off1"].mean(), off2=100 * l["off2"].mean(),
                             opt2=100 * l["opt2"].mean(), pes2=100 * l["pes2"].mean(),
                             opt1=100 * l["opt1"].mean(), pes1=100 * l["pes1"].mean()))
    return pd.DataFrame(rows)

def fmt_table(df, title):
    lines = [title]
    lines.append(f"{'combiner':44s}{'lead':>4s}{'n':>7s}{'Brier':>8s}{'BSS':>7s}{'windMAE':>8s}{'bias':>6s}{'match%':>7s}{'off1%':>7s}{'off2%':>7s}{'(g>r)%':>7s}{'(r>g)%':>7s}")
    last = None
    for _, r in df.iterrows():
        if last is not None and r.lead == 1 and last != r.combiner:
            lines.append("")
        last = r.combiner
        lines.append(f"{NAMES.get(r.combiner, r.combiner):44s}{r.lead:>4d}{r.n:>7d}{r.brier:>8.4f}{r.bss:>7.3f}{r.wind_mae:>8.2f}{r.wind_bias:>6.2f}"
                     f"{r.light_exact:>7.1f}{r.off1:>7.1f}{r.off2:>7.2f}{r.opt2:>7.2f}{r.pes2:>7.2f}")
    return "\n".join(lines)

# schedules evaluated over all six leads pooled: lead -> UKMO share
SCHEDULES = {
    "current blend everywhere (w=0)": {L: 0.0 for L in LEADS},
    "Met Office only everywhere (w=1)": {L: 1.0 for L in LEADS},
    "hard switch: UKMO only lead 1, blend after": {L: 1.0 if L <= 1 else 0.0 for L in LEADS},
    "hard switch: UKMO only lead 1-2, blend after": {L: 1.0 if L <= 2 else 0.0 for L in LEADS},
    "hard switch: UKMO only lead 1-3, blend after": {L: 1.0 if L <= 3 else 0.0 for L in LEADS},
    "hard switch: UKMO only lead 1-4, blend after": {L: 1.0 if L <= 4 else 0.0 for L in LEADS},
    "taper 1,.75,.5,.25,0,0 (UKMO share)": dict(zip(LEADS, [1.0, 0.75, 0.5, 0.25, 0.0, 0.0])),
    "taper 1,.67,.33,0,0,0": dict(zip(LEADS, [1.0, 0.67, 0.33, 0.0, 0.0, 0.0])),
    "taper 1,.83,.67,.5,.33,.17": dict(zip(LEADS, [1.0, 0.83, 0.67, 0.5, 0.33, 0.17])),
    "taper .5,.5,.25,0,0,0": dict(zip(LEADS, [0.5, 0.5, 0.25, 0.0, 0.0, 0.0])),
}
SCHED_WS = sorted({w for s in SCHEDULES.values() for w in s.values()})

def schedule_losses(out, sched, key):
    return np.concatenate([out[(f"w{sched[L]:.2f}", L)][key] for L in LEADS])

def run_headline(meta, amt, wnd, truth_mode, rain_mode, label, rng, lines, csv_rows, boot_rows, full=True):
    out, clim, truth, y, ow = score_all(meta, amt, wnd, truth_mode, rain_mode, extra_ws=SCHED_WS)
    groups = meta["date"].to_numpy()
    combos = ["single:ukmo", "single:ecmwf", "single:icon", "single:gfs", "single:gem", "blend4", "w0.00", "w1.00", "w0.25", "w0.50", "w0.75"]
    df = table_rows(out, clim, combos)
    df.insert(0, "setting", label)
    csv_rows.append(df)
    lines.append(f"\n=== {label} ===  rows per lead = {len(y)} blocks; observed rain in {100*y.mean():.1f}% of blocks "
                 f"(rain event as defined by this truth setting); climatology Brier {clim['brier']:.4f}; wind MAE of a constant = {clim['mae']:.2f} mph")
    lines.append(fmt_table(df[df.combiner.isin(["w0.00", "w1.00"] + ([c for c in combos if c.startswith('single')] if full else []))],
                           "Per lead (balanced panel: same blocks at every lead and for every model)"))
    if full:
        lines.append("\nWIND ONLY (the part that transfers directly to the app: same variable, same models, same rules). Light from wind alone vs observed wind light.")
        lines.append(f"{'combiner':44s}{'lead':>4s}{'MAE':>7s}{'bias':>6s}{'match%':>8s}{'off1%':>7s}{'off2%':>7s}{'g>r %':>7s}")
        for c in ["w0.00", "w1.00", "w0.25", "blend4", "single:ecmwf", "single:icon", "single:gfs", "single:gem"]:
            for L in LEADS:
                l = out[(c, L)]
                lines.append(f"{NAMES.get(c, c):44s}{L:>4d}{l['abs_err'].mean():>7.2f}{l['err'].mean():>6.2f}{100*l['wexact'].mean():>8.1f}{100*l['woff1'].mean():>7.1f}{100*l['woff2'].mean():>7.2f}{100*l['wopt2'].mean():>7.2f}")
        lines.append("Wind-only match%, difference vs current blend [95% CI]:")
        for c in ["w1.00", "w0.25", "w0.50", "w0.75"]:
            cells = []
            for L in LEADS:
                r = cluster_boot(out[(c, L)]["wexact"] - out[("w0.00", L)]["wexact"], groups, rng)
                cells.append(f"L{L} {100*r[0]:+.1f} [{100*r[1]:+.1f},{100*r[2]:+.1f}]")
            lines.append(f"  {NAMES.get(c, c):40s} " + "  ".join(cells))
    # --- paired bootstrap per lead: every combiner vs the current blend
    lines.append("\nDifference vs current blend, per lead (negative = better for Brier/MAE; positive = better for match%/off2 lower). 95% CI by date-cluster bootstrap.")
    lines.append(f"{'combiner':44s}{'lead':>4s}{'dBrier':>20s}{'dWindMAE':>22s}{'dMatch pts':>22s}{'dOff2 pts':>22s}")
    cmp_list = ["single:ukmo", "w0.75", "w0.50", "w0.25", "blend4"] + (["single:ecmwf", "single:icon", "single:gfs", "single:gem"] if full else [])
    for c in cmp_list:
        for L in LEADS:
            a, b = out[(c, L)], out[("w0.00", L)]
            r = {}
            for key in ["brier", "abs_err", "exact", "off2"]:
                r[key] = cluster_boot(a[key] - b[key], groups, rng)
            scale = lambda t: tuple(100 * v for v in t)
            lines.append(f"{NAMES.get(c, c):44s}{L:>4d}"
                         f"{r['brier'][0]:>+10.4f} [{r['brier'][1]:+.4f},{r['brier'][2]:+.4f}]"
                         f"{r['abs_err'][0]:>+8.2f} [{r['abs_err'][1]:+.2f},{r['abs_err'][2]:+.2f}]"
                         f"{100*r['exact'][0]:>+8.1f} [{100*r['exact'][1]:+.1f},{100*r['exact'][2]:+.1f}]"
                         f"{100*r['off2'][0]:>+8.2f} [{100*r['off2'][1]:+.2f},{100*r['off2'][2]:+.2f}]")
            boot_rows.append(dict(setting=label, combiner=c, lead=L, n=len(groups),
                                  **{f"{k}_{s}": v for k, t in r.items() for s, v in zip(["diff", "lo", "hi"], t)}))
    # --- schedules pooled over leads 1-6
    lines.append("\nSchedules pooled over leads 1-6 (equal weight per lead). Difference vs current blend, 95% CI (date-cluster bootstrap).")
    lines.append(f"{'schedule':48s}{'Brier':>8s}{'dBrier [CI]':>26s}{'windMAE':>8s}{'dMAE [CI]':>24s}{'match%':>7s}{'dMatch [CI]':>22s}{'off2%':>7s}")
    base = {k: schedule_losses(out, SCHEDULES["current blend everywhere (w=0)"], k) for k in ["brier", "abs_err", "exact", "off2"]}
    gl = np.tile(groups, len(LEADS))
    for name, sched in SCHEDULES.items():
        cur = {k: schedule_losses(out, sched, k) for k in base}
        if name.startswith("current"):
            lines.append(f"{name:48s}{cur['brier'].mean():>8.4f}{'':>26s}{cur['abs_err'].mean():>8.2f}{'':>24s}{100*cur['exact'].mean():>7.1f}{'':>22s}{100*cur['off2'].mean():>7.2f}")
            continue
        rs = {k: cluster_boot(cur[k] - base[k], gl, rng) for k in base}
        lines.append(f"{name:48s}{cur['brier'].mean():>8.4f}{rs['brier'][0]:>+10.4f} [{rs['brier'][1]:+.4f},{rs['brier'][2]:+.4f}]"
                     f"{cur['abs_err'].mean():>8.2f}{rs['abs_err'][0]:>+8.2f} [{rs['abs_err'][1]:+.2f},{rs['abs_err'][2]:+.2f}]"
                     f"{100*cur['exact'].mean():>7.1f}{100*rs['exact'][0]:>+8.1f} [{100*rs['exact'][1]:+.1f},{100*rs['exact'][2]:+.1f}]"
                     f"{100*cur['off2'].mean():>7.2f}")
    return out, clim, truth, y, ow

def reliability(meta, amt, wnd, rain_mode, lines, rel_rows):
    """When the blend/UKMO/ECMWF says X%, how often did it rain? Pooled in lead groups."""
    y = (meta["obs_sev"].to_numpy() >= 1).astype(float)
    ym = meta["ym"].to_numpy()
    lines.append(f"\n--- Reliability ({rain_mode} rain proxy): forecast chance bin -> observed frequency of rain in the hour (n) ---")
    for name, pick in [("current blend", "blend"), ("Met Office alone", 0), ("ECMWF alone", 1)]:
        for grp in [(1, 2), (3, 4), (5, 6)]:
            ps = []
            for L in grp:
                li = LEADS.index(L)
                a = amt[:, li, :]
                p = (a >= RAIN_MM - 1e-9).astype(float) if rain_mode == "binary" else calibrated(a, y, ym)
                ps.append(p.mean(axis=1) if pick == "blend" else p[:, pick])
            p = np.concatenate(ps)
            yy = np.tile(y, len(grp))
            if rain_mode == "binary" and pick != "blend":
                bins = [(-0.01, 0.5), (0.5, 1.01)]
            else:
                bins = [(-0.01, 0.1), (0.1, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.01)]
            cells = []
            for lo, hi in bins:
                s = (p > lo) & (p <= hi)
                if s.sum():
                    cells.append(f"{max(lo,0)*100:.0f}-{min(hi,1)*100:.0f}%: {100*yy[s].mean():.0f}% (n={s.sum()})")
                    rel_rows.append(dict(rain_mode=rain_mode, forecaster=name, leads=f"{grp[0]}-{grp[1]}", bin=f"{lo:.2f}-{hi:.2f}", n=int(s.sum()), observed=yy[s].mean()))
            lines.append(f"{name:18s} lead {grp[0]}-{grp[1]}: " + " | ".join(cells))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clubs", default="belfast,limavady,larne,coleraine,ballymena,newcastle,omagh,enniskillen")
    a = ap.parse_args()
    RESULTS.mkdir(exist_ok=True)
    rng = np.random.default_rng(12345)
    lines, csv_rows, boot_rows, rel_rows = [], [], [], []

    # ----- data description
    pairs = [(s, s) for s in STATIONS]
    meta, amt, wnd, counts = build_panel(pairs)
    lines.append("DATA")
    for (s, (ok, tot)) in zip(STATIONS, counts):
        sub = meta[meta.station == s]
        lines.append(f"  {s} {STATIONS[s]['name']}: {ok} usable blocks of {tot} blocks with >=2 METARs; {sub.date.min()} .. {sub.date.max()}")
    # forecast availability per model (any lead), at each station, share of observed blocks with data
    lines.append("  Forecast availability (share of observed 10-22h blocks with a value, by model; precipitation / wind), per station and lead 1 / 6:")
    for s in STATIONS:
        ob = load_obs_blocks(s)
        fc = load_fc(s)
        a_, w_ = block_arrays(fc, ob.index)
        for m_i, m in enumerate(MODEL_IDS):
            first = fc[f"wind_speed_10m_previous_day1_{MODELS[m]}"].dropna().index.min()
            lines.append(f"    {s} {m:6s} first wind value (lead1) {first.date()} | " + ", ".join(
                f"lead{L}: rain {100*np.isfinite(a_[:, li, m_i]).mean():.0f}% wind {100*np.isfinite(w_[:, li, m_i]).mean():.0f}%" for li, L in [(0, 1), (5, 6)]))
    lines.append(f"  Balanced panel used for headline tables: {len(meta)} station-hour blocks across {meta.date.nunique()} dates "
                 f"({meta.date.min()} .. {meta.date.max()}); every block has all five models at all six leads.")
    for s in STATIONS:
        sub = meta[meta.station == s]
        lines.append(f"    {s}: {len(sub)} blocks, {sub.date.nunique()} dates; rain observed (any) {100*(sub.obs_sev>=1).mean():.1f}%, moderate+ {100*(sub.obs_sev>=2).mean():.1f}%; mean wind {sub.obs_wind.mean():.1f} mph")
    lines.append("  Club -> nearest METAR station:")
    for k, v in load_clubs().items():
        st, d = nearest_station(v["lat"], v["lon"])
        lines.append(f"    {k:12s} {st}  {d:5.1f} km")

    # ----- headline: stations, all year, both rain proxies, both truth definitions
    for rain_mode in ["binary", "calibrated"]:
        reliability(meta, amt, wnd, rain_mode, lines, rel_rows)
    for rain_mode in ["binary", "calibrated"]:
        label = f"STATIONS, all year, rain={rain_mode}, truth=intensity"
        run_headline(meta, amt, wnd, "intensity", rain_mode, label, rng, lines, csv_rows, boot_rows)
    # sensitivities
    run_headline(meta, amt, wnd, "anyrain", "calibrated", "STATIONS, all year, rain=calibrated, truth=any precipitation is red", rng, lines, csv_rows, boot_rows, full=False)
    run_headline(meta, amt, wnd, "moderate", "calibrated", "STATIONS, all year, rain=calibrated, truth=only moderate/heavy precipitation counts as rain", rng, lines, csv_rows, boot_rows, full=False)
    sea = meta["month"].isin(range(4, 10)).to_numpy()
    run_headline(meta[sea].reset_index(drop=True), amt[sea], wnd[sea], "intensity", "calibrated", "STATIONS, Apr-Sep only, rain=calibrated, truth=intensity", rng, lines, csv_rows, boot_rows, full=False)
    run_headline(meta[~sea].reset_index(drop=True), amt[~sea], wnd[~sea], "intensity", "calibrated", "STATIONS, Oct-Mar only, rain=calibrated, truth=intensity", rng, lines, csv_rows, boot_rows, full=False)
    for s in STATIONS:
        sel = (meta.station == s).to_numpy()
        run_headline(meta[sel].reset_index(drop=True), amt[sel], wnd[sel], "intensity", "calibrated", f"STATION {s} only, rain=calibrated, truth=intensity", rng, lines, csv_rows, boot_rows, full=False)

    # ----- looser panel: each lead uses every block where all five models have data at THAT lead (more rows at some leads)
    pm, pa, pw, _ = build_panel(pairs, balanced=False)
    for rain_mode in ["binary", "calibrated"]:
        lines.append(f"\n=== PER-LEAD PANEL (each lead uses all blocks where all five models have rain+wind at that lead), rain={rain_mode}, truth=intensity ===")
        lines.append(f"{'combiner':44s}{'lead':>4s}{'n':>7s}{'Brier':>8s}{'BSS':>7s}{'windMAE':>8s}{'bias':>6s}{'match%':>7s}{'off1%':>7s}{'off2%':>7s}{'(g>r)%':>7s}{'(r>g)%':>7s}")
        dfs, diffs = [], []
        for li, L in enumerate(LEADS):
            ok = np.isfinite(pa[:, li, :]).all(axis=1) & np.isfinite(pw[:, li, :]).all(axis=1)
            sub = pm[ok].reset_index(drop=True)
            out, clim, _, _, _ = score_all(sub, pa[ok][:, [li], :], pw[ok][:, [li], :], "intensity", rain_mode, leads=[L])
            combos = ["single:ukmo", "single:ecmwf", "single:icon", "single:gfs", "single:gem", "blend4", "w0.00", "w1.00", "w0.25", "w0.50", "w0.75"]
            dfs.append(table_rows(out, clim, combos, leads=[L]))
            g = sub["date"].to_numpy()
            for c in combos:
                if c == "w0.00":
                    continue
                r = {k: cluster_boot(out[(c, L)][k] - out[("w0.00", L)][k], g, rng) for k in ["brier", "abs_err", "exact", "off2"]}
                diffs.append(dict(setting=f"perlead panel rain={rain_mode}", combiner=c, lead=L, n=len(g),
                                  **{f"{k}_{s}": v for k, t in r.items() for s, v in zip(["diff", "lo", "hi"], t)}))
        order = {c: i for i, c in enumerate(["w0.00", "w1.00", "w0.25", "w0.50", "w0.75", "blend4"] + [f"single:{m}" for m in MODEL_IDS])}
        df = pd.concat(dfs)
        df = df.assign(_o=df["combiner"].map(order)).sort_values(["_o", "lead"]).drop(columns="_o")
        lines.append(fmt_table(df, ""))
        lines.append("Differences vs current blend (95% CI, date-cluster bootstrap): dBrier | dWindMAE | dMatch pts | dOff2 pts")
        for d in diffs:
            lines.append(f"{NAMES.get(d['combiner'], d['combiner']):44s}{d['lead']:>4d}{d['n']:>7d}  "
                         f"{d['brier_diff']:+.4f} [{d['brier_lo']:+.4f},{d['brier_hi']:+.4f}] | "
                         f"{d['abs_err_diff']:+.2f} [{d['abs_err_lo']:+.2f},{d['abs_err_hi']:+.2f}] | "
                         f"{100*d['exact_diff']:+.1f} [{100*d['exact_lo']:+.1f},{100*d['exact_hi']:+.1f}] | "
                         f"{100*d['off2_diff']:+.2f} [{100*d['off2_lo']:+.2f},{100*d['off2_hi']:+.2f}]")
        csv_rows.append(pd.concat(dfs).assign(setting=f"perlead panel rain={rain_mode}"))
        boot_rows.extend(diffs)

    # ----- club points vs nearest station (all clubs in --clubs that have cached forecasts)
    clubs = load_clubs()
    lines.append("\n\n=== CLUB POINTS: forecast fetched at the club's coordinates, scored against the NEAREST station's METARs ===")
    lines.append("(extra mismatch noise = distance; same period for every club; blend vs UKMO only; rain=calibrated)")
    lines.append(f"{'club':12s}{'stn':>5s}{'km':>6s}{'n':>6s} | " + " | ".join(f"lead{L}: Brier blend/ukmo  MAE blend/ukmo  match blend/ukmo" for L in (1, 3, 6)))
    for cid in a.clubs.split(","):
        if not glob.glob(str(CACHE / "fc" / f"{cid}_*.json")):
            continue
        st, d = nearest_station(clubs[cid]["lat"], clubs[cid]["lon"])
        m2, a2, w2, _ = build_panel([(cid, st)])
        if len(m2) < 200:
            lines.append(f"{cid:12s}{st:>5s}{d:>6.1f}{len(m2):>6d} | too few blocks")
            continue
        out, clim, _, _, _ = score_all(m2, a2, w2, "intensity", "calibrated")
        cells = []
        for L in (1, 3, 6):
            b, u = out[("w0.00", L)], out[("w1.00", L)]
            cells.append(f"{b['brier'].mean():.3f}/{u['brier'].mean():.3f}   {b['abs_err'].mean():.2f}/{u['abs_err'].mean():.2f}   {100*b['exact'].mean():.0f}/{100*u['exact'].mean():.0f}%")
        lines.append(f"{cid:12s}{st:>5s}{d:>6.1f}{len(m2):>6d} | " + " | ".join(cells))
        csv_rows.append(table_rows(out, clim, ["w0.00", "w1.00"]).assign(setting=f"CLUB {cid} -> {st} {d:.0f}km"))

    pd.concat(csv_rows).to_csv(RESULTS / "by_lead.csv", index=False, float_format="%.5f")
    pd.DataFrame(boot_rows).to_csv(RESULTS / "bootstrap.csv", index=False, float_format="%.5f")
    pd.DataFrame(rel_rows).to_csv(RESULTS / "reliability.csv", index=False, float_format="%.5f")
    (RESULTS / "summary.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
