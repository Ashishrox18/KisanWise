#!/usr/bin/env python3
"""
predict.py — Standalone inference for the trained XGBoost price-trend model.

Loads ../models/price-trend-model.json (+ feature_meta.json) and, given a
command-line JSON argument, prints a JSON result to stdout:
  { "direction": "rising"|"falling"|"stable",
    "magnitude_estimate": <number>,
    "confidence": <number> }

Run in isolation (no Node needed):
  python3 predict.py '{"commodity":"tomato","recent_prices":[1800,1820,1850,1870,1900,1920,1950,1980,2000,2030,2060,2090,2120,2150],"weather":{"temperature":26,"rainfall":2}}'

Input contract:
  - commodity:        crop name (matched case-insensitively against the trained map)
  - recent_prices:    list of recent daily modal prices, OLDEST → NEWEST
                      (last element = most recent). ~14 values ideal; fewer is OK.
  - weather (opt):    { "temperature": <C>, "rainfall": <mm> } — omitted → NaN.

On any failure (missing model, bad input) it writes a message to stderr and
exits non-zero WITHOUT printing a result, so the Node wrapper can treat that as
"no signal" and return null.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import statistics
import sys
from pathlib import Path

import numpy as np
import xgboost as xgb

HERE = Path(__file__).resolve().parent
MODELS = HERE.parent / "models"
MODEL_FILE = MODELS / "price-trend-model.json"
META_FILE = MODELS / "feature_meta.json"

# Import the shared seasonal flags from the ml/ folder (parent of inference/)
sys.path.insert(0, str(HERE.parent))
from seasonal_flags import harvest_flag, festival_flag


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: predict.py '<json>'", file=sys.stderr)
        return 1
    try:
        inp = json.loads(sys.argv[1])
    except Exception as e:  # noqa: BLE001
        print(f"invalid input json: {e}", file=sys.stderr)
        return 1

    if not MODEL_FILE.exists() or not META_FILE.exists():
        print("model or feature_meta not found — run train.py first", file=sys.stderr)
        return 1

    meta = json.loads(META_FILE.read_text())
    booster = xgb.Booster()
    booster.load_model(str(MODEL_FILE))

    commodity = str(inp.get("commodity") or "").strip().lower()
    prices = inp.get("recent_prices") or []
    weather = inp.get("weather") or {}

    comp_map = meta.get("commodity_map", {})
    comp_enc = comp_map.get(commodity, -1)

    if not prices or not isinstance(prices, list):
        print("recent_prices must be a non-empty list", file=sys.stderr)
        return 1

    try:
        prices = [float(p) for p in prices]
    except (TypeError, ValueError):
        print("recent_prices must be numeric", file=sys.stderr)
        return 1

    last = prices[-1]

    def pct_back(steps: int) -> float:
        if len(prices) > steps:
            prev = prices[-1 - steps]
            if prev:
                return (last / prev - 1) * 100
        return float("nan")

    pc1 = pct_back(1)
    pc7 = pct_back(7)
    pc14 = pct_back(14)

    win7 = prices[-7:] if len(prices) >= 7 else prices
    win14 = prices[-14:] if len(prices) >= 14 else prices
    rmean7 = statistics.fmean(win7) if win7 else last
    rstd7 = statistics.stdev(win7) if len(win7) >= 2 else 0.0
    rmean14 = statistics.fmean(win14) if win14 else last
    mom7 = (last / rmean7 - 1) if rmean7 else float("nan")
    rmin = float(min(win14)) if win14 else last
    rmax = float(max(win14)) if win14 else last
    prange = ((last - rmin) / (rmax - rmin)) if rmax != rmin else 0.5

    temp = weather.get("temperature") if isinstance(weather, dict) else None
    rain = weather.get("rainfall") if isinstance(weather, dict) else None
    temp_v = float(temp) if temp is not None else float("nan")
    rain_v = float(rain) if rain is not None else float("nan")

    # lagged volatility: std of recent daily returns (matches train.py volatility_7)
    if len(prices) >= 2:
        rets = [prices[i] / prices[i - 1] - 1.0 for i in range(1, len(prices))]
        last7 = rets[-7:]
        vol7 = statistics.stdev(last7) if len(last7) >= 2 else 0.0
    else:
        vol7 = 0.0

    now = dt.datetime.now()
    doy = now.timetuple().tm_yday
    feats = {
        "commodity_enc": comp_enc,
        "month": now.month,
        "day_of_year_sin": math.sin(2 * math.pi * doy / 365),
        "day_of_year_cos": math.cos(2 * math.pi * doy / 365),
        "last_price": last,
        "pct_change_1d": pc1,
        "pct_change_7d": pc7,
        "pct_change_14d": pc14,
        "rolling_mean_7": rmean7,
        "rolling_std_7": rstd7,
        "rolling_mean_14": rmean14,
        "momentum_7": mom7,
        "price_range_pct": prange,
        "volatility_7": vol7,
        "temp_mean": temp_v,
        "rainfall": rain_v,
        "harvest_flag": harvest_flag(commodity, now.month),
        "festival_flag": festival_flag(commodity, now.month),
    }

    cols = meta.get("feature_columns", list(feats.keys()))
    row = [feats.get(c, float("nan")) for c in cols]
    dmatrix = xgb.DMatrix(np.array([row], dtype=float), feature_names=cols)
    pred = float(booster.predict(dmatrix)[0])

    thr = float(meta.get("stable_threshold", 1.5))
    if pred > thr:
        direction = "rising"
    elif pred < -thr:
        direction = "falling"
    else:
        direction = "stable"

    magnitude = round(pred, 2)
    confidence = int(max(5, min(95, round(50 + (abs(pred) - thr) * 15))))

    print(json.dumps({
        "direction": direction,
        "magnitude_estimate": magnitude,
        "confidence": confidence,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
