import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { geminiService } from '../services/ai/gemini.service';
import { earthEngineService } from '../services/earthEngine.service';
import { gdacsService } from '../services/gdacs.service';
import { newsService } from '../services/news.service';
import { bigQueryService } from '../services/bigquery.service';
import { marketPriceService, getWorldBankCommodityContext, getFaostatContext } from '../services/market-price.service';
import { mlPricePredictorService } from '../services/mlPricePredictor.service';

export class AIController {

  // ─────────────────────────────────────────────
  // Crop recommendations (farmer)
  // ─────────────────────────────────────────────
  async getCropRecommendations(req: AuthRequest, res: Response) {
    try {
      const result = await geminiService.getCropRecommendations(req.body);
      res.json({ recommendations: result });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }

  // ─────────────────────────────────────────────
  // Harvest timing (rule-based)
  // ─────────────────────────────────────────────
  async getHarvestTiming(req: AuthRequest, res: Response) {
    try {
      const { cropType, plantingDate } = req.body;
      const cropDurations: { [key: string]: number } = {
        Wheat: 120, Rice: 120, Maize: 90, Cotton: 150, Sugarcane: 365,
        Potato: 90, Tomato: 75, Onion: 120, Soybean: 100, Chickpea: 100,
        Mustard: 110, Bajra: 80,
      };
      const planting = new Date(plantingDate || Date.now());
      const duration = cropDurations[cropType] || 100;
      const harvestDate = new Date(planting);
      harvestDate.setDate(harvestDate.getDate() + duration);
      const daysRemaining = Math.max(0, Math.ceil((harvestDate.getTime() - Date.now()) / 86400000));
      const readinessScore = Math.min(100, Math.round(((duration - daysRemaining) / duration) * 100));

      res.json({
        recommendation: {
          optimalHarvestDate: harvestDate.toISOString().split('T')[0],
          daysRemaining,
          readinessScore,
          factors: {
            maturity: `Crop is ${readinessScore}% mature`,
            weather: 'Current weather conditions are suitable',
            market: 'Monitor market prices for optimal selling time',
          },
          recommendations: [
            daysRemaining > 0
              ? `Wait ${daysRemaining} more days for optimal maturity`
              : 'Crop is ready for harvest',
            'Monitor weather forecasts for any adverse conditions',
            'Check market prices regularly',
          ],
          risks: ['Weather variability', 'Market price fluctuations'],
          confidence: 75,
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to generate harvest timing' });
    }
  }

  // ─────────────────────────────────────────────
  // Selling strategy + Scenario Mapper (crop_selling)
  // ─────────────────────────────────────────────
  async getSellingStrategy(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id ?? 'anonymous';
      const { cropType, expectedYield, yieldUnit, harvestMonth, currentMarketPrice, storageAvailable, location } = req.body;

      if (!cropType || !expectedYield || !yieldUnit || !harvestMonth) {
        return res.status(400).json({ error: 'Missing required fields: cropType, expectedYield, yieldUnit, harvestMonth' });
      }

      // Parallel data gathering
      const [marketData, worldBankCtx, headlines, gdacsSignal] = await Promise.allSettled([
        marketPriceService.getAveragePrice(cropType, location),
        getWorldBankCommodityContext('WHEAT'),
        newsService.getAgriHeadlines(5),
        gdacsService.getIndiaDisasterSignal(),
      ]);

      const resolvedMarket     = marketData.status === 'fulfilled' ? marketData.value : null;
      const resolvedWorldBank  = worldBankCtx.status === 'fulfilled' ? worldBankCtx.value : '';
      const resolvedHeadlines  = headlines.status === 'fulfilled' ? headlines.value : [];
      const resolvedGDACS      = gdacsSignal.status === 'fulfilled' ? gdacsSignal.value : null;

      // Trust Engine
      const trustResult = await geminiService.runTrustEngine({
        historicalPrice: resolvedMarket ? { trend: resolvedMarket.trend, change: resolvedMarket.change } : null,
        gdacsEvents: resolvedGDACS ? { count: resolvedGDACS.count, maxSeverity: resolvedGDACS.maxSeverity } : null,
        contextType: 'crop_selling',
      });

      // ML price-trend signal (additive, optional, fail-safe). Gated behind
      // ENABLE_ML_PRICE_PREDICTOR and null-safe; never affects the rest of the flow.
      let mlSignal = null;
      try {
        if (resolvedMarket) {
          const avg = resolvedMarket.average;
          // Build a short recent price series from the app's own live snapshot
          // (average + trend) — the app does not store a daily history, so this
          // reuses the already-fetched market signal rather than a second fetch.
          const dailyRate = Math.pow(1 + (resolvedMarket.change || 0) / 100, 1 / 30) - 1;
          const recentPrices = Array.from({ length: 14 }, (_, i) =>
            Math.round(avg * Math.pow(1 + dailyRate, i - 13)),
          );
          mlSignal = await mlPricePredictorService.predictPriceTrend({
            commodity: cropType,
            recentPrices,
            weather: {},
          });
        }
      } catch {
        mlSignal = null;
      }

      // Scenario Mapper
      const scenarioResult = await geminiService.runScenarioMapper({
        decisionType: 'crop_selling',
        trustEngineOutput: trustResult,
        marketData: resolvedMarket,
        worldBankContext: resolvedWorldBank,
        newsHeadlines: resolvedHeadlines,
        farmContext: { cropType, expectedYield, yieldUnit, harvestMonth, storageAvailable, location },
        mlSignal,
      });

      // Selling strategy (detailed)
      const strategy = await geminiService.getSellingStrategy({
        cropType,
        expectedYield,
        yieldUnit,
        harvestMonth,
        currentMarketPrice: currentMarketPrice || resolvedMarket?.average,
        storageAvailable,
        location,
        scenarioMapperContext: resolvedWorldBank,
      });

      // BigQuery audit (non-blocking)
      const decisionId = await bigQueryService.writeAuditRecord({
        userId,
        decisionType: 'crop_selling',
        inputsJson: { cropType, expectedYield, yieldUnit, harvestMonth, storageAvailable, location },
        signalsAgreed: trustResult.signalsAgreed,
        signalsDisagreed: trustResult.signalsDisagreed,
        confidenceScore: trustResult.confidence,
        modelVersion: 'gemini-3.8-flash',
        outputJson: { strategy, trustResult, scenarioResult },
      });

      res.json({ ...strategy, trustEngine: trustResult, scenarioMapper: scenarioResult, mlSignal, decisionId });
    } catch (error) {
      console.error('Selling strategy error:', error);
      res.status(500).json({ error: 'Failed to generate selling strategy' });
    }
  }

  // ─────────────────────────────────────────────
  // Crop planning Scenario Mapper
  // ─────────────────────────────────────────────
  async getCropPlanningScenarios(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id ?? 'anonymous';
      const { cropType, lat, lon, fieldId, season, location } = req.body;

      const [weatherRisk, gdacs, headlines, faostat] = await Promise.allSettled([
        lat && lon ? earthEngineService.getFieldRisk(lat, lon, fieldId) : Promise.resolve(null),
        gdacsService.getIndiaDisasterSignal(),
        newsService.getAgriHeadlines(5),
        getFaostatContext(),
      ]);

      const resolvedWeather   = weatherRisk.status === 'fulfilled' ? weatherRisk.value : null;
      const resolvedGDACS     = gdacs.status === 'fulfilled' ? gdacs.value : null;
      const resolvedHeadlines = headlines.status === 'fulfilled' ? headlines.value : [];
      const resolvedFaostat   = faostat.status === 'fulfilled' ? faostat.value : '';

      const trustResult = await geminiService.runTrustEngine({
        weatherRisk: resolvedWeather ? { score: resolvedWeather.riskScore, summary: resolvedWeather.summary } : null,
        earthEngineRisk: resolvedWeather,
        gdacsEvents: resolvedGDACS ? { count: resolvedGDACS.count, maxSeverity: resolvedGDACS.maxSeverity } : null,
        contextType: 'crop_planning',
      });

      const scenarioResult = await geminiService.runScenarioMapper({
        decisionType: 'crop_planning',
        trustEngineOutput: trustResult,
        faostatContext: resolvedFaostat,
        newsHeadlines: resolvedHeadlines,
        farmContext: { cropType, season, location },
      });

      const decisionId = await bigQueryService.writeAuditRecord({
        userId,
        fieldId,
        decisionType: 'crop_planning',
        inputsJson: req.body,
        signalsAgreed: trustResult.signalsAgreed,
        signalsDisagreed: trustResult.signalsDisagreed,
        confidenceScore: trustResult.confidence,
        modelVersion: 'gemini-3.8-flash',
        outputJson: { trustResult, scenarioResult },
      });

      res.json({ trustEngine: trustResult, scenarioMapper: scenarioResult, decisionId });
    } catch (error) {
      console.error('Crop planning error:', error);
      res.status(500).json({ error: 'Failed to generate crop planning scenarios' });
    }
  }

  // ─────────────────────────────────────────────
  // Resource allocation Scenario Mapper
  // ─────────────────────────────────────────────
  async getResourceAllocationScenarios(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id ?? 'anonymous';
      const { lat, lon, fieldId, resources } = req.body;

      const [weatherRisk, gdacs] = await Promise.allSettled([
        lat && lon ? earthEngineService.getFieldRisk(lat, lon, fieldId) : Promise.resolve(null),
        gdacsService.getIndiaDisasterSignal(),
      ]);

      const resolvedWeather = weatherRisk.status === 'fulfilled' ? weatherRisk.value : null;
      const resolvedGDACS   = gdacs.status === 'fulfilled' ? gdacs.value : null;

      const trustResult = await geminiService.runTrustEngine({
        weatherRisk: resolvedWeather ? { score: resolvedWeather.riskScore, summary: resolvedWeather.summary } : null,
        earthEngineRisk: resolvedWeather,
        gdacsEvents: resolvedGDACS ? { count: resolvedGDACS.count, maxSeverity: resolvedGDACS.maxSeverity } : null,
        contextType: 'resource_allocation',
      });

      const scenarioResult = await geminiService.runScenarioMapper({
        decisionType: 'resource_allocation',
        trustEngineOutput: trustResult,
        farmContext: { resources, fieldId, lat, lon },
      });

      const decisionId = await bigQueryService.writeAuditRecord({
        userId,
        fieldId,
        decisionType: 'resource_allocation',
        inputsJson: req.body,
        signalsAgreed: trustResult.signalsAgreed,
        signalsDisagreed: trustResult.signalsDisagreed,
        confidenceScore: trustResult.confidence,
        modelVersion: 'gemini-3.8-flash',
        outputJson: { trustResult, scenarioResult },
      });

      res.json({ trustEngine: trustResult, scenarioMapper: scenarioResult, decisionId });
    } catch (error) {
      console.error('Resource allocation error:', error);
      res.status(500).json({ error: 'Failed to generate resource allocation scenarios' });
    }
  }

  // ─────────────────────────────────────────────
  // Quality assessment (Gemini Vision)
  // ─────────────────────────────────────────────
  async assessQuality(req: AuthRequest, res: Response) {
    try {
      const { imageBase64, mimeType, cropType, stage, variety, storageDays, moisturePct } = req.body;
      const assessment = imageBase64
        ? await geminiService.analyseImageQuality(imageBase64, mimeType, cropType, stage, variety, storageDays, moisturePct)
        : {
            ...geminiService.getDefaultQualityAssessment(cropType),
            note: 'No image provided. Using default quality assessment.',
          };
      res.json({ assessment });
    } catch {
      res.status(500).json({ error: 'Failed to assess quality' });
    }
  }

  // ─────────────────────────────────────────────
  // Price analysis
  // ─────────────────────────────────────────────
  async analyzePrices(req: AuthRequest, res: Response) {
    try {
      const { cropType = 'Wheat', region = 'India' } = req.body;
      const priceData = await marketPriceService.getAveragePrice(cropType, region);

      res.json({
        analysis: {
          currentPrice: priceData.average,
          trend: priceData.trend,
          changePercentage: priceData.change,
          forecast: [
            { period: '1 month', predictedPrice: Math.round(priceData.average * 1.05), confidence: 70 },
            { period: '2 months', predictedPrice: Math.round(priceData.average * 1.08), confidence: 65 },
            { period: '3 months', predictedPrice: Math.round(priceData.average * 1.12), confidence: 60 },
          ],
          factors: {
            supply: 'Current supply levels are moderate',
            demand: 'Demand is steady with seasonal variations',
            seasonal: 'Post-harvest season typically sees lower prices',
            external: 'No major external factors',
          },
          recommendations: ['Monitor market trends weekly', 'Consider storage if prices are expected to rise'],
          riskLevel: 'medium',
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to analyze prices' });
    }
  }

  // ─────────────────────────────────────────────
  // Route optimise (stub — no transport role)
  // ─────────────────────────────────────────────
  async optimizeRoute(req: AuthRequest, res: Response) {
    const { destinations = [] } = req.body;
    const optimizedRoute = destinations.map((dest: any, i: number) => ({
      order: i + 1,
      destination: dest.name ?? `Stop ${i + 1}`,
      estimatedTime: `${(i + 1) * 30} min`,
      distance: `${(i + 1) * 15} km`,
    }));
    res.json({
      optimization: {
        optimizedRoute,
        totalDistance: `${destinations.length * 15} km`,
        totalTime: `${(destinations.length * 0.5).toFixed(1)} hours`,
        fuelEstimate: `${destinations.length * 1.5} liters`,
        costEstimate: `₹${destinations.length * 120}`,
        recommendations: ['Start early morning', 'Check vehicle condition'],
        efficiency: 80,
      },
    });
  }

  // ─────────────────────────────────────────────
  // News + Disaster Insights for Dashboard
  // ─────────────────────────────────────────────
  async getNewsInsights(req: AuthRequest, res: Response) {
    try {
      const [headlines, gdacs] = await Promise.allSettled([
        newsService.fetchHeadlines(),
        gdacsService.getIndiaDisasterSignal(),
      ]);

      const articles = headlines.status === 'fulfilled' ? headlines.value : [];
      const disaster = gdacs.status === 'fulfilled' ? gdacs.value : null;

      // Generate AI-powered actionable insights from headlines
      let aiInsights: string[] = [];
      if (articles.length > 0) {
        try {
          const headlineSummary = articles.slice(0, 6).map(a => `- ${a.title}`).join('\n');
          const insight = await geminiService.askFarmingQuestion(
            `Based on these recent news headlines about Indian agriculture:\n${headlineSummary}\n\nGive me 3 very short (max 15 words each) actionable insights a farmer should know today. Return as a JSON array of strings only. No markdown.`
          );
          // Try to parse as JSON array
          const match = insight.match(/\[.*\]/s);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) aiInsights = parsed;
          }
          if (aiInsights.length === 0) {
            aiInsights = insight.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
          }
        } catch { aiInsights = []; }
      }

      // Synthesize farmer-friendly, non-technical regional advisory
      const hasSevereAlert = disaster?.maxSeverity === 'Red';
      const hasWarningAlert = disaster?.maxSeverity === 'Orange';

      let alertStatus: 'safe' | 'warning' | 'severe' = 'safe';
      if (hasSevereAlert) alertStatus = 'severe';
      else if (hasWarningAlert) alertStatus = 'warning';

      const eventsList = (disaster?.events || []).map((e: any) => ({
        id: e.eventId,
        type: e.eventType || 'Weather Observation',
        title: e.title?.replace(/<[^>]*>?/gm, '').trim() || 'Regional Weather Event',
        severity: e.severity,
        severityLabel: e.severity === 'Red' ? 'High Risk' : e.severity === 'Orange' ? 'Moderate Risk' : 'Normal / Low Risk',
        date: e.fromDate ? e.fromDate.split('T')[0] : 'Recent',
      }));

      const disasterAlert = disaster ? {
        status: alertStatus,
        maxSeverity: disaster.maxSeverity,
        eventCount: disaster.count,
        headline: alertStatus === 'safe'
          ? 'Normal Weather & Regional Conditions'
          : alertStatus === 'warning'
          ? 'Regional Weather Advisory (Active Watch)'
          : 'High Alert: Severe Weather Warning',
        summary: alertStatus === 'safe'
          ? 'No severe cyclones, extreme floods, or active disaster threats in your farming belt. Regional background sensor readings are all within normal seasonal limits.'
          : 'Elevated weather activity detected in certain belts. Review field drainage, crop protection measures, and harvest storage.',
        soilAdvice: alertStatus === 'safe'
          ? 'Soil moisture is in a favorable range. Safe for ongoing Rabi sowing, field tilling, and planned irrigation.'
          : 'Hold back fertilizer application before impending heavy downpours. Ensure drainage channels are clear in heavy clay and black soils to avoid root suffocation.',
        cropAdvice: alertStatus === 'safe'
          ? 'Favorable window for routine spraying, weeding, and unhindered harvesting of mature produce.'
          : 'Harvest mature fruits and vegetables early where feasible. Stake tall standing crops to minimize damage from high winds.',
        monetaryTransportAdvice: alertStatus === 'safe'
          ? 'Mandi access routes and freight transport are operating normally. Safe time to dispatch produce without rain damage risk.'
          : 'Cover produce trolleys and trucks with waterproof tarpaulins. Moisture above 12% can trigger a 10-15% price cut at the mandi.',
        events: eventsList.slice(0, 10),
      } : null;

      // ─────────────────────────────────────────────
      // Pest & Disease Alerts — Gemini-powered, region + season aware
      // ─────────────────────────────────────────────
      const region = (req.query.region as string) || (req.query.state as string) || 'India';
      const month = new Date().toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
      const seasonMonth = new Date().getMonth() + 1;
      const season = seasonMonth >= 6 && seasonMonth <= 10
        ? 'Kharif (Monsoon)'
        : seasonMonth >= 11 || seasonMonth <= 2
        ? 'Rabi (Winter)'
        : 'Zaid (Summer)';

      interface PestAlert {
        pest: string;
        affectedCrops: string[];
        warningLevel: 'High' | 'Moderate' | 'Low';
        symptoms: string;
        action: string;
        icon: string;
      }

      let pestAlerts: PestAlert[] = [];
      try {
        const pestPrompt = `You are an Indian agricultural pest expert. Today is ${month}, the season is ${season} in ${region}. Generate exactly 4 pest or crop disease alerts currently active or highly likely this month for Indian farmers. Return ONLY a raw JSON array (no markdown) with exactly 4 objects each having: "pest" (common name string), "affectedCrops" (string[] of 2-3 crops), "warningLevel" ("High"|"Moderate"|"Low"), "symptoms" (one sentence max 20 words describing visible signs), "action" (one sentence max 20 words for immediate action), "icon" (single emoji).`;
        const raw = await geminiService.askFarmingQuestion(pestPrompt);
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) pestAlerts = parsed.slice(0, 4);
        }
      } catch (pestErr) {
        console.warn('Pest alert AI failed, using seasonal fallback');
      }

      if (pestAlerts.length === 0) {
        const isKharif = seasonMonth >= 6 && seasonMonth <= 10;
        pestAlerts = isKharif ? [
          { pest: 'Fall Armyworm', affectedCrops: ['Maize', 'Sorghum', 'Bajra'], warningLevel: 'High', symptoms: 'Ragged leaf edges and black droppings inside the funnel.', action: 'Apply Emamectin Benzoate 5 SG @ 0.4 g/L into plant funnel.', icon: '🐛' },
          { pest: 'Brown Plant Hopper', affectedCrops: ['Paddy', 'Rice'], warningLevel: 'High', symptoms: 'Plants turning yellow in circular patches — classic hopper burn.', action: 'Drain field for 4 days then spray Buprofezin 25 SC @ 1 ml/L.', icon: '🦟' },
          { pest: 'Blast Disease', affectedCrops: ['Rice', 'Wheat', 'Finger Millet'], warningLevel: 'Moderate', symptoms: 'Diamond-shaped grey spots with brown borders on leaves.', action: 'Spray Tricyclazole 75 WP @ 0.6 g/L; repeat after 10 days.', icon: '🍄' },
          { pest: 'Aphids', affectedCrops: ['Soybean', 'Cotton', 'Vegetables'], warningLevel: 'Low', symptoms: 'Clusters of tiny insects on shoot tips causing leaf curl.', action: 'Spray neem oil 3% or Imidacloprid 17.8 SL @ 0.3 ml/L.', icon: '🐜' },
        ] : [
          { pest: 'Yellow Rust (Wheat)', affectedCrops: ['Wheat', 'Barley'], warningLevel: 'High', symptoms: 'Yellow-orange powdery stripes running parallel along leaves.', action: 'Spray Propiconazole 25 EC @ 1 ml/L; use resistant varieties next sow.', icon: '🟡' },
          { pest: 'Mustard Aphid', affectedCrops: ['Mustard', 'Rapeseed'], warningLevel: 'High', symptoms: 'Yellowing and curling of young shoots with sticky honeydew deposits.', action: 'Spray Dimethoate 30 EC @ 1.5 ml/L in the early morning.', icon: '🐜' },
          { pest: 'Gram Pod Borer', affectedCrops: ['Chickpea', 'Pigeon Pea', 'Lentil'], warningLevel: 'Moderate', symptoms: 'Circular holes in pods with caterpillar partially visible inside.', action: 'Release Trichogramma cards or spray Bt @ 1.5 kg/ha.', icon: '🐛' },
          { pest: 'Potato Late Blight', affectedCrops: ['Potato', 'Tomato'], warningLevel: 'Moderate', symptoms: 'Water-soaked dark patches spreading fast in cool humid conditions.', action: 'Spray Mancozeb 75 WP @ 2.5 g/L; remove and bury infected leaves.', icon: '🍄' },
        ];
      }

      // ─────────────────────────────────────────────
      // Financial Availability & Government Schemes
      // ─────────────────────────────────────────────
      interface FinancialScheme {
        name: string;
        category: 'Credit' | 'Subsidy' | 'Insurance' | 'Grant';
        benefit: string;
        eligibility: string;
        deadlineOrStatus: string;
        details: string;
        applyLinkOrDept: string;
        icon: string;
      }

      let financialSchemes: FinancialScheme[] = [];
      try {
        const financePrompt = `You are an Indian agricultural finance specialist. Today is ${month}, region is ${region}. List exactly 4 agricultural credit, subsidy, or financial support schemes currently active for Indian farmers. Return ONLY a raw JSON array (no markdown) of 4 objects each with: "name" (scheme title), "category" ("Credit"|"Subsidy"|"Insurance"|"Grant"), "benefit" (e.g. "Up to ₹3 Lakh @ 4% net interest"), "eligibility" (short phrase who can apply), "deadlineOrStatus" (e.g. "Active Window", "Open for Rabi 2026"), "details" (max 20 words practical overview), "applyLinkOrDept" (e.g. "Commercial / Rural Banks or CSC"), "icon" (single emoji).`;
        const rawFinance = await geminiService.askFarmingQuestion(financePrompt);
        const jsonMatch = rawFinance.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) financialSchemes = parsed.slice(0, 4);
        }
      } catch (fErr) {
        console.warn('Finance schemes AI failed, using curated fallback');
      }

      if (financialSchemes.length === 0) {
        financialSchemes = [
          {
            name: 'Kisan Credit Card (KCC) & Interest Subvention',
            category: 'Credit',
            benefit: '₹3 Lakh limit @ 4% net annual interest',
            eligibility: 'All farmers, tenant cultivators, oral lessees & SHGs',
            deadlineOrStatus: 'Open All Year · Fast-Track Renewal',
            details: 'Collateral-free credit limit up to ₹1.6 Lakh with 3% prompt repayment incentive.',
            applyLinkOrDept: 'Commercial / Regional Rural Banks or nearest CSC',
            icon: '💳',
          },
          {
            name: 'PM-KISAN Samman Nidhi',
            category: 'Grant',
            benefit: '₹6,000 / year in 3 direct DBT installments',
            eligibility: 'Small & marginal landholding farmer families',
            deadlineOrStatus: 'Active Disbursement Cycle',
            details: 'Direct benefit transfer into Aadhaar-linked accounts; verify e-KYC on the portal.',
            applyLinkOrDept: 'pmkisan.gov.in / Village Patwari / CSC',
            icon: '💰',
          },
          {
            name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
            category: 'Insurance',
            benefit: 'Comprehensive yield loss & post-harvest disaster claim',
            eligibility: 'Loanee & non-loanee farmers growing notified crops',
            deadlineOrStatus: 'Open for Current Sowing Cycle',
            details: 'Farmer premium capped at 1.5% for Rabi & 2% for Kharif; covers prevented sowing & weather shock.',
            applyLinkOrDept: 'pmfby.gov.in / Primary Agricultural Society (PACS)',
            icon: '🛡️',
          },
          {
            name: 'PM-KUSUM & Solar Pump Subsidy Scheme',
            category: 'Subsidy',
            benefit: 'Up to 60% combined subsidy on Solar Agri Pumps',
            eligibility: 'Farmers replacing diesel pumps or establishing new off-grid irrigation',
            deadlineOrStatus: 'State Subsidized Quota Active',
            details: 'Covers 3 HP to 10 HP solar water pumps, eliminating recurrent diesel fuel expenses.',
            applyLinkOrDept: 'State Renewable Energy Dept / Agri Portal',
            icon: '☀️',
          },
        ];
      }

      // ─────────────────────────────────────────────
      // Market News & Mandi Price Trends
      // ─────────────────────────────────────────────
      interface MarketTrend {
        crop: string;
        mandiPriceRange: string;
        mspComparison: string;
        trend: 'Rising' | 'Stable' | 'Softening';
        trendReason: string;
        arrivalStatus: 'Heavy' | 'Moderate' | 'Steady';
        icon: string;
      }

      let marketTrends: MarketTrend[] = [];
      try {
        const marketPrompt = `You are an Indian Mandi price analyst. Today is ${month}, region is ${region}. Generate 4 real-time market price trends for major crops traded this season in ${region}. Return ONLY a raw JSON array (no markdown) of 4 objects each with: "crop" (crop name string), "mandiPriceRange" (string like "₹2,420 - ₹2,680 / qtl"), "mspComparison" (string like "MSP ₹2,275 (+₹225 above MSP)"), "trend" ("Rising"|"Stable"|"Softening"), "trendReason" (one short sentence max 20 words explaining market movement), "arrivalStatus" ("Heavy"|"Moderate"|"Steady"), "icon" (single emoji).`;
        const rawMarket = await geminiService.askFarmingQuestion(marketPrompt);
        const jsonMatch = rawMarket.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) marketTrends = parsed.slice(0, 4);
        }
      } catch (mErr) {
        console.warn('Market trends AI failed, using curated fallback');
      }

      if (marketTrends.length === 0) {
        marketTrends = [
          {
            crop: 'Wheat',
            mandiPriceRange: '₹2,420 - ₹2,680 / qtl',
            mspComparison: 'MSP ₹2,275 (+₹245 above MSP)',
            trend: 'Rising',
            trendReason: 'Strong flour miller restocking and firm open-market demand holding prices strong.',
            arrivalStatus: 'Moderate',
            icon: '🌾',
          },
          {
            crop: 'Paddy / Basmati (1509 & 1121)',
            mandiPriceRange: '₹3,200 - ₹3,850 / qtl',
            mspComparison: 'MSP ₹2,320 (Basmati trade free)',
            trend: 'Rising',
            trendReason: 'Active procurement by exporters following removal of minimum export price caps.',
            arrivalStatus: 'Heavy',
            icon: '🍚',
          },
          {
            crop: 'Soybean',
            mandiPriceRange: '₹4,450 - ₹4,850 / qtl',
            mspComparison: 'MSP ₹4,892 (Trading near MSP floor)',
            trend: 'Stable',
            trendReason: 'Government MSP procurement centers opening across primary producing districts.',
            arrivalStatus: 'Heavy',
            icon: '🌱',
          },
          {
            crop: 'Mustard / Rapeseed',
            mandiPriceRange: '₹5,350 - ₹5,800 / qtl',
            mspComparison: 'MSP ₹5,650 (At parity)',
            trend: 'Rising',
            trendReason: 'Pre-sowing certified seed demand and healthy mill crushing margins sustaining rates.',
            arrivalStatus: 'Steady',
            icon: '🟡',
          },
        ];
      }

      res.json({
        articles: articles.slice(0, 8).map(a => ({
          title: a.title,
          description: a.description,
          source: a.source,
          publishedAt: a.publishedAt,
          url: a.url,
        })),
        disasterAlert,
        aiInsights,
        pestAlerts,
        financialSchemes,
        marketTrends,
        fetchedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('News insights error:', error);
      res.status(500).json({ error: 'Failed to fetch news insights' });
    }
  }

  // ─────────────────────────────────────────────
  // Auto-fetch market price for a crop
  // ─────────────────────────────────────────────
  async getMarketPriceForCrop(req: AuthRequest, res: Response) {
    try {
      const crop = (req.params.crop || req.query.crop as string || 'Wheat').trim();
      const state = req.query.state as string | undefined;
      const priceData = await marketPriceService.getAveragePrice(crop, state);
      res.json({
        crop,
        averagePrice: priceData.average,
        minPrice: priceData.min,
        maxPrice: priceData.max,
        trend: priceData.trend,
        change: priceData.change,
        unit: 'quintal',
        source: (priceData as any).source || 'data.gov.in / fallback',
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Market price fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch market price' });
    }
  }

  // ─────────────────────────────────────────────
  // "Why this answer?" — audit record lookup
  // ─────────────────────────────────────────────
  async getAuditRecord(req: AuthRequest, res: Response) {
    try {
      const { decisionId } = req.params;
      const record = await bigQueryService.getAuditRecord(decisionId);
      if (!record) return res.status(404).json({ error: 'Audit record not found' });
      res.json({ audit: record });
    } catch {
      res.status(500).json({ error: 'Failed to fetch audit record' });
    }
  }

  async getUserAuditRecords(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const limit = Number(req.query.limit) || 20;
      const records = await bigQueryService.getAuditRecords(userId, limit);
      res.json({ records });
    } catch {
      res.status(500).json({ error: 'Failed to fetch audit records' });
    }
  }

  // ─────────────────────────────────────────────
  // General-purpose AI Assistant (farming Q&A)
  // ─────────────────────────────────────────────
  async askAssistant(req: AuthRequest, res: Response) {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Missing question' });
      }

      const answer = await geminiService.askFarmingQuestion(question.trim());
      res.json({ answer });
    } catch (error) {
      console.error('AI Assistant error:', error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  }
}

