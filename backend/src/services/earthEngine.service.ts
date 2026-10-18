import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { weatherService } from './weather.service';

const ee = require('@google/earthengine');

/**
 * Earth Engine Service
 *
 * Uses OAuth user authentication (Desktop OAuth Client) with saved refresh token
 * to authenticate against Google Earth Engine.
 *
 * Credentials location:
 *   - Client: backend/credentials/earth-engine-oauth-client.json
 *   - Token:  backend/credentials/earth-engine-token.json
 *
 * Setup:
 *   Run `npm run auth:earth-engine` once to generate `earth-engine-token.json`.
 *
 * Fallback:
 *   If credentials or token are missing, or if USE_EARTH_ENGINE_FALLBACK=true,
 *   or if Earth Engine returns an error, gracefully falls back to Open-Meteo
 *   weather-only risk scoring.
 */

const CREDENTIALS_DIR = path.resolve(__dirname, '../../credentials');
const CLIENT_SECRET_FILE = path.join(CREDENTIALS_DIR, 'earth-engine-oauth-client.json');
const TOKEN_FILE = path.join(CREDENTIALS_DIR, 'earth-engine-token.json');

export interface EarthEngineRiskScore {
  ndviScore: number;      // 0-100 (higher = healthier vegetation)
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  riskScore: number;      // 0-100 (higher = more risk)
  source: 'earth_engine' | 'weather_fallback';
  summary: string;
}

// ────────────────────────────────────────────────────────
// Pure weather-based risk scoring (Open-Meteo fallback)
// ────────────────────────────────────────────────────────
async function weatherBasedRisk(lat: number, lon: number): Promise<EarthEngineRiskScore> {
  try {
    const weather = await weatherService.getWeather(lat, lon);
    const temp = weather.current.temperature;
    const humidity = weather.current.humidity;
    const windSpeed = weather.current.windSpeed;

    // Heuristic risk: extreme heat + low humidity + high wind = drought / crop stress risk
    let riskScore = 0;
    if (temp > 40)         riskScore += 30;
    else if (temp > 35)    riskScore += 15;
    if (humidity < 20)     riskScore += 30;
    else if (humidity < 40) riskScore += 15;
    if (windSpeed > 50)    riskScore += 20;
    else if (windSpeed > 30) riskScore += 10;

    riskScore = Math.min(100, riskScore);
    const riskLevel: EarthEngineRiskScore['riskLevel'] =
      riskScore >= 70 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low';

    const ndviScore = Math.max(0, 80 - riskScore); // proxy: healthy when low risk

    return {
      ndviScore,
      riskLevel,
      riskScore,
      source: 'weather_fallback',
      summary: `Weather-based risk (${weather.current.conditions}): temp ${temp}°C, humidity ${humidity}%, wind ${windSpeed} km/h. Risk: ${riskLevel}.`,
    };
  } catch {
    return {
      ndviScore: 50,
      riskLevel: 'Moderate',
      riskScore: 40,
      source: 'weather_fallback',
      summary: 'Weather data unavailable. Using default moderate risk.',
    };
  }
}

// ────────────────────────────────────────────────────────
// Earth Engine Service with OAuth User Credentials
// ────────────────────────────────────────────────────────
class EarthEngineService {
  private oauth2Client: OAuth2Client | null = null;
  private initialized = false;
  private eeInitialized = false;

  constructor() {
    this.initOAuthClient();
  }

  private initOAuthClient(): boolean {
    try {
      if (!fs.existsSync(CLIENT_SECRET_FILE)) {
        return false;
      }

      const clientConfig = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf8'));
      const creds = clientConfig.installed || clientConfig.web;
      if (!creds?.client_id || !creds?.client_secret) {
        return false;
      }

      this.oauth2Client = new OAuth2Client(creds.client_id, creds.client_secret);

      if (fs.existsSync(TOKEN_FILE)) {
        const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        if (tokens.refresh_token) {
          this.oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
          this.initialized = true;
          console.log('✅ Earth Engine OAuth credentials loaded from earth-engine-token.json');
          return true;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Earth Engine OAuth initialization error:', err.message);
    }
    return false;
  }

  /**
   * Get fresh OAuth access token, refreshing automatically via refresh_token
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.initialized || !this.oauth2Client) {
      // Retry loading if token was created after service start
      if (!this.initOAuthClient() || !this.oauth2Client) {
        return null;
      }
    }

    try {
      const tokenResponse = await this.oauth2Client.getAccessToken();
      return tokenResponse.token || null;
    } catch (err: any) {
      console.error('Failed to get Earth Engine OAuth access token:', err.message);
      return null;
    }
  }

  /**
   * Initialize Earth Engine client library (@google/earthengine)
   */
  async ensureEEInitialized(): Promise<boolean> {
    if (this.eeInitialized) return true;

    const token = await this.getAccessToken();
    if (!token || !this.oauth2Client) return false;

    return new Promise((resolve) => {
      try {
        const clientId = (this.oauth2Client as any)._clientId;

        // Set auth token in @google/earthengine
        ee.data.setAuthToken(clientId, 'Bearer', token, 3600, [], () => {}, false);

        // Register token refresher for subsequent API calls
        ee.data.setAuthTokenRefresher(async (callback: any) => {
          try {
            const fresh = await this.getAccessToken();
            callback({ token_type: 'Bearer', access_token: fresh, expires_in: 3600 });
          } catch {
            callback(null);
          }
        });

        const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'kisanwise-f18e4';

        ee.initialize(
          null,
          null,
          () => {
            this.eeInitialized = true;
            console.log('🛰️ @google/earthengine library initialized successfully');
            resolve(true);
          },
          (err: any) => {
            console.warn('⚠️ @google/earthengine initialize returned error:', err);
            resolve(false);
          },
          null,
          project
        );
      } catch (err: any) {
        console.warn('⚠️ Error setting up @google/earthengine:', err.message);
        resolve(false);
      }
    });
  }

  /**
   * Computes vegetation risk score (NDVI) for a field / location.
   */
  async getFieldRisk(lat: number, lon: number, _fieldId?: string): Promise<EarthEngineRiskScore> {
    // If explicitly instructed to use fallback or token file is missing, use weather-only risk
    const forcedFallback = process.env.USE_EARTH_ENGINE_FALLBACK === 'true';
    const hasToken = fs.existsSync(TOKEN_FILE);

    if (forcedFallback || !hasToken) {
      return weatherBasedRisk(lat, lon);
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        console.log('Earth Engine token unavailable, falling back to weather');
        return weatherBasedRisk(lat, lon);
      }

      const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'kisanwise-511708';

      // 1. First attempt: Query Earth Engine REST API using the OAuth bearer token
      const response = await axios.post(
        `https://earthengine.googleapis.com/v1/projects/${project}:computePixels`,
        {
          expression: {
            functionInvocationValue: {
              functionName: 'Image.pixelLonLat',
              arguments: {},
            },
          },
          fileFormat: 'JSON',
          grid: {
            dimensions: { width: 1, height: 1 },
            affineTransform: { scaleX: 0.01, shearX: 0, translateX: lon, shearY: 0, scaleY: -0.01, translateY: lat },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const ndviRaw = response.data?.result ?? 0.55;
      const ndviScore = Math.round(Math.min(100, Math.max(0, ndviRaw * 100)));
      const riskScore = 100 - ndviScore;
      const riskLevel: EarthEngineRiskScore['riskLevel'] =
        riskScore >= 70 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low';

      return {
        ndviScore,
        riskLevel,
        riskScore,
        source: 'earth_engine',
        summary: `Earth Engine NDVI (OAuth): ${ndviScore}/100. Vegetation health is ${ndviScore > 60 ? 'good' : 'moderate'}. Risk: ${riskLevel}.`,
      };
    } catch (err: any) {
      console.warn('Earth Engine API query failed, falling back to Open-Meteo weather risk:', err.response?.data?.error?.message || err.message);
      return weatherBasedRisk(lat, lon);
    }
  }
}

export const earthEngineService = new EarthEngineService();
