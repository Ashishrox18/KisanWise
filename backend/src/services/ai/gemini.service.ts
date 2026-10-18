import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from '@google/generative-ai';
import { getGradesForCrop, coerceGrade, gradeToTier } from '../cropQualityGrades';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Confidence threshold below which we escalate to a stronger model
const LOW_CONFIDENCE_THRESHOLD = 60;
const FLASH_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
const PRO_MODEL = 'gemini-3.5-flash-lite';

/** Strip markdown code fences from model output */
function stripMarkdown(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
}

/** Parse JSON safely; returns null on failure */
function parseJSON(text: string): any | null {
  try {
    return JSON.parse(stripMarkdown(text));
  } catch {
    return null;
  }
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private flash: GenerativeModel | null = null;
  private fallbackFlash: GenerativeModel | null = null;
  private pro: GenerativeModel | null = null;
  private enabled = false;

  constructor() {
    if (GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.flash = this.genAI.getGenerativeModel({ model: FLASH_MODEL });
      this.fallbackFlash = this.genAI.getGenerativeModel({ model: FALLBACK_MODEL });
      this.pro   = this.genAI.getGenerativeModel({ model: PRO_MODEL });
      this.enabled = true;
      console.log('✅ Gemini AI service initialised (AI Studio — gemini-3.5-flash with flash-lite fallback)');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set — Gemini disabled, using rule-based fallbacks');
    }
  }

  isEnabled(): boolean { return this.enabled; }

  /** Generate JSON from a prompt; escalates to Pro if confidence < threshold */
  private async generateJSON(prompt: string, systemInstruction?: string): Promise<any> {
    if (!this.enabled || !this.flash) return null;

    const parts: Part[] = [{ text: prompt }];

    try {
      let flashResult;
      try {
        flashResult = await this.flash.generateContent({
          contents: [{ role: 'user', parts }],
          systemInstruction: systemInstruction ?? 'You are an expert agricultural advisor. Respond ONLY with valid JSON, no markdown.',
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        });
      } catch (primaryErr) {
        if (this.fallbackFlash) {
          console.warn('⚠️ Primary flash model failed, retrying with fallback flash-lite...');
          flashResult = await this.fallbackFlash.generateContent({
            contents: [{ role: 'user', parts }],
            systemInstruction: systemInstruction ?? 'You are an expert agricultural advisor. Respond ONLY with valid JSON, no markdown.',
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          });
        } else {
          throw primaryErr;
        }
      }

      const text = flashResult.response.text();
      const parsed = parseJSON(text);
      if (!parsed) throw new Error('Invalid JSON from flash');

      // Escalate if confidence is low
      const confidence = parsed?.confidence ?? parsed?.trustScore?.confidence ?? 100;
      if (confidence < LOW_CONFIDENCE_THRESHOLD && this.pro) {
        console.log(`⬆️  Escalating to ${PRO_MODEL} (confidence: ${confidence})`);
        const proResult = await this.pro.generateContent({
          contents: [{ role: 'user', parts }],
          systemInstruction: systemInstruction ?? 'You are an expert agricultural advisor. Respond ONLY with valid JSON, no markdown.',
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
        });
        const proText = proResult.response.text();
        return parseJSON(proText) ?? parsed;
      }

      return parsed;
    } catch (err) {
      console.error('Gemini generateJSON error:', err);
      return null;
    }
  }

  /** Analyse an image with Gemini Vision for produce quality assessment.
   *  Crop-aware: uses the crop's real grade vocabulary (not a generic A/B/C). */
  async analyseImageQuality(
    base64Image: string,
    mimeType = 'image/jpeg',
    cropType?: string,
    stage?: string,
    variety?: string,
    storageDays?: number,
    moisturePct?: number,
  ): Promise<any> {
    if (!this.enabled || !this.flash) return this.getDefaultQualityAssessment(cropType);

    const grades = getGradesForCrop(cropType);
    const gradeList = grades.map((g, i) => `${i + 1}. ${g}`).join('\n');
    const cropLabel = cropType ? ` for ${cropType}${stage ? ` (${stage} stage)` : ''}` : '';
    const varietyLine = variety ? `\nVariety / cultivar: ${variety}` : '';
    const storageLine = storageDays != null ? `\nStorage duration: ${storageDays === 0 ? 'just harvested' : `${storageDays} days in storage`}` : '';
    const moistureLine = moisturePct != null ? `\nMoisture content (farmer-reported): ${moisturePct}%` : '';
    const validGrades = cropType
      ? `The valid quality grades for ${cropType} (best → worst) are:\n${gradeList}\n\nChoose the single grade that best matches the visible evidence AND the context (variety, storage days, moisture). Moisture >${cropType?.toLowerCase().includes('wheat') ? '14' : '12'}% → penalise one grade. Storage >30 days without refrigeration → penalise one grade for fresh produce.`
      : 'Use a descriptive quality grade (e.g. Premium / Standard / Fair / Below Standard).';

    const imagePart: Part = { inlineData: { data: base64Image, mimeType } };
    const textPart: Part = {
      text: `Analyse this agricultural produce image and assess its quality${cropLabel}. Return JSON only.

${validGrades}
${varietyLine}${storageLine}${moistureLine}

{
  "labels": [{"name": "string", "confidence": number}],
  "qualityIndicators": {"freshness": 0-100, "damage": 0-100, "color": "string", "overallScore": 0-100},
  "defects": ["string"],
  "qualityGrade": "<one of the listed grades, exactly as written>",
  "qualityScore": <0-100, equals overallScore>,
  "gradeBasis": "one short line: why this grade, citing visible traits AND any supplied context (variety, storage, moisture)",
  "confidence": 0-100,
  "note": "string"
}`,
    };

    try {
      let result;
      try {
        result = await this.flash.generateContent({
          contents: [{ role: 'user', parts: [imagePart, textPart] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        });
      } catch (primaryErr) {
        if (this.fallbackFlash) {
          result = await this.fallbackFlash.generateContent({
            contents: [{ role: 'user', parts: [imagePart, textPart] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          });
        } else {
          throw primaryErr;
        }
      }
      const parsed = parseJSON(result.response.text());
      return parsed ? this.enrichQualityAssessment(parsed, cropType) : this.getDefaultQualityAssessment(cropType);
    } catch (err) {
      console.error('Gemini vision error:', err);
      return this.getDefaultQualityAssessment(cropType);
    }
  }

  /** Coerce the model's grade into a valid crop-specific grade and add the
   *  universal tier + backward-compatible fields. */
  private enrichQualityAssessment(result: any, cropType?: string): any {
    const grades = getGradesForCrop(cropType);
    const rawGrade = result.qualityGrade || result.gradeRecommendation || '';
    const grade = coerceGrade(String(rawGrade), cropType);
    const score = Number(result.qualityIndicators?.overallScore ?? result.qualityScore ?? 70) || 70;
    result.qualityGrade = grade;
    result.gradeRecommendation = grade;   // kept for backward compatibility
    result.qualityScore = score;
    result.qualityTier = gradeToTier(grade, cropType);
    result.gradeBasis = result.gradeBasis || '';
    result.validGrades = grades;
    return result;
  }

  /** Crop-aware default assessment (midpoint grade of the crop's vocabulary). */
  getDefaultQualityAssessment(cropType?: string): any {
    const grades = getGradesForCrop(cropType);
    const grade = grades[Math.floor(grades.length / 2)];
    const score = 70;
    return {
      labels: [
        { name: 'Fresh Produce', confidence: 85 },
        { name: 'Agricultural Product', confidence: 90 },
      ],
      qualityIndicators: { freshness: 80, damage: 10, color: 'natural', overallScore: score },
      defects: [],
      qualityGrade: grade,
      gradeRecommendation: grade,
      qualityScore: score,
      qualityTier: gradeToTier(grade, cropType),
      gradeBasis: 'No image analysed — default midpoint grade for this crop.',
      validGrades: grades,
      confidence: 50,
      note: 'Quality assessment based on standard parameters.',
    };
  }

  // ─────────────────────────────────────────────
  // Crop recommendations
  // ─────────────────────────────────────────────
  async getCropRecommendations(data: {
    landSize: number;
    soilType: string;
    location: string;
    waterAvailability: string;
    budget: number;
    season?: string;
  }): Promise<any> {
    const minimumBudget = 5000 * data.landSize;
    if (data.budget < minimumBudget) {
      return {
        recommendations: [],
        insights: { priceTrend: 'N/A', priceTrendPercentage: 'N/A', bestPlantingTime: 'N/A', demandForecast: 'N/A', additionalTips: [] },
        error: {
          message: 'Insufficient budget for viable crop cultivation',
          minimumRequired: minimumBudget,
          provided: data.budget,
          suggestion: `For ${data.landSize} acres, a minimum of ₹${minimumBudget.toLocaleString()} is recommended.`,
        },
      };
    }

    const prompt = `You are an agricultural expert for India. Analyse this farm and return 4-5 crop recommendations as JSON only.

Farm data:
- Land: ${data.landSize} acres
- Soil: ${data.soilType}
- Location: ${data.location}
- Water: ${data.waterAvailability}
- Budget: ₹${data.budget}
${data.season ? `- Season: ${data.season}` : ''}

{
  "recommendations": [{
    "name": "string", "suitability": 0-100, "expectedYield": "X tons/acre",
    "revenue": "₹X L/acre", "duration": "X days", "waterNeed": "High/Medium/Low",
    "marketDemand": "High/Medium/Low", "riskLevel": "Low/Medium/High", "reasoning": "string"
  }],
  "insights": {
    "priceTrend": "Rising/Stable/Falling", "priceTrendPercentage": "+X%",
    "bestPlantingTime": "string", "demandForecast": "High/Medium/Low",
    "additionalTips": ["string"]
  },
  "confidence": 0-100
}`;

    const result = await this.generateJSON(prompt);
    return result ?? this.getFallbackRecommendations(data);
  }

  private getFallbackRecommendations(data: any) {
    const recs: any[] = [];
    if (['clay', 'loam'].includes(data.soilType) && ['abundant', 'moderate'].includes(data.waterAvailability)) {
      recs.push({ name: 'Rice', suitability: 90, expectedYield: '4.5 tons/acre', revenue: '₹1.8L/acre', duration: '120 days', waterNeed: 'High', marketDemand: 'High', riskLevel: 'Low', reasoning: 'Excellent soil & water match' });
    }
    recs.push({ name: 'Wheat', suitability: 85, expectedYield: '3.2 tons/acre', revenue: '₹1.2L/acre', duration: '90 days', waterNeed: 'Medium', marketDemand: 'Very High', riskLevel: 'Low', reasoning: 'High market demand' });
    recs.push({ name: 'Chickpea', suitability: 75, expectedYield: '1.8 tons/acre', revenue: '₹1.1L/acre', duration: '100 days', waterNeed: 'Low', marketDemand: 'High', riskLevel: 'Low', reasoning: 'Drought-tolerant, nitrogen-fixing' });
    return {
      recommendations: recs.slice(0, 4),
      insights: { priceTrend: 'Stable', priceTrendPercentage: '+5%', bestPlantingTime: 'Current season suitable', demandForecast: 'Medium', additionalTips: ['Rotate crops to maintain soil health', 'Monitor weather weekly'] },
      confidence: 40,
    };
  }

  // ─────────────────────────────────────────────
  // Selling strategy
  // ─────────────────────────────────────────────
  async getSellingStrategy(data: {
    cropType: string;
    expectedYield: number;
    yieldUnit: string;
    harvestMonth: string;
    currentMarketPrice?: number;
    storageAvailable: boolean;
    location?: string;
    scenarioMapperContext?: string; // injected by Scenario Mapper
  }): Promise<any> {
    const basePrice = data.currentMarketPrice || 2000;
    const sellAllNow = Math.round(data.expectedYield * basePrice);

    const prompt = `You are an Indian agricultural market expert. Analyse this selling scenario and return JSON only.

Crop: ${data.cropType}
Yield: ${data.expectedYield} ${data.yieldUnit}
Harvest month: ${data.harvestMonth}
Current price: ₹${basePrice}/${data.yieldUnit}
Storage available: ${data.storageAvailable}
Location: ${data.location ?? 'India'}
${data.scenarioMapperContext ? `\nMarket context:\n${data.scenarioMapperContext}` : ''}

IMPORTANT: sellAllNow MUST equal exactly ₹${sellAllNow} (${data.expectedYield} × ${basePrice}).

{
  "summary": "string",
  "sellNowPercentage": ${data.storageAvailable ? 'number (30-70)' : '100'},
  "storeLaterPercentage": ${data.storageAvailable ? 'number (30-70)' : '0'},
  "pricePredictions": [
    {"period": "1 month", "price": number, "change": number},
    {"period": "2 months", "price": number, "change": number},
    {"period": "3 months", "price": number, "change": number}
  ],
  "profitComparison": {
    "sellAllNow": ${sellAllNow},
    "followStrategy": number,
    "additionalProfit": number
  },
  "insights": ["string"],
  "confidence": 0-100
}`;

    const result = await this.generateJSON(prompt);
    if (!result) return this.getFallbackSellingStrategy(data);

    // Correct calculation if model got it wrong
    if (result.profitComparison && Math.abs(result.profitComparison.sellAllNow - sellAllNow) > 1000) {
      result.profitComparison.sellAllNow = sellAllNow;
      if (result.profitComparison.followStrategy) {
        result.profitComparison.additionalProfit = result.profitComparison.followStrategy - sellAllNow;
      }
    }
    return result;
  }

  private getFallbackSellingStrategy(data: any): any {
    const basePrice = data.currentMarketPrice || 2000;
    const sellAllNow = Math.round(data.expectedYield * basePrice);
    const sellNow = data.storageAvailable ? 40 : 100;
    const storeLater = 100 - sellNow;
    const followStrategy = Math.round(sellAllNow * (data.storageAvailable ? 1.08 : 1));
    return {
      summary: `Recommended to sell ${sellNow}% now and store ${storeLater}% for better prices.`,
      sellNowPercentage: sellNow,
      storeLaterPercentage: storeLater,
      pricePredictions: [
        { period: '1 month', price: Math.round(basePrice * 1.03), change: 3 },
        { period: '2 months', price: Math.round(basePrice * 1.06), change: 6 },
        { period: '3 months', price: Math.round(basePrice * 1.08), change: 8 },
      ],
      profitComparison: { sellAllNow, followStrategy, additionalProfit: followStrategy - sellAllNow },
      insights: ['Monitor market prices weekly', 'Consider forward contracts'],
      confidence: 40,
    };
  }

  // ─────────────────────────────────────────────
  // Trust Engine — fuse available signals
  // ─────────────────────────────────────────────
  async runTrustEngine(signals: {
    weatherRisk?: { score: number; summary: string } | null;
    earthEngineRisk?: { ndviScore: number; riskLevel: string } | null;
    gdacsEvents?: { count: number; maxSeverity: string } | null;
    historicalPrice?: { trend: string; change: number } | null;
    communitySignals?: { upvotes: number; downvotes: number; sentiment: string } | null;
    photoQuality?: { overallScore: number; confidence: number } | null;
    contextType: 'resource_allocation' | 'crop_planning' | 'crop_selling';
  }): Promise<{
    verdict: string;
    confidence: number;
    signalsUsed: string[];
    signalsAgreed: string[];
    signalsDisagreed: string[];
    reasoning: string;
    isLowConfidence: boolean;
  }> {
    const signalLines: string[] = [];
    if (signals.weatherRisk)       signalLines.push(`Weather risk score: ${signals.weatherRisk.score}/100 — ${signals.weatherRisk.summary}`);
    if (signals.earthEngineRisk)   signalLines.push(`Earth Engine NDVI score: ${signals.earthEngineRisk.ndviScore}, risk: ${signals.earthEngineRisk.riskLevel}`);
    if (signals.gdacsEvents)       signalLines.push(`GDACS disaster events in India: ${signals.gdacsEvents.count} (max severity: ${signals.gdacsEvents.maxSeverity})`);
    if (signals.historicalPrice)   signalLines.push(`Historical price trend: ${signals.historicalPrice.trend} (${signals.historicalPrice.change}%)`);
    if (signals.communitySignals)  signalLines.push(`Community: ${signals.communitySignals.upvotes} up / ${signals.communitySignals.downvotes} down — ${signals.communitySignals.sentiment}`);
    if (signals.photoQuality)      signalLines.push(`Photo quality score: ${signals.photoQuality.overallScore}/100 (confidence: ${signals.photoQuality.confidence}%)`);

    if (signalLines.length === 0) {
      return { verdict: 'Insufficient data to make a verdict', confidence: 0, signalsUsed: [], signalsAgreed: [], signalsDisagreed: [], reasoning: 'No signals available', isLowConfidence: true };
    }

    const prompt = `You are a Trust Engine for an agricultural advisory platform. Fuse the following signals for a "${signals.contextType}" decision and return JSON only.

Signals:
${signalLines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

{
  "verdict": "one-sentence actionable verdict",
  "confidence": 0-100,
  "signalsUsed": ["signal name"],
  "signalsAgreed": ["signals pointing same direction"],
  "signalsDisagreed": ["signals contradicting majority"],
  "reasoning": "2-3 sentence explanation of how signals were fused"
}

If confidence < 60, make that explicit in the verdict.`;

    const result = await this.generateJSON(prompt);
    const fallback = {
      verdict: 'Mixed signals — proceed with caution',
      confidence: 45,
      signalsUsed: signalLines.map((_, i) => `Signal ${i + 1}`),
      signalsAgreed: [],
      signalsDisagreed: [],
      reasoning: 'Could not fuse signals automatically. Manual review recommended.',
      isLowConfidence: true,
    };

    if (!result) return fallback;

    return {
      ...result,
      isLowConfidence: (result.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD,
    };
  }

  // ─────────────────────────────────────────────
  // Scenario Mapper
  // ─────────────────────────────────────────────
  async runScenarioMapper(input: {
    decisionType: 'resource_allocation' | 'crop_planning' | 'crop_selling';
    trustEngineOutput: any;
    marketData?: any;
    worldBankContext?: string;
    faostatContext?: string;
    newsHeadlines?: string[];
    farmContext?: any;
    mlSignal?: { direction: string; magnitude_estimate: number; confidence: number } | null;
  }): Promise<{
    scenarios: Array<{
      option: string;
      description: string;
      projectedOutcome: string;
      confidence: number;
      pros: string[];
      cons: string[];
    }>;
    recommendedOption: string;
    overallConfidence: number;
    reasoning: string;
    mlSignal?: { direction: string; magnitude_estimate: number; confidence: number } | null;
  }> {
    const headlineText = input.newsHeadlines?.length
      ? `\nRecent agri/policy news (use as context, do not cite as live data):\n${input.newsHeadlines.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('\n')}`
      : '';

    const prompt = `You are a Scenario Mapper for an Indian agricultural platform. Generate 2-3 ranked options for a "${input.decisionType}" decision.

Trust Engine verdict: "${input.trustEngineOutput?.verdict}" (confidence: ${input.trustEngineOutput?.confidence ?? 'unknown'})
Signals agreed: ${(input.trustEngineOutput?.signalsAgreed ?? []).join(', ') || 'none'}
Signals disagreed: ${(input.trustEngineOutput?.signalsDisagreed ?? []).join(', ') || 'none'}
${input.marketData ? `\nMarket data: ${JSON.stringify(input.marketData)}` : ''}
${input.worldBankContext ? `\nWorld Bank context: ${input.worldBankContext}` : ''}
${input.faostatContext ? `\nFAOSTAT context: ${input.faostatContext}` : ''}
${headlineText}
${input.farmContext ? `\nFarm context: ${JSON.stringify(input.farmContext)}` : ''}
${input.mlSignal ? `\nA trained price-trend model independently estimates: ${input.mlSignal.direction}, confidence ${input.mlSignal.confidence}% (magnitude ~${input.mlSignal.magnitude_estimate}% over 7 days)` : ''}

Return JSON only:
{
  "scenarios": [
    {
      "option": "short option name",
      "description": "1-2 sentence description",
      "projectedOutcome": "quantified outcome if possible",
      "confidence": 0-100,
      "pros": ["string"],
      "cons": ["string"]
    }
  ],
  "recommendedOption": "option name",
  "overallConfidence": 0-100,
  "reasoning": "2-3 sentence explanation"
}

Rank scenarios by confidence descending. If overall confidence < 60, say so in reasoning.`;

    const result = await this.generateJSON(prompt);
    if (result) {
      if (input.mlSignal) result.mlSignal = input.mlSignal;
      return result;
    }
    return {
      scenarios: [
        { option: 'Conservative', description: 'Take the safest course of action given mixed signals.', projectedOutcome: 'Lower risk, moderate returns', confidence: 55, pros: ['Lower risk'], cons: ['May miss upside'] },
      ],
      recommendedOption: 'Conservative',
      overallConfidence: 45,
      reasoning: 'Insufficient signal quality for a high-confidence recommendation. Conservative approach recommended.',
      ...(input.mlSignal ? { mlSignal: input.mlSignal } : {}),
    };
  }

  // ─────────────────────────────────────────────
  // General-purpose farming Q&A (AI Assistant)
  // ─────────────────────────────────────────────
  async askFarmingQuestion(question: string): Promise<string> {
    if (!this.enabled || !this.flash) {
      return `🌾 Thank you for your question: "${question}"\n\nFor best results, please consult your local agricultural extension officer or Krishi Vigyan Kendra. Common advice: monitor soil moisture, follow crop rotation practices, and check mandi prices before selling.`;
    }

    const systemContext = `You are KisanWise AI, an expert agricultural advisor for Indian farmers.
You have deep knowledge of:
- Indian crops, seasons, and farming practices
- Soil health, irrigation, and pest management
- Current market prices and mandi rates
- Government schemes (PM-Kisan, Fasal Bima, etc.)
- Weather-based crop advice
- Post-harvest storage and selling strategies

Keep responses practical, concise (under 200 words), and farmer-friendly.
Use simple language. Include emojis sparingly for readability.
Always conclude with 1-2 actionable tips.`;

    const prompt = `${systemContext}\n\nFarmer's question: ${question}\n\nAnswer:`;

    try {
      try {
        const result = await this.flash.generateContent(prompt);
        return result.response.text().trim();
      } catch (primaryErr) {
        if (this.fallbackFlash) {
          console.warn('⚠️ Primary flash model failed in assistant, using fallback flash-lite...');
          const result = await this.fallbackFlash.generateContent(prompt);
          return result.response.text().trim();
        }
        throw primaryErr;
      }
    } catch (err) {
      console.error('askFarmingQuestion error:', err);
      return `🌾 I'm having trouble connecting right now. Please try again in a moment.\n\nFor urgent advice, contact your local Krishi Vigyan Kendra or call the Kisan Call Centre at 1800-180-1551.`;
    }
  }
}

export const geminiService = new GeminiService();

