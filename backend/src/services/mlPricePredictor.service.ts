/**
 * mlPricePredictor.service.ts
 *
 * Thin, fail-safe wrapper around the standalone Python XGBoost inference script
 * (backend/ml/inference/predict.py). It spawns the script as a child process
 * using `execFile` (NOT `exec`) so the JSON input is passed as a safely
 * serialized argument rather than string-concatenated into a shell command
 * (avoids shell injection).
 *
 * Safety contract:
 *  - Gated behind ENABLE_ML_PRICE_PREDICTOR=true. If false/unset → returns null
 *    immediately without spawning anything (safety switch for machines without
 *    a Python env, e.g. a live demo on a different laptop).
 *  - If the model file is missing → logs ONE warning, returns null.
 *  - If the Python process fails, times out (3s), or prints malformed output →
 *    logs ONE warning, returns null. NEVER throws to the caller.
 *
 * The Scenario Mapper treats a null result as "no ML signal" and proceeds exactly
 * as before — this is purely additive.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENABLED = (process.env.ENABLE_ML_PRICE_PREDICTOR || '').toLowerCase() === 'true';
const PYTHON_BIN = process.env.PYTHON_PATH || 'python3';

// Resolves to backend/ml/ in both dev (src/services) and prod (dist/services):
// both sit two levels under backend/, and ml/ sits one level under backend/.
const ML_DIR = path.join(__dirname, '..', '..', 'ml');
const PREDICT_SCRIPT = path.join(ML_DIR, 'inference', 'predict.py');
const MODEL_FILE = path.join(ML_DIR, 'models', 'price-trend-model.json');

export interface MLPriceSignal {
  direction: 'rising' | 'falling' | 'stable';
  magnitude_estimate: number;
  confidence: number;
}

export interface MLPricePredictorInput {
  commodity: string;
  recentPrices: number[];
  weather?: { temperature?: number; rainfall?: number };
}

/**
 * Predict short-term price trend. Returns null on any failure / when disabled.
 */
export async function predictPriceTrend(
  input: MLPricePredictorInput,
): Promise<MLPriceSignal | null> {
  if (!ENABLED) return null;

  try {
    fs.accessSync(MODEL_FILE);
  } catch {
    console.warn(
      '⚠️ [mlPricePredictor] model file missing — ML price signal disabled. ' +
      'Run backend/ml/train.py to enable.',
    );
    return null;
  }

  // Pass as a single serialized argv element — never interpolated into a shell.
  const payload = JSON.stringify({
    commodity: input.commodity,
    recent_prices: input.recentPrices,
    weather: input.weather ?? {},
  });

  return new Promise((resolve) => {
    execFile(
      PYTHON_BIN,
      [PREDICT_SCRIPT, payload],
      { timeout: 3000, maxBuffer: 1024 * 1024 },
      (err, stdout, _stderr) => {
        if (err) {
          console.warn(`⚠️ [mlPricePredictor] inference failed: ${(err as Error).message}`);
          return resolve(null);
        }
        try {
          const parsed = JSON.parse(stdout.toString().trim());
          if (!parsed || !parsed.direction) return resolve(null);
          resolve({
            direction: parsed.direction,
            magnitude_estimate: Number(parsed.magnitude_estimate) || 0,
            confidence: Number(parsed.confidence) || 0,
          });
        } catch {
          console.warn('⚠️ [mlPricePredictor] malformed prediction output — skipping ML signal');
          resolve(null);
        }
      },
    );
  });
}

export const mlPricePredictorService = { predictPriceTrend };
