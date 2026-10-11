#!/usr/bin/env bash
# Re-run the whole forecast backtest. Needs python3 and curl; first run creates .venv (numpy, pandas).
# Cached API responses live in cache/ (gitignored); delete cache/ to refetch from scratch.
# Open-Meteo calls: ~12 Previous-Runs calls per location per 3 years (cached), 3 stations + 8 club points.
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q numpy pandas; }
.venv/bin/python fetch_obs.py                       # METARs (IEM) for EGAA, EGAC, EGAE
.venv/bin/python fetch_forecasts.py EGAA EGAC EGAE  # Previous Runs API, whole archive (2024-01-01 ..)
.venv/bin/python fetch_forecasts.py belfast limavady larne coleraine ballymena newcastle omagh enniskillen --from 2025-10-01 --to 2026-10-10
.venv/bin/python analyse.py > /dev/null             # -> results/summary.txt, by_lead.csv, bootstrap.csv, reliability.csv
.venv/bin/python analyse_short_range.py > /dev/null # -> results/short_range.txt (Historical Forecast API, real rain chances)
echo "results in $(pwd)/results"
