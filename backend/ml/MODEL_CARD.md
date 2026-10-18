# Price-Trend Model Card

**Model:** XGBoost regressor (reg:squarederror)

**Purpose:** Short-term (7-day) price direction & magnitude estimate for Indian
mandi commodities, fed as ONE additional signal into the Scenario Mapper for the
crop-selling decision. It does not replace Gemini or any existing signal.

## Training data
- **Source:** `synthetic`
- **Date range:** 2026-02-27 → 2026-10-04
- **Samples:** 15975 rows across 15 commodities
- **Commodities:** Bajra, Barley, Black Gram, Chickpea, Green Gram, Groundnut, Jowar, Maize, Mustard, Onion, Potato, Rice, Soybean, Tomato, Wheat
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
commodity_enc, month, day_of_year_sin, day_of_year_cos, last_price, pct_change_1d, pct_change_7d, pct_change_14d, rolling_mean_7, rolling_std_7, rolling_mean_14, momentum_7, price_range_pct, volatility_7, temp_mean, rainfall, harvest_flag, festival_flag

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
- **MAE:** 1.204 percentage points
- **Direction accuracy** (3-class over full out-of-time test set): 55.9%
- **Stable threshold:** ±1.0%

## Inference output
`{ "direction": "rising"|"falling"|"stable", "magnitude_estimate": <pct pts>, "confidence": <0-95 heuristic> }`

`confidence` is a heuristic (`50 + (|pred| - threshold) * 15`, clamped 5–95), NOT
a calibrated probability. `magnitude_estimate` is the predicted percentage change
over the 7-day horizon.

## Honest limitations
- A single global regressor across commodities/states; not per-crop tuned.
- Inference `recent_prices` come from the app's live market snapshot (average +
  trend), not a stored daily history, so the input is approximate at request time.
- Short-term directional only; not a long-horizon price forecaster.
- Trained 2026-10-17T22:31:49.
