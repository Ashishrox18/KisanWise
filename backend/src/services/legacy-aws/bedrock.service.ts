import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

class BedrockService {
  private client: BedrockRuntimeClient;
  private enabled: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.client = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  private initialize() {
    if (this.initialized) return;
    
    const awsRegion = process.env.AWS_REGION;
    const useBedrock = process.env.USE_BEDROCK === 'true';

    console.log('🔍 Bedrock Debug - USE_BEDROCK:', process.env.USE_BEDROCK);
    console.log('🔍 Bedrock Debug - AWS_REGION:', awsRegion);

    if (useBedrock && awsRegion) {
      this.enabled = true;
      console.log('✅ Amazon Bedrock AI service initialized successfully!');
    } else {
      console.log('❌ Amazon Bedrock AI service disabled - set USE_BEDROCK=true and AWS_REGION in .env');
    }
    
    this.initialized = true;
  }

  isEnabled(): boolean {
    this.initialize();
    return this.enabled;
  }

  async getCropRecommendations(data: {
    landSize: number;
    soilType: string;
    location: string;
    waterAvailability: string;
    budget: number;
    season?: string;
  }): Promise<any> {
    this.initialize();
    
    // Validate minimum budget
    const minimumBudgetPerAcre = 5000;
    const minimumTotalBudget = minimumBudgetPerAcre * data.landSize;

    if (data.budget < minimumTotalBudget) {
      return {
        recommendations: [],
        insights: {
          priceTrend: 'N/A',
          priceTrendPercentage: 'N/A',
          bestPlantingTime: 'N/A',
          demandForecast: 'N/A',
          additionalTips: []
        },
        error: {
          message: `Insufficient budget for viable crop cultivation`,
          minimumRequired: minimumTotalBudget,
          provided: data.budget,
          suggestion: `For ${data.landSize} acres, a minimum budget of ₹${minimumTotalBudget.toLocaleString()} is recommended for basic farming operations including seeds, fertilizers, and irrigation.`
        }
      };
    }

    if (!this.enabled) {
      console.log('Using fallback recommendations (Bedrock not configured)');
      return this.getFallbackRecommendations(data);
    }

    try {
      console.log('🤖 Using Amazon Bedrock AI for crop recommendations...');
      const prompt = `You are an agricultural expert AI. Analyze the following farm data and provide crop recommendations in JSON format.

Farm Data:
- Land Size: ${data.landSize} acres
- Soil Type: ${data.soilType}
- Location: ${data.location}
- Water Availability: ${data.waterAvailability}
- Budget: ₹${data.budget}
${data.season ? `- Season: ${data.season}` : ''}

Provide 4-5 crop recommendations with the following structure (respond ONLY with valid JSON, no markdown):
{
  "recommendations": [
    {
      "name": "Crop Name",
      "suitability": 85,
      "expectedYield": "X tons/acre",
      "revenue": "₹X L/acre",
      "duration": "X days",
      "waterNeed": "High/Medium/Low",
      "marketDemand": "High/Medium/Low",
      "riskLevel": "Low/Medium/High",
      "reasoning": "Brief explanation why this crop is suitable"
    }
  ],
  "insights": {
    "priceTrend": "Rising/Stable/Falling",
    "priceTrendPercentage": "+X%",
    "bestPlantingTime": "Description",
    "demandForecast": "High/Medium/Low",
    "additionalTips": ["tip1", "tip2", "tip3"]
  }
}

Consider Indian agricultural practices, local market conditions, and seasonal factors.`;

      const response = await this.invokeModel(prompt);
      console.log('✅ Bedrock AI response received');
      return response;
    } catch (error) {
      console.error('❌ Bedrock AI error:', error);
      return this.getFallbackRecommendations(data);
    }
  }

  async getSellingStrategy(data: {
      cropType: string;
      expectedYield: number;
      yieldUnit: string;
      harvestMonth: string;
      currentMarketPrice: number;
      storageAvailable: boolean;
      location: string;
    }): Promise<any> {
      this.initialize();

      console.log('🔍 Bedrock Service - getSellingStrategy called');
      console.log('📊 Input data:', JSON.stringify(data, null, 2));
      console.log('⚙️ Bedrock enabled:', this.enabled);
      console.log('🔑 AWS credentials configured:', !!this.client);

      if (!this.enabled) {
        console.log('⚠️ Using fallback selling strategy (Bedrock not configured)');
        return this.getFallbackSellingStrategy(data);
      }

      try {
        console.log('🤖 Using Amazon Bedrock AI for selling strategy...');
        const prompt = `You are an agricultural market expert AI. Analyze the following crop data and provide a selling strategy.

  Crop Data:
  - Crop: ${data.cropType}
  - Expected Yield: ${data.expectedYield} ${data.yieldUnit}
  - Harvest Month: ${data.harvestMonth}
  - Current Market Price: ₹${data.currentMarketPrice}/${data.yieldUnit}
  - Storage Available: ${data.storageAvailable ? 'Yes' : 'No'}
  - Location: ${data.location}, India

  Based on market trends for ${data.cropType} in ${data.location}, provide a strategic recommendation.

  CRITICAL ANALYSIS REQUIREMENTS:
  1. If NO storage available: MUST recommend 100% sell now, 0% store later
  2. If storage available: Analyze market conditions and recommend optimal split
  3. Consider: seasonal demand, current supply, price trends, storage costs
  4. DO NOT default to 40/60 - calculate based on actual market conditions
  5. Percentages must add up to 100

  MARKET ANALYSIS FOR ${data.cropType} in ${data.location}:
  - Current price: ₹${data.currentMarketPrice}/${data.yieldUnit}
  - Harvest month: ${data.harvestMonth}
  - Consider post-harvest supply surge
  - Consider seasonal demand patterns
  - Consider storage costs vs expected price gains

  Respond with ONLY valid JSON (no markdown, no extra text) in this structure:
  {
    "summary": "Brief explanation of your recommended strategy",
    "sellNowPercentage": <number between 0-100>,
    "storeLaterPercentage": <number between 0-100>,
    "pricePredictions": [
      {"period": "1 month", "price": <realistic price>, "change": <percentage>},
      {"period": "2 months", "price": <realistic price>, "change": <percentage>},
      {"period": "3 months", "price": <realistic price>, "change": <percentage>}
    ],
    "profitComparison": {
      "sellAllNow": ${data.expectedYield * data.currentMarketPrice},
      "followStrategy": <calculated based on your strategy>,
      "additionalProfit": <difference>
    },
    "insights": [
      "Location-specific insight about ${data.cropType} market in ${data.location}",
      "Seasonal demand pattern insight",
      "Supply-demand balance insight",
      "Price trend insight"
    ],
    "confidence": <number 0-100>,
    "strategy": {
      "recommendation": "<your recommendation>",
      "reasoning": "<detailed explanation of why this split>",
      "expectedPrice": "₹<price>/${data.yieldUnit}",
      "expectedRevenue": "₹<amount> L",
      "confidence": "High/Medium/Low"
    },
    "marketAnalysis": {
      "currentTrend": "Rising/Stable/Falling",
      "demandLevel": "High/Medium/Low",
      "supplyLevel": "High/Medium/Low",
      "seasonalFactor": "<explanation>"
    },
    "timeline": {
      "immediate": "Sell <percentage>% at current price",
      "shortTerm": "<action for 1-2 months>",
      "longTerm": "<action for 3+ months>"
    },
    "risks": ["<risk 1>", "<risk 2>"],
    "opportunities": ["<opportunity 1>", "<opportunity 2>"],
    "actionItems": ["<action 1>", "<action 2>", "<action 3>"]
  }

  EXAMPLES OF GOOD ANALYSIS:
  - High demand season + storage available → Recommend 30% sell now, 70% store
  - Post-harvest glut + falling prices → Recommend 70% sell now, 30% store
  - Stable market + good storage → Recommend 50% sell now, 50% store
  - No storage available → MUST recommend 100% sell now, 0% store
  - Rising prices expected + storage available → Recommend 20% sell now, 80% store`;

        console.log('📤 Sending prompt to Bedrock (length:', prompt.length, 'chars)');
        const response = await this.invokeModel(prompt);
        console.log('✅ Bedrock AI selling strategy received');
        console.log('📊 Response structure:', JSON.stringify(response, null, 2));
        console.log('📈 Sell/Store split:', response.sellNowPercentage, '/', response.storeLaterPercentage);
        return response;
      } catch (error) {
        console.error('❌ Bedrock AI error:', error);
        console.log('⚠️ Falling back to default strategy');
        return this.getFallbackSellingStrategy(data);
      }
    }

  private async invokeModel(prompt: string): Promise<any> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const text = responseBody.content[0].text;
    
    // Try to parse as JSON
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanText);
    } catch {
      // If not JSON, return as response object
      return { response: text };
    }
  }

  private getFallbackRecommendations(data: any): any {
    // Fallback recommendations based on common Indian crops
    const recommendations = [
      {
        name: 'Rice (Paddy)',
        suitability: 75,
        expectedYield: '2.5 tons/acre',
        revenue: '₹1.2 L/acre',
        duration: '120 days',
        waterNeed: 'High',
        marketDemand: 'High',
        riskLevel: 'Low',
        reasoning: 'Staple crop with consistent demand and well-established market'
      },
      {
        name: 'Wheat',
        suitability: 70,
        expectedYield: '2 tons/acre',
        revenue: '₹1 L/acre',
        duration: '110 days',
        waterNeed: 'Medium',
        marketDemand: 'High',
        riskLevel: 'Low',
        reasoning: 'Essential grain with stable prices and government support'
      },
      {
        name: 'Cotton',
        suitability: 65,
        expectedYield: '1.5 tons/acre',
        revenue: '₹1.5 L/acre',
        duration: '150 days',
        waterNeed: 'Medium',
        marketDemand: 'High',
        riskLevel: 'Medium',
        reasoning: 'High-value cash crop with good export potential'
      },
      {
        name: 'Sugarcane',
        suitability: 60,
        expectedYield: '35 tons/acre',
        revenue: '₹2 L/acre',
        duration: '365 days',
        waterNeed: 'High',
        marketDemand: 'Medium',
        riskLevel: 'Medium',
        reasoning: 'Long-duration crop with high returns but requires significant water'
      }
    ];

    return {
      recommendations,
      insights: {
        priceTrend: 'Stable',
        priceTrendPercentage: '+2%',
        bestPlantingTime: 'Monsoon season (June-July) for kharif crops',
        demandForecast: 'High',
        additionalTips: [
          'Consider crop rotation to maintain soil health',
          'Check government MSP (Minimum Support Price) before planting',
          'Ensure adequate irrigation facilities for water-intensive crops'
        ]
      },
      note: 'Using fallback recommendations. Enable Amazon Bedrock for AI-powered suggestions.'
    };
  }

  private getFallbackSellingStrategy(data: any): any {
    const basePrice = data.currentMarketPrice || 2500;
    const sellNowPercentage = data.storageAvailable ? 40 : 100;
    const storeLaterPercentage = data.storageAvailable ? 60 : 0;
    
    return {
      summary: data.storageAvailable 
        ? `Based on market analysis, it's recommended to sell ${sellNowPercentage}% of your harvest immediately and store ${storeLaterPercentage}% for 2-3 months when prices typically rise by 15-20%. This strategy can increase your revenue by approximately ₹${Math.round((data.expectedYield * basePrice * 0.15) / 1000)}K.`
        : `Without storage facilities, it's recommended to sell your entire harvest immediately to avoid spoilage and quality degradation. Current market conditions are favorable for immediate sale.`,
      sellNowPercentage,
      storeLaterPercentage,
      pricePredictions: [
        {
          period: '1 month',
          price: Math.round(basePrice * 1.05),
          change: 5
        },
        {
          period: '2 months',
          price: Math.round(basePrice * 1.12),
          change: 12
        },
        {
          period: '3 months',
          price: Math.round(basePrice * 1.18),
          change: 18
        }
      ],
      profitComparison: {
        sellAllNow: Math.round(data.expectedYield * basePrice),
        followStrategy: Math.round(data.expectedYield * basePrice * (data.storageAvailable ? 1.15 : 1)),
        additionalProfit: Math.round(data.expectedYield * basePrice * (data.storageAvailable ? 0.15 : 0))
      },
      insights: [
        data.storageAvailable 
          ? 'Market demand typically increases 2-3 months post-harvest'
          : 'Current market prices are stable and favorable',
        data.storageAvailable
          ? 'Storage costs are minimal compared to expected price gains'
          : 'Immediate sale eliminates storage and quality risks',
        'Weather forecasts suggest favorable conditions',
        `${data.cropType} prices show ${data.storageAvailable ? 'upward' : 'stable'} trend in your region`
      ],
      confidence: data.storageAvailable ? 78 : 85,
      strategy: {
        recommendation: data.storageAvailable ? 'Store and sell in batches' : 'Sell immediately',
        reasoning: data.storageAvailable 
          ? 'With storage available, you can wait for better prices and sell in batches to maximize revenue'
          : 'Without storage, sell immediately to avoid spoilage and quality degradation',
        expectedPrice: `₹${Math.round(basePrice * (data.storageAvailable ? 1.15 : 1))}/${data.yieldUnit}`,
        expectedRevenue: `₹${((data.expectedYield * basePrice * (data.storageAvailable ? 1.15 : 1)) / 100000).toFixed(1)} L`,
        confidence: 'Medium'
      },
      marketAnalysis: {
        currentTrend: data.storageAvailable ? 'Rising' : 'Stable',
        demandLevel: 'Medium',
        supplyLevel: 'Medium',
        seasonalFactor: 'Prices typically rise 2-3 months after harvest season'
      },
      timeline: {
        immediate: `Sell ${sellNowPercentage}% of produce at current market price`,
        shortTerm: data.storageAvailable ? 'Monitor prices and sell when prices rise 10-15%' : 'Complete sale within 1 week',
        longTerm: data.storageAvailable ? 'Hold remaining produce for off-season premium prices' : 'N/A'
      },
      risks: [
        'Price volatility due to market fluctuations',
        data.storageAvailable ? 'Storage costs if holding for long term' : 'Quality degradation if not sold quickly',
        'Weather-related risks'
      ],
      opportunities: [
        'Direct buyer connections for better margins',
        'Government procurement schemes',
        'Export opportunities for quality produce'
      ],
      actionItems: [
        'Check current mandi prices in your region',
        'Connect with local buyers and traders',
        'Consider contract farming for price stability'
      ],
      note: 'Using intelligent fallback strategy. Enable Amazon Bedrock for AI-powered analysis.'
    };
  }


      async generateCropRecommendations(data: any): Promise<any> {
        return this.getCropRecommendations(data);
      }

      async generateHarvestRecommendation(data: {
          cropType: string;
          plantingDate: string;
          currentConditions?: any;
          currentGrowthStage?: string;
          weatherConditions?: any;
          marketPrices: any;
        }): Promise<any> {
          this.initialize();

          if (!this.enabled) {
            console.log('Using fallback harvest recommendation (Bedrock not configured)');
            return this.getFallbackHarvestRecommendation(data);
          }

          try {
            console.log('🤖 Using Amazon Bedrock AI for harvest timing...');
            const prompt = `You are an agricultural expert AI. Analyze the following crop data and provide harvest timing recommendations in JSON format.

      Crop Data:
      - Crop Type: ${data.cropType}
      - Planting Date: ${data.plantingDate}
      - Current Growth Stage: ${data.currentGrowthStage || 'Not specified'}
      - Weather Conditions: ${JSON.stringify(data.weatherConditions || data.currentConditions || {})}
      - Market Prices: ${JSON.stringify(data.marketPrices)}

      Provide harvest timing recommendation with the following structure (respond ONLY with valid JSON):
      {
        "optimalHarvestDate": "YYYY-MM-DD",
        "daysRemaining": number,
        "readinessScore": number (0-100),
        "factors": {
          "maturity": "Description",
          "weather": "Description",
          "market": "Description"
        },
        "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
        "risks": ["risk1", "risk2"],
        "confidence": number (0-100)
      }`;

            const response = await this.invokeModel(prompt);
            console.log('✅ Bedrock AI harvest recommendation received');
            return response;
          } catch (error) {
            console.error('❌ Bedrock AI error:', error);
            return this.getFallbackHarvestRecommendation(data);
          }
        }

      async optimizeRoute(data: {
        origin: any;
        destinations: any[];
        vehicleType?: string;
        constraints?: any;
      }): Promise<any> {
        this.initialize();

        if (!this.enabled) {
          console.log('Using fallback route optimization (Bedrock not configured)');
          return this.getFallbackRouteOptimization(data);
        }

        try {
          console.log('🤖 Using Amazon Bedrock AI for route optimization...');
          const prompt = `You are a logistics optimization expert AI. Analyze the following delivery data and provide route optimization in JSON format.

    Delivery Data:
    - Origin: ${JSON.stringify(data.origin)}
    - Destinations: ${JSON.stringify(data.destinations)}
    - Vehicle Type: ${data.vehicleType || 'Standard'}
    - Constraints: ${JSON.stringify(data.constraints || {})}

    Provide route optimization with the following structure (respond ONLY with valid JSON):
    {
      "optimizedRoute": [
        {
          "order": number,
          "destination": "Location name",
          "estimatedTime": "HH:MM",
          "distance": "X km"
        }
      ],
      "totalDistance": "X km",
      "totalTime": "X hours",
      "fuelEstimate": "X liters",
      "costEstimate": "₹X",
      "recommendations": ["recommendation1", "recommendation2"],
      "efficiency": number (0-100)
    }`;

          const response = await this.invokeModel(prompt);
          console.log('✅ Bedrock AI route optimization received');
          return response;
        } catch (error) {
          console.error('❌ Bedrock AI error:', error);
          return this.getFallbackRouteOptimization(data);
        }
      }

      async analyzePricetrends(data: {
        cropType: string;
        region?: string;
        timeframe?: string;
        historicalData?: any;
      }): Promise<any> {
        this.initialize();

        if (!this.enabled) {
          console.log('Using fallback price analysis (Bedrock not configured)');
          return this.getFallbackPriceAnalysis(data);
        }

        try {
          console.log('🤖 Using Amazon Bedrock AI for price analysis...');
          const prompt = `You are a market analysis expert AI. Analyze the following market data and provide price trend analysis in JSON format.

    Market Data:
    - Crop Type: ${data.cropType}
    - Region: ${data.region || 'India'}
    - Timeframe: ${data.timeframe || 'Last 6 months'}
    - Historical Data: ${JSON.stringify(data.historicalData || {})}

    Provide price trend analysis with the following structure (respond ONLY with valid JSON):
    {
      "currentPrice": number,
      "trend": "rising" | "falling" | "stable",
      "changePercentage": number,
      "forecast": [
        {
          "period": "1 month",
          "predictedPrice": number,
          "confidence": number
        }
      ],
      "factors": {
        "supply": "Description",
        "demand": "Description",
        "seasonal": "Description",
        "external": "Description"
      },
      "recommendations": ["recommendation1", "recommendation2"],
      "riskLevel": "low" | "medium" | "high"
    }`;

          const response = await this.invokeModel(prompt);
          console.log('✅ Bedrock AI price analysis received');
          return response;
        } catch (error) {
          console.error('❌ Bedrock AI error:', error);
          return this.getFallbackPriceAnalysis(data);
        }
      }

      private getFallbackHarvestRecommendation(data: any): any {
        const plantingDate = new Date(data.plantingDate);
        const today = new Date();
        const daysGrown = Math.floor((today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

        // Typical crop durations
        const cropDurations: { [key: string]: number } = {
          'Wheat': 120,
          'Rice': 120,
          'Maize': 90,
          'Cotton': 150,
          'Sugarcane': 365,
          'Potato': 90,
          'Tomato': 75,
          'Onion': 120
        };

        const expectedDuration = cropDurations[data.cropType] || 100;
        const daysRemaining = Math.max(0, expectedDuration - daysGrown);
        const readinessScore = Math.min(100, Math.round((daysGrown / expectedDuration) * 100));

        const optimalDate = new Date(plantingDate);
        optimalDate.setDate(optimalDate.getDate() + expectedDuration);

        return {
          optimalHarvestDate: optimalDate.toISOString().split('T')[0],
          daysRemaining,
          readinessScore,
          factors: {
            maturity: `Crop is ${readinessScore}% mature based on typical ${data.cropType} growth cycle`,
            weather: 'Current weather conditions are favorable for continued growth',
            market: 'Market prices are stable, no urgent need to harvest early'
          },
          recommendations: [
            daysRemaining > 0 ? `Wait ${daysRemaining} more days for optimal maturity` : 'Crop is ready for harvest',
            'Monitor weather forecasts for any adverse conditions',
            'Check market prices regularly for best selling opportunity'
          ],
          risks: [
            'Unexpected weather changes could affect harvest timing',
            'Market price fluctuations may impact profitability'
          ],
          confidence: 75,
          note: 'Using fallback recommendation. Enable Amazon Bedrock for AI-powered analysis.'
        };
      }

      private getFallbackRouteOptimization(data: any): any {
        const destinations = data.destinations || [];
        const optimizedRoute = destinations.map((dest: any, index: number) => ({
          order: index + 1,
          destination: dest.name || `Destination ${index + 1}`,
          estimatedTime: `${(index + 1) * 30} min`,
          distance: `${(index + 1) * 15} km`
        }));

        const totalDistance = destinations.length * 15;
        const totalTime = destinations.length * 0.5;

        return {
          optimizedRoute,
          totalDistance: `${totalDistance} km`,
          totalTime: `${totalTime} hours`,
          fuelEstimate: `${Math.round(totalDistance / 10)} liters`,
          costEstimate: `₹${Math.round(totalDistance * 8)}`,
          recommendations: [
            'Start early morning to avoid traffic',
            'Keep buffer time for loading/unloading',
            'Check vehicle condition before departure'
          ],
          efficiency: 80,
          note: 'Using fallback optimization. Enable Amazon Bedrock for AI-powered route planning.'
        };
      }

      private getFallbackPriceAnalysis(data: any): any {
        const basePrice = 2500;
        const variation = Math.random() * 500 - 250;
        const currentPrice = Math.round(basePrice + variation);
        const changePercentage = Math.round((variation / basePrice) * 100);

        return {
          currentPrice,
          trend: changePercentage > 0 ? 'rising' : changePercentage < 0 ? 'falling' : 'stable',
          changePercentage,
          forecast: [
            {
              period: '1 month',
              predictedPrice: Math.round(currentPrice * 1.05),
              confidence: 70
            },
            {
              period: '2 months',
              predictedPrice: Math.round(currentPrice * 1.08),
              confidence: 65
            },
            {
              period: '3 months',
              predictedPrice: Math.round(currentPrice * 1.12),
              confidence: 60
            }
          ],
          factors: {
            supply: 'Current supply levels are moderate',
            demand: 'Demand is steady with seasonal variations',
            seasonal: 'Post-harvest season typically sees lower prices',
            external: 'No major external factors affecting prices'
          },
          recommendations: [
            'Monitor market trends weekly',
            'Consider storage if prices are expected to rise',
            'Diversify selling across multiple buyers'
          ],
          riskLevel: 'medium',
          note: 'Using fallback analysis. Enable Amazon Bedrock for AI-powered market insights.'
        };
      }

}

export const bedrockService = new BedrockService();
