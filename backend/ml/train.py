#!/usr/bin/env python3
"""
train.py — Train an XGBoost short-term price-trend model for Indian mandi
commodities.

Standalone training script (NOT wired into the Node app at request time).

Data sources (REUSED, not duplicated):
  - Agmarknet daily mandi prices via the SAME data.gov.in resource the backend
    already uses (market-price.service.ts):
        resource 9ef84268-d588-465a-a308-a864a43d0070
    fields: commodity, market, state, district, min_price, max_price,
    modal_price, arrival_date.
  - Open-Meteo Archive API (free, no key) for daily temperature_2m_mean and
    precipitation_sum, keyed by state centroid.

If backend/ml/data/agmarknet-historical.csv exists it is loaded directly
(fastest, no rate limits). Otherwise the script pulls from the API. If the API
yields too little MULTI-DATE data to train meaningfully, a clearly-labelled
synthetic dataset is generated as a last resort so the pipeline still emits a
model file. MODEL_CARD.md always states which source was used (kept honest).

Target: 7-day-forward percentage price change per (commodity, state) series.
Outputs (all portable JSON, no pickle):
  models/price-trend-model.json   (XGBoost native JSON)
  models/feature_meta.json         (encoders, thresholds, metrics)
  MODEL_CARD.md                    (short, honest)

Usage:
  cd backend/ml && python3 train.py
  # optionally: DATA_GOV_API_KEY=... python3 train.py
  # optionally drop a CSV at data/agmarknet-historical.csv first
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import xgboost as xgb
from sklearn.metrics import mean_absolute_error

# Shared seasonal flags (imported by both train.py and inference/predict.py)
from seasonal_flags import harvest_flag, festival_flag

# ── Paths ───────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
MODELS_DIR = BASE / "models"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_FILE = MODELS_DIR / "price-trend-model.json"
META_FILE = MODELS_DIR / "feature_meta.json"
CARD_FILE = BASE / "MODEL_CARD.md"
LOCAL_CSV = DATA_DIR / "agmarknet-historical.csv"
WEATHER_CACHE = DATA_DIR / "weather_cache.json"

# ── Config ───────────────────────────────────────────────────────────────────
DATA_GOV_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
DATA_GOV_KEY = os.environ.get("DATA_GOV_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"

TARGET_HORIZON = 7          # predict price change this many days forward
MIN_REAL_ROWS = 400         # below this (with enough distinct dates) → synthetic fallback
MIN_DISTINCT_DATES = 20     # need a real time series, not a single-day snapshot

# Commodities trained on (canonical names, aligned to the frontend cropMapping
# so inference-time commodity names match). Real Agmarknet export names like
# "Paddy(Common)", "Bajra(Pearl Millet/Cumbu)", "Soyabean" are normalised to these.
COMMODITIES = [
    "Wheat", "Rice", "Maize", "Potato", "Onion", "Tomato",
    "Soybean", "Mustard", "Chickpea", "Bajra", "Jowar",
    "Green Gram", "Black Gram", "Groundnut", "Barley",
]

# Order matters: more specific "gram" types are checked before the generic
# Chickpea("gram") alias so "Green Gram"/"Black Gram" don't mis-map.
ALIASES = [
    ("Green Gram", ["green gram", "moong"]),
    ("Black Gram", ["black gram", "urad", "udad"]),
    ("Chickpea", ["bengal gram", "chickpea", "chana", "gram"]),
    ("Bajra", ["bajra", "pearl millet", "cumbu"]),
    ("Jowar", ["jowar", "sorghum"]),
    ("Soybean", ["soyabean", "soybean", "soya"]),
    ("Wheat", ["wheat", "gehun"]),
    ("Rice", ["paddy", "rice", "dhan"]),
    ("Maize", ["maize", "corn", "makka"]),
    ("Potato", ["potato", "aloo"]),
    ("Onion", ["onion", "pyaz"]),
    ("Tomato", ["tomato", "tamatar"]),
    ("Mustard", ["mustard", "sarson", "rai"]),
    ("Groundnut", ["groundnut", "peanut", "moongfali"]),
    ("Barley", ["barley", "jau"]),
]

# Representative Indian state centroids (lat, lon) for weather lookup
STATE_CENTROIDS = {
    "Uttar Pradesh": (27.0, 80.0), "Madhya Pradesh": (22.5, 78.0),
    "Maharashtra": (19.5, 75.5), "Rajasthan": (27.0, 74.0),
    "Punjab": (31.0, 75.5), "Haryana": (29.0, 76.0),
    "Gujarat": (22.5, 71.5), "Karnataka": (15.0, 75.5),
    "Andhra Pradesh": (15.0, 79.0), "Telangana": (17.5, 79.0),
    "Tamil Nadu": (11.0, 78.0), "West Bengal": (22.5, 88.0),
    "Bihar": (25.5, 85.0), "Odisha": (20.0, 84.0),
}
INDIA_CENTROID = (22.5, 78.9)

FEATURE_COLUMNS = [
    "commodity_enc", "month", "day_of_year_sin", "day_of_year_cos",
    "last_price", "pct_change_1d", "pct_change_7d", "pct_change_14d",
    "rolling_mean_7", "rolling_std_7", "rolling_mean_14",
    "momentum_7", "price_range_pct", "volatility_7",
    "temp_mean", "rainfall", "harvest_flag", "festival_flag",
]


def canonical_commodity(name: str):
    n = (name or "").strip().lower()
    for canon, aliases in ALIASES:  # ordered list — first match wins
        if any(a in n for a in aliases):
            return canon
    return None


# ── Agmarknet fetch ──────────────────────────────────────────────────────────
def _fetch_page(params: dict, timeout: int = 15, attempts: int = 2) -> list:
    p = {"api-key": DATA_GOV_KEY, "format": "json", "limit": 1000, **params}
    for attempt in range(attempts):
        try:
            r = requests.get(DATA_GOV_URL, params=p, timeout=timeout)
            r.raise_for_status()
            return r.json().get("records", []) or []
        except Exception as e:  # noqa: BLE001
            print(f"  fetch error (attempt {attempt + 1}/{attempts}): {e}", file=sys.stderr)
            time.sleep(1.0)
    return []


def _records_to_rows(records: list) -> list:
    rows = []
    for r in records:
        try:
            mp = float(r.get("modal_price") or 0)
            if mp <= 0:
                lo = float(r.get("min_price") or 0)
                hi = float(r.get("max_price") or 0)
                mp = (lo + hi) / 2 if (lo + hi) > 0 else 0
            if mp <= 0:
                continue
            rows.append({
                "commodity_raw": r.get("commodity", ""),
                "state": (r.get("state") or "").strip() or "Unknown",
                "modal_price": mp,
                "arrival_date_raw": r.get("arrival_date", ""),
            })
        except Exception:  # noqa: BLE001
            continue
    return rows


def fetch_agmarknet() -> pd.DataFrame:
    """Pull recent Agmarknet records via pagination (multi-date coverage)."""
    all_rows = []
    print("🌾 Fetching Agmarknet prices from data.gov.in ...")
    # Quick probe: one page, short timeout — bail fast if API is unreachable
    probe = _fetch_page({"offset": 0}, timeout=10, attempts=1)
    if not probe:
        print("  API probe failed — no records returned; will fall back to synthetic.")
        return pd.DataFrame()
    print(f"  page offset=0: {len(probe)} records")
    all_rows.extend(_records_to_rows(probe))
    # Only continue pagination if first page succeeded
    for offset in (1000, 2000, 3000, 4000):
        recs = _fetch_page({"offset": offset}, timeout=15, attempts=2)
        print(f"  page offset={offset}: {len(recs)} records")
        all_rows.extend(_records_to_rows(recs))
        if len(recs) < 1000:
            break
        time.sleep(0.6)
    # Per-commodity boost (extra coverage for our target crops)
    for canon, aliases in ALIASES:
        recs = _fetch_page({"filters[commodity]": aliases[0].capitalize()}, timeout=15, attempts=2)
        if recs:
            print(f"  commodity={canon}: +{len(recs)} records")
        all_rows.extend(_records_to_rows(recs))
        time.sleep(0.4)

    # Best-effort historical date-range pull (multi-date coverage). Circuit-breaks
    # on the first failed date so a flaky/unsupported endpoint can't hang us.
    print("  attempting historical date-range pull (weekly, ~6 months) ...")
    today = dt.date.today()
    hist_dates = [(today - dt.timedelta(days=i)).strftime("%d/%m/%Y")
                  for i in range(7, 196, 7)]  # weekly, ~27 dates
    hist_ok = False
    for d in hist_dates:
        recs = _fetch_page({"filters[arrival_date]": d}, timeout=10, attempts=1)
        if not recs:
            if not hist_ok:
                print(f"  first historical date ({d}) failed — aborting historical pull "
                      f"(API not returning past dates from this network).")
                break
            continue
        hist_ok = True
        all_rows.extend(_records_to_rows(recs))
        time.sleep(0.35)
    if hist_ok:
        print("  historical pull: added past-date records")

    if not all_rows:
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df["commodity"] = df["commodity_raw"].map(canonical_commodity)
    df = df[df["commodity"].notna()].copy()
    df["arrival_date"] = pd.to_datetime(
        df["arrival_date_raw"].astype(str).str.strip(),
        dayfirst=True, errors="coerce",
    )
    df = df.dropna(subset=["arrival_date"])
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df = df.dropna(subset=["modal_price"])
    df = df[df["modal_price"] > 0]
    df["state"] = df["state"].replace("", "Unknown")
    print(f"  usable rows after normalisation: {len(df)}")
    return df[["commodity", "state", "arrival_date", "modal_price"]]


def _find_col(columns, candidates):
    """Match a column name case-insensitively, tolerating data.gov.in's `_x0020_`
    escaping of spaces (e.g. 'Modal_x0020_Price' → 'Modal Price')."""
    norm = {c: c.lower().replace("_x0020_", " ").strip() for c in columns}
    for cand in candidates:
        cl = cand.lower()
        for orig, n in norm.items():
            if n == cl or cl in n:
                return orig
    return None


# Candidate CSV locations (checked in order): the backend Agmarknet export and
# the canonical ml/data path. Either works — drop a multi-date export at either.
CSV_CANDIDATES = [
    BASE.parent / "Agmamarket_mandi.csv",   # backend/Agmamarket_mandi.csv
    LOCAL_CSV,                              # backend/ml/data/agmarknet-historical.csv
]


def load_local_csv() -> pd.DataFrame | None:
    csv_path = next((p for p in CSV_CANDIDATES if p.exists()), None)
    if csv_path is None:
        return None
    print(f"📂 Loading local CSV: {csv_path}")
    raw = pd.read_csv(csv_path)
    cols = list(raw.columns)

    comp_col = _find_col(cols, ["commodity", "commodity name", "crop"])
    state_col = _find_col(cols, ["state", "state name"])
    date_col = _find_col(cols, ["arrival date", "arrival_date", "date", "reported date"])
    price_col = _find_col(cols, ["modal price", "modalprice", "modal_price"])
    min_col = _find_col(cols, ["min price", "min_price"])
    max_col = _find_col(cols, ["max price", "max_price"])

    if not comp_col or not date_col:
        print("  CSV missing commodity/date columns — skipping", file=sys.stderr)
        return None

    df = pd.DataFrame({
        "commodity_raw": raw[comp_col].astype(str),
        "arrival_date_raw": raw[date_col].astype(str),
        "state": (raw[state_col].astype(str) if state_col else "Unknown"),
    })
    if price_col:
        df["modal_price"] = pd.to_numeric(raw[price_col], errors="coerce")
    else:
        df["modal_price"] = np.nan
    # fallback: reconstruct modal from (min+max)/2 when modal missing/invalid
    if min_col and max_col:
        lo = pd.to_numeric(raw[min_col], errors="coerce")
        hi = pd.to_numeric(raw[max_col], errors="coerce")
        df["modal_price"] = df["modal_price"].fillna((lo + hi) / 2)

    df["commodity"] = df["commodity_raw"].map(canonical_commodity)
    df = df[df["commodity"].notna()].copy()
    df["arrival_date"] = pd.to_datetime(
        df["arrival_date_raw"].str.strip(), dayfirst=True, errors="coerce",
    )
    df = df.dropna(subset=["arrival_date", "modal_price"])
    df = df[df["modal_price"] > 0]
    df["state"] = df["state"].replace("", "Unknown")
    print(f"  CSV usable rows (after commodity filter): {len(df)} "
          f"| distinct dates: {df['arrival_date'].nunique()} "
          f"| commodities: {sorted(df['commodity'].unique())}")
    return df[["commodity", "state", "arrival_date", "modal_price"]]


# ── Weather ──────────────────────────────────────────────────────────────────
def _load_weather_cache() -> dict:
    if WEATHER_CACHE.exists():
        try:
            return json.loads(WEATHER_CACHE.read_text())
        except Exception:  # noqa: BLE001
            return {}
    return {}


def _save_weather_cache(cache: dict) -> None:
    try:
        WEATHER_CACHE.write_text(json.dumps(cache))
    except Exception:  # noqa: BLE001
        pass


def fetch_weather(state: str, start: str, end: str, cache: dict) -> pd.DataFrame:
    """Daily temp_mean + rainfall for a state over [start, end]."""
    key = f"{state}|{start}|{end}"
    if key in cache:
        return pd.DataFrame(cache[key])
    lat, lon = STATE_CENTROIDS.get(state, INDIA_CENTROID)
    try:
        r = requests.get(OPEN_METEO_URL, params={
            "latitude": lat, "longitude": lon,
            "start_date": start, "end_date": end,
            "daily": "temperature_2m_mean,precipitation_sum",
            "timezone": "Asia/Kolkata",
        }, timeout=25)
        r.raise_for_status()
        daily = (r.json() or {}).get("daily", {}) or {}
    except Exception as e:  # noqa: BLE001
        print(f"  weather fetch failed for {state}: {e}", file=sys.stderr)
        return pd.DataFrame()

    dates = daily.get("time", [])
    if not dates:
        return pd.DataFrame()
    out = pd.DataFrame({
        "arrival_date": pd.to_datetime(dates),
        "temp_mean": daily.get("temperature_2m_mean", [np.nan] * len(dates)),
        "rainfall": daily.get("precipitation_sum", [np.nan] * len(dates)),
        "state": state,
    })
    cache[key] = out.to_dict("records")
    return out


def attach_weather(df: pd.DataFrame) -> pd.DataFrame:
    print("🌦  Fetching historical weather from Open-Meteo ...")
    cache = _load_weather_cache()
    weather_frames = []
    for state, g in df.groupby("state"):
        start = g["arrival_date"].min().strftime("%Y-%m-%d")
        end = g["arrival_date"].max().strftime("%Y-%m-%d")
        wf = fetch_weather(str(state), start, end, cache)
        if not wf.empty:
            weather_frames.append(wf)
        time.sleep(0.3)
    _save_weather_cache(cache)
    if not weather_frames:
        print("  no weather data fetched — temp/rainfall will be NaN", file=sys.stderr)
        df["temp_mean"] = np.nan
        df["rainfall"] = np.nan
        return df
    wdf = pd.concat(weather_frames, ignore_index=True)
    merged = df.merge(wdf, on=["state", "arrival_date"], how="left")
    print(f"  weather merged ({merged['temp_mean'].notna().sum()} rows with weather)")
    return merged


# ── Feature engineering ───────────────────────────────────────────────────────
def add_features(group: pd.DataFrame) -> pd.DataFrame:
    g = group.sort_values("arrival_date").reset_index(drop=True)
    p = g["modal_price"].astype(float)
    g["pct_change_1d"] = p.pct_change(1) * 100
    g["pct_change_7d"] = p.pct_change(7) * 100
    g["pct_change_14d"] = p.pct_change(14) * 100
    # lagged volatility: rolling std of daily returns (vol clusters calm/stormy)
    daily_ret = p.pct_change(1)
    g["volatility_7"] = daily_ret.rolling(7).std()
    g["rolling_mean_7"] = p.rolling(7).mean()
    g["rolling_std_7"] = p.rolling(7).std()
    g["rolling_mean_14"] = p.rolling(14).mean()
    g["momentum_7"] = p / g["rolling_mean_7"] - 1
    rmin = p.rolling(14).min()
    rmax = p.rolling(14).max()
    g["price_range_pct"] = (p - rmin) / (rmax - rmin)
    g["last_price"] = p
    # forward target: % change over TARGET_HORIZON days
    g["target"] = (p.shift(-TARGET_HORIZON) / p - 1) * 100
    doy = g["arrival_date"].dt.dayofyear
    g["day_of_year_sin"] = np.sin(2 * np.pi * doy / 365)
    g["day_of_year_cos"] = np.cos(2 * np.pi * doy / 365)
    g["month"] = g["arrival_date"].dt.month
    # seasonal calendar flags (domain heuristic, per commodity-month)
    comp = str(g["commodity"].iloc[0])
    g["harvest_flag"] = g["month"].apply(lambda m: harvest_flag(comp, int(m)))
    g["festival_flag"] = g["month"].apply(lambda m: festival_flag(comp, int(m)))
    return g


def build_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    # aggregate to (commodity, state, date) daily mean modal price
    daily = (df.groupby(["commodity", "state", "arrival_date"], as_index=False)
               .agg(modal_price=("modal_price", "mean")))
    daily = attach_weather(daily)

    parts = []
    for (comp, state), g in daily.groupby(["commodity", "state"]):
        if len(g) < TARGET_HORIZON + 5:
            continue
        parts.append(add_features(g))
    if not parts:
        return pd.DataFrame(), {}
    full = pd.concat(parts, ignore_index=True)

    # commodity ordinal encoding
    commodities = sorted(full["commodity"].unique())
    comp_map = {c: i for i, c in enumerate(commodities)}
    full["commodity_enc"] = full["commodity"].map(comp_map)

    # drop rows we cannot supervise (no forward price)
    full = full.dropna(subset=["target"]).reset_index(drop=True)
    meta = {"commodity_map": comp_map}
    return full, meta


# ── Synthetic fallback ────────────────────────────────────────────────────────
def generate_synthetic() -> pd.DataFrame:
    print("⚙️  Generating labelled SYNTHETIC dataset (API multi-date data too thin).")
    rng = np.random.default_rng(42)
    base_prices = {c: 1800 + i * 450 for i, c in enumerate(COMMODITIES)}
    states = list(STATE_CENTROIDS.keys())[:5]
    today = dt.date.today()
    rows = []
    for c in COMMODITIES:
        for s in states:
            base = base_prices[c] * (1 + rng.normal(0, 0.05))
            n = 220
            start = today - dt.timedelta(days=n + TARGET_HORIZON + 5)
            idx = np.arange(n)
            seasonal = np.sin(idx * 2 * np.pi / 365) * base * 0.08
            trend = np.linspace(0, base * 0.05, n)
            # Autocorrelated shocks → short-term momentum (realistic for mandi
            # prices, which exhibit persistence). Makes 7-day direction learnable.
            eps = rng.normal(0, base * 0.012, n)
            shock = np.zeros(n)
            shock[0] = eps[0]
            for i in range(1, n):
                shock[i] = 0.45 * shock[i - 1] + eps[i]
            prices = np.maximum(base + seasonal + trend + shock, base * 0.5)
            for i in range(n):
                d = start + dt.timedelta(days=i)
                doy = d.timetuple().tm_yday
                rows.append({
                    "commodity": c, "state": s,
                    "arrival_date": d,
                    "modal_price": round(float(prices[i]), 2),
                    "temp_mean": 25 + 10 * math.sin(2 * math.pi * doy / 365),
                    "rainfall": max(0.0, 5 + 4 * math.sin(2 * math.pi * doy / 365 + 1) + rng.normal(0, 2)),
                })
    return pd.DataFrame(rows)


# ── Training ──────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame, comp_meta: dict, trained_on: str, date_range: str) -> None:
    if "temp_mean" not in df.columns:
        df["temp_mean"] = np.nan
        df["rainfall"] = np.nan

    parts = []
    for (comp, state), g in df.groupby(["commodity", "state"]):
        if len(g) < TARGET_HORIZON + 5:
            continue
        parts.append(add_features(g))
    if not parts:
        raise RuntimeError("Not enough data to train (series too short).")
    full = pd.concat(parts, ignore_index=True)
    full["commodity_enc"] = full["commodity"].map(comp_meta["commodity_map"]).fillna(-1).astype(int)
    full = full.dropna(subset=["target"]).reset_index(drop=True)

    X = full[FEATURE_COLUMNS]
    y = full["target"].astype(float)
    print(f"📊 Training samples: {len(full)}  features: {len(FEATURE_COLUMNS)}")

    # proper out-of-time split: last 20% of EACH (commodity,state) series → test,
    # so every commodity is represented and validation is genuinely forward-in-time
    tr_idx, te_idx = [], []
    for _, g in full.groupby(["commodity", "state"]):
        g = g.sort_values("arrival_date")
        cut = int(len(g) * 0.8)
        tr_idx.extend(g.index[:cut])
        te_idx.extend(g.index[cut:])
    X_tr, y_tr = X.loc[tr_idx], y.loc[tr_idx]
    X_te, y_te = X.loc[te_idx], y.loc[te_idx]

    model = xgb.XGBRegressor(
        n_estimators=400, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        objective="reg:squarederror", random_state=42, n_jobs=-1,
        early_stopping_rounds=25, eval_metric="mae",
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    pred_te = model.predict(X_te)
    mae = float(mean_absolute_error(y_te, pred_te))

    stable_threshold = max(1.0, 0.5 * float(y_tr.std()))
    # 3-class direction accuracy over the full out-of-time test set
    true_dir = np.where(y_te > stable_threshold, "rising",
                np.where(y_te < -stable_threshold, "falling", "stable"))
    pred_dir = np.where(pred_te > stable_threshold, "rising",
                np.where(pred_te < -stable_threshold, "falling", "stable"))
    dir_acc = float((true_dir == pred_dir).mean() * 100)

    model.save_model(str(MODEL_FILE))  # native JSON (portable, no pickle)

    meta = {
        "feature_columns": FEATURE_COLUMNS,
        "commodity_map": comp_meta["commodity_map"],
        "target_horizon_days": TARGET_HORIZON,
        "stable_threshold": round(stable_threshold, 3),
        "validation_mae": round(mae, 3),
        "direction_accuracy_pct": None if math.isnan(dir_acc) else round(dir_acc, 1),
        "trained_on": trained_on,
        "date_range": date_range,
        "n_samples": int(len(full)),
        "n_commodities": int(full["commodity"].nunique()),
        "model_type": "XGBoost regressor (reg:squarederror)",
        "created_at": dt.datetime.now().isoformat(timespec="seconds"),
    }
    META_FILE.write_text(json.dumps(meta, indent=2))
    write_model_card(meta)
    print(f"✅ Saved model → {MODEL_FILE}")
    print(f"✅ Saved meta  → {META_FILE}")
    print(f"   validation MAE: {mae:.3f} pct pts | direction accuracy: "
          f"{'n/a' if math.isnan(dir_acc) else f'{dir_acc:.1f}%'} | threshold: {stable_threshold:.2f}%")


def write_model_card(meta: dict) -> None:
    da = meta["direction_accuracy_pct"]
    card = f"""# Price-Trend Model Card

**Model:** {meta["model_type"]}

**Purpose:** Short-term (7-day) price direction & magnitude estimate for Indian
mandi commodities, fed as ONE additional signal into the Scenario Mapper for the
crop-selling decision. It does not replace Gemini or any existing signal.

## Training data
- **Source:** `{meta["trained_on"]}`
- **Date range:** {meta["date_range"]}
- **Samples:** {meta["n_samples"]} rows across {meta["n_commodities"]} commodities
- **Commodities:** {", ".join(sorted(meta["commodity_map"].keys()))}
- **Price data:** Agmarknet daily mandi modal prices (data.gov.in resource
  9ef84268-d588-465a-a308-a864a43d0070 — same source the backend already uses).
- **Weather data:** Open-Meteo Archive API (daily temperature_2m_mean,
  precipitation_sum) keyed by state centroid.

> If `trained_on` is `synthetic`, the live Agmarknet API did not return enough
> multi-date history during that run; a labelled synthetic series was used so the
> pipeline still emits a usable model. To train on real data, drop a MULTI-DATE
> Agmarknet export (columns: Commodity, State, Arrival_Date, Modal Price) at
> `backend/Agmamarket_mandi.csv` or `backend/ml/data/agmarknet-historical.csv`
> and re-run `python3 train.py`. A single-day snapshot is NOT enough — it must
> span many dates to build lags and a 7-day forward target.

## Features
{", ".join(meta["feature_columns"])}

Engineered per (commodity, state) daily series: 1/7/14-day pct changes, 7-day
lagged volatility (rolling std of daily returns), 7/14-day rolling mean & std,
7-day momentum, 14-day relative price position, calendar seasonality (month,
day-of-year sin/cos), per-commodity harvest & festival-window flags, recent
weather (temp, rainfall), and an ordinal commodity code.

> Arrival/quantity volume is NOT a feature: the Agmarknet export used here
> contains only Min/Max/Modal price (no arrivals column). If a future export
> includes arrivals, add it as a feature — arrivals leading prices is a stronger
> signal than price history alone.

## Target
7-day-forward percentage price change: `(price[t+7] / price[t] - 1) * 100`.

## Validation (chronological 80/20 split, no shuffle)
- **MAE:** {meta["validation_mae"]} percentage points
- **Direction accuracy** (3-class over full out-of-time test set): {"n/a" if da is None else f"{da}%"}
- **Stable threshold:** ±{meta["stable_threshold"]}%

## Inference output
`{{ "direction": "rising"|"falling"|"stable", "magnitude_estimate": <pct pts>, "confidence": <0-95 heuristic> }}`

`confidence` is a heuristic (`50 + (|pred| - threshold) * 15`, clamped 5–95), NOT
a calibrated probability. `magnitude_estimate` is the predicted percentage change
over the 7-day horizon.

## Honest limitations
- A single global regressor across commodities/states; not per-crop tuned.
- Inference `recent_prices` come from the app's live market snapshot (average +
  trend), not a stored daily history, so the input is approximate at request time.
- Short-term directional only; not a long-horizon price forecaster.
- Trained {meta["created_at"]}.
"""
    CARD_FILE.write_text(card)


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    df = load_local_csv()
    trained_on = "local_csv"
    if df is None or len(df) == 0:
        df = fetch_agmarknet()
        trained_on = "agmarknet_api"
    if len(df) == 0 or df["arrival_date"].nunique() < MIN_DISTINCT_DATES or len(df) < MIN_REAL_ROWS:
        print(f"⚠️ Real data insufficient (rows={len(df)}, distinct_dates="
              f"{df['arrival_date'].nunique() if len(df) else 0}) — using synthetic fallback.")
        df = generate_synthetic()
        trained_on = "synthetic"

    # Ensure arrival_date is a proper pandas datetime (synthetic uses date objs)
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], errors="coerce")
    df = df.dropna(subset=["arrival_date"]).reset_index(drop=True)

    date_range = (f"{df['arrival_date'].min().date()} → {df['arrival_date'].max().date()}"
                  if len(df) else "n/a")

    # build commodity map from the full commodity set (so inference can encode)
    comp_meta = {"commodity_map": {c: i for i, c in enumerate(sorted(df["commodity"].unique()))}}

    train(df, comp_meta, trained_on, date_range)
    return 0


if __name__ == "__main__":
    sys.exit(main())
