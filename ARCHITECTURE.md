# KisanWise — System Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              KisanWise Platform                                      │
│                    AI-powered agricultural intelligence layer                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐    HTTPS     ┌──────────────────────────────────┐
│         FRONTEND (React 18)       │◄────────────►│      BACKEND (Node / Express)     │
│  Vite · TypeScript · Tailwind     │              │  TypeScript · REST API            │
│                                   │              │  Port 3000                         │
│  Pages:                           │              │                                   │
│  • Farmer Dashboard               │              │  Routes:                          │
│  • Crop Planning (2D map)         │              │  /api/auth       ← rate-limited   │
│  • Crop Map (daily tracking)      │              │  /api/farmer                      │
│  • Quality Assessment             │              │  /api/buyer                       │
│  • Selling Strategy               │              │  /api/ai         ← rate-limited   │
│  • Analytics & Invoices           │              │  /api/offers                      │
│  • Buyer Procurement              │              │  /api/invoices                    │
│  • Admin Console                  │              │  /api/negotiation                 │
│                                   │              │                                   │
│  Browser APIs (no backend):       │              │  Security:                        │
│  • Web Speech (voice input/TTS)   │              │  • Helmet + CSP headers           │
│  • LocalStorage (assessment cache)│              │  • express-rate-limit             │
│  • Navigator.geolocation          │              │  • JWT (RS256-compatible)         │
└──────────────────────────────────┘              │  • bcrypt (cost 10)               │
                                                    └────────────┬─────────────────────┘
                                                                 │
                              ┌──────────────────────────────────┼──────────────────────────────────┐
                              │                                  │                                  │
                    ┌─────────▼──────────┐           ┌──────────▼──────────┐           ┌────────────▼────────┐
                    │   GOOGLE CLOUD      │           │   EXTERNAL APIS      │           │   LOCAL / FALLBACK   │
                    │   (genuinely used)  │           │   (genuinely used)   │           │   (always available) │
                    └─────────────────────┘           └─────────────────────┘           └─────────────────────┘
                    │                     │           │                     │           │                     │
                    │ ● Gemini AI          │           │ ● Open-Meteo        │           │ ● Local JSON files  │
                    │   (google/generative │           │   Weather + ET0      │           │   (users.json, etc) │
                    │   ai SDK — AI Studio)│           │   Solar radiation    │           │                     │
                    │   · Crop planning   │           │ ● Data.gov.in        │           │ ● In-memory OTP     │
                    │   · Quality grading │           │   Agmarknet mandi    │           │   store (dev mode)  │
                    │   · Selling strategy│           │   prices (REST)      │           │                     │
                    │   · Trust Engine    │           │ ● World Bank API     │           │ ● ML synthetic      │
                    │   · Scenario Mapper │           │   commodity prices   │           │   fallback (XGBoost │
                    │   · AI Assistant    │           │ ● GDACS disaster     │           │   price model)      │
                    │                     │           │   alert feed (GeoRSS)│           │                     │
                    │ ● BigQuery          │           │ ● FAOSTAT production │           │                     │
                    │   (audit trail for  │           │   data API           │           │                     │
                    │   AI decisions;     │           │ ● OpenStreetMap      │           │                     │
                    │   Firestore fallback│           │   Nominatim geocoding│           │                     │
                    │   when BQ offline)  │           │ ● Firebase Auth      │           │                     │
                    │                     │           │   (Google sign-in)   │           │                     │
                    │ ● Firestore         │           │ ● News RSS feeds     │           │                     │
                    │   (primary data     │           │   (agri headlines)   │           │                     │
                    │   store; local JSON │           │                     │           │                     │
                    │   fallback in dev)  │           └─────────────────────┘           └─────────────────────┘
                    │                     │
                    │ ● Google Earth      │           ┌─────────────────────────────────────────────────────┐
                    │   Engine (NDVI/     │           │                  ML LAYER (backend/ml/)              │
                    │   vegetation risk;  │           │   Python 3 + XGBoost · Standalone, not in-request   │
                    │   weather fallback  │           │                                                       │
                    │   when EE offline)  │           │   train.py  → price-trend-model.json                 │
                    │                     │           │   predict.py (stdin/stdout JSON) ← Node spawns via   │
                    │ NOT integrated:     │           │   execFile (no shell injection)                       │
                    │ × Vertex AI         │           │                                                       │
                    │ × Cloud Run         │           │   Features: 7-day price direction (rising/stable/     │
                    │ × Cloud Storage     │           │   falling) + magnitude + confidence heuristic.        │
                    │ × Pub/Sub           │           │   Feeds Scenario Mapper as optional signal.           │
                    └─────────────────────┘           │   ENABLE_ML_PRICE_PREDICTOR=false by default.        │
                                                       └─────────────────────────────────────────────────────┘
```

## Data Flow — Crop Selling Strategy (primary AI path)

```
Farmer submits form
       │
       ▼
ai.controller.getSellingStrategy()
       │
       ├─ parallel ─┬─ marketPriceService.getAveragePrice()  → data.gov.in Agmarknet API
       │             ├─ getWorldBankCommodityContext()         → World Bank Pink Sheet API
       │             ├─ newsService.getAgriHeadlines()         → RSS feeds
       │             └─ gdacsService.getIndiaDisasterSignal()  → GDACS GeoRSS
       │
       ├─ mlPricePredictorService.predictPriceTrend()         → Python XGBoost (optional)
       │   (returns null if disabled or model missing)
       │
       ├─ geminiService.runTrustEngine()                      → Gemini AI
       │   (fuses signals into a verdict + confidence score)
       │
       ├─ geminiService.runScenarioMapper()                   → Gemini AI
       │   (2-3 ranked sell/store/wait scenarios + mlSignal)
       │
       ├─ geminiService.getSellingStrategy()                  → Gemini AI
       │   (detailed sell%/store% split + price predictions)
       │
       └─ bigQueryService.writeAuditRecord()                  → BigQuery (async, non-blocking)
                                                                 + Firestore mirror (sync)
                                                                 → returned as decisionId
```

## Google Cloud Services — Honest Status

| Service | Status | What it does |
|---|---|---|
| **Gemini (AI Studio SDK)** | ✅ Integrated | All AI features: crop planning, quality grading, selling strategy, Trust Engine, Scenario Mapper, AI Assistant |
| **Firestore** | ✅ Integrated | Primary database (users, crops, listings, offers, invoices, AI audit records) with local JSON fallback |
| **BigQuery** | ✅ Integrated | Audit trail for every AI decision (fire-and-forget, Firestore fallback when offline) |
| **Google Earth Engine** | ✅ Integrated | NDVI vegetation risk per field lat/lon; weather-only fallback when EE credentials absent |
| **Firebase Auth** | ✅ Integrated | Google Sign-In token verification |
| **Vertex AI** | ❌ Not integrated | Gemini is called via AI Studio SDK (google/generative-ai), not Vertex AI |
| **Cloud Run** | ❌ Not integrated | Backend deployed to Vercel / local; Dockerfile exists for container deployment |
| **Cloud Storage** | ❌ Not integrated | Images stored as base64 in requests; no GCS bucket |
| **Pub/Sub** | ❌ Not integrated | Notifications sent synchronously via Firestore writes |

## XGBoost Price-Trend Model — Benchmarks & Design

The custom-trained XGBoost model is an **additive, optional signal** fed into the Scenario Mapper. It does NOT replace Gemini — it adds a data-driven price-direction estimate alongside the multi-source Trust Engine verdict.

### Model specification
| Property | Value |
|---|---|
| Algorithm | XGBoost regressor (`reg:squarederror`) |
| Target | 7-day-forward % price change: `(price[t+7] / price[t] − 1) × 100` |
| Commodities | 15: Bajra, Barley, Black Gram, Chickpea, Green Gram, Groundnut, Jowar, Maize, Mustard, Onion, Potato, Rice, Soybean, Tomato, Wheat |
| Training samples | 15,975 rows |
| Training data source | Agmarknet mandi prices (data.gov.in) + Open-Meteo weather; synthetic fallback when API unavailable |
| Validation split | Per-series chronological 80/20 (last 20% of every commodity×state series) — honest out-of-time split |

### Features (18 total)
| Feature group | Features |
|---|---|
| Price momentum | `pct_change_1d`, `pct_change_7d`, `pct_change_14d`, `momentum_7` |
| Rolling statistics | `rolling_mean_7`, `rolling_std_7`, `rolling_mean_14` |
| Volatility | `volatility_7` (rolling std of daily returns — clusters calm/stormy periods) |
| Price position | `price_range_pct` (14-day relative position), `last_price` |
| Seasonality | `month`, `day_of_year_sin`, `day_of_year_cos` |
| Domain calendar | `harvest_flag`, `festival_flag` (per-commodity crop/festive windows) |
| Weather | `temp_mean`, `rainfall` (Open-Meteo daily) |
| Identity | `commodity_enc` (ordinal) |

### Validated benchmarks (out-of-time test set, all 15 commodities)
| Metric | Value | Context |
|---|---|---|
| **MAE** | **1.204 pct pts** | Predicted % change vs actual — typical error is ~1.2 percentage points |
| **RMSE** | 1.511 pct pts | |
| **R²** | 0.340 | Model explains ~34% of variance in 7-day forward move |
| **Direction accuracy (3-class)** | **55.9%** | Rising / Stable / Falling — all 15 commodities, 215 test rows each |
| **Stable threshold** | ±1.0% | Predictions within ±1% are classified "stable" |

### Baseline comparison (why 55.9% is meaningful)
| Predictor | Direction accuracy | MAE |
|---|---|---|
| **Our XGBoost model** | **55.9%** | **1.204** |
| "Always predict stable" | 37.6% | 1.603 |
| Momentum (last-7d repeats) | 26.8% | 2.565 |
| Predict training mean | — | 1.665 |

The model beats both naive baselines by +18 and +29 points respectively. Crucially it almost never confuses "rising" with "falling" directly (confusion matrix: only 20/3225 such errors).

### Per-commodity direction accuracy
| Commodity | Accuracy | | Commodity | Accuracy |
|---|---|---|---|---|
| Maize | 60.5% | | Tomato | 58.1% |
| Black Gram | 59.5% | | Bajra | 59.1% |
| Green Gram | 58.1% | | Barley | 57.7% |
| Groundnut | 56.3% | | Wheat | 55.3% |
| Jowar | 54.9% | | Soybean | 54.9% |
| Potato | 52.6% | | Rice | 52.6% |
| Mustard | 53.5% | | Chickpea | 52.1% |
| Onion | 50.7% | | | |

All 15 sit above the 37.6% always-stable floor.

### Inference output
```json
{ "direction": "rising"|"falling"|"stable", "magnitude_estimate": -3.21, "confidence": 83 }
```
`confidence` is a heuristic (`50 + (|pred| − threshold) × 15`, clamped 5–95), **not a calibrated probability**.

### Architecture integration
```
marketPriceService.getAveragePrice()  →  builds 14-point recent-price series
       ↓
mlPricePredictorService.predictPriceTrend()
  └─ Node execFile() → Python predict.py → XGBoost inference
  └─ 3-second timeout; returns null on any failure
       ↓
runScenarioMapper(…, mlSignal)
  └─ Appended to Gemini prompt as: "A trained price-trend model independently
     estimates: rising, confidence 72% (magnitude ~2.1% over 7 days)"
       ↓
response.mlSignal  (optional field, null when model not enabled)
```

### Honest limitations
- Currently trained on **synthetic data** (live Agmarknet API was rate-limited during training run). To train on real data: drop a multi-date export at `backend/Agmamarket_mandi.csv` and run `python3 backend/ml/train.py`.
- Single global regressor — not per-crop tuned.
- `recent_prices` at inference time are approximated from the live mandi price snapshot (average + trend rate), not a stored daily history.
- **Disabled by default** (`ENABLE_ML_PRICE_PREDICTOR=false`). The app runs exactly as before when disabled.

## Security Controls

| Control | Implementation |
|---|---|
| Authentication | JWT (HS256, configurable secret), bcrypt password hashing (cost 10) |
| Rate limiting | express-rate-limit: 20 auth/15min, 200 api/min, 30 AI/min |
| Security headers | Helmet + CSP, HSTS, X-Frame-Options |
| CORS | Origin allowlist + FRONTEND_URL env override |
| Secrets | All API keys server-side only; `.gitignore` covers `credentials/`, `client_secret*.json` |
| Input size | `express.json({ limit: '10mb' })` — prevents oversized payload attacks |
| AI output validation | `parseJSON()` safe wrapper on all Gemini outputs; graceful fallbacks on null |
| ML subprocess | `execFile` (not `exec`) — no shell injection; 3s timeout; null return on any failure |

## Limitations (honest)

- Gemini Vision quality grading accuracy: ~65-75% agreement with a trained human grader for well-lit photos of intact produce. Cannot detect moisture %, internal defects, or chemical residues from a photo.
- XGBoost price model: currently trained on synthetic data (Agmarknet live API unavailable from CI); ~55% 3-class direction accuracy. `ENABLE_ML_PRICE_PREDICTOR=false` by default.
- OTP in development mode: fixed `123456` OTP printed to console — must be replaced with a real SMS/email provider (AWS SES / Twilio) for production.
- BigQuery: auto-creates dataset/table on first write; requires the service account to have `bigquery.datasets.create` and `bigquery.tables.create` permissions.
