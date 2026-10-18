import Groq from 'groq-sdk';

class GroqService {
  private client: Groq | null = null;
  private enabled: boolean = false;
  private initialized: boolean = false;

  private initialize() {
    if (this.initialized) return;
    
    const apiKey = process.env.GROQ_API_KEY;
    const useGroq = process.env.USE_GROQ === 'true';

    console.log('🔍 Groq Debug - USE_GROQ:', process.env.USE_GROQ);
    console.log('🔍 Groq Debug - API Key exists:', !!apiKey);
    console.log('🔍 Groq Debug - API Key value:', apiKey?.substring(0, 10) + '...');

    if (useGroq && apiKey && apiKey !== 'your_groq_api_key_here') {
      this.client = new Groq({ apiKey });
      this.enabled = true;
      console.log('✅ Groq AI service initialized successfully!');
    } else {
      console.log('❌ Groq AI service disabled - set USE_GROQ=true and GROQ_API_KEY in .env');
    }
    
    this.initialized = true;
  }

  async getCropRecommendations(data: {
    landSize: number;
    soilType: string;
    location: string;
    waterAvailability: string;
    budget: number;
    season?: string;
  }): Promise<any> {
    this.initialize(); // Lazy initialization
    
    // Validate minimum budget (at least ₹5,000 per acre for basic farming)
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

    if (!this.enabled || !this.client) {
      console.log('Using fallback recommendations (Groq not configured)');
      console.log('💡 To enable AI: Get free API key from https://console.groq.com/keys');
      return this.getFallbackRecommendations(data);
    }

    try {
      console.log('🤖 Using Groq AI for crop recommendations...');
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

Consider:
1. Soil type compatibility
2. Water requirements vs availability
3. Budget constraints
4. Current market prices and demand
5. Seasonal suitability
6. Risk factors (pests, diseases, weather)
7. Expected ROI`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert agricultural advisor. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile', // Updated to newer model
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const result = JSON.parse(cleanedResponse);
      return result;
    } catch (error) {
      console.error('Groq API error:', error);
      return this.getFallbackRecommendations(data);
    }
  }

  private getFallbackRecommendations(data: any) {
    // Fallback recommendations based on soil type and water availability
    const recommendations = [];

    // Rice - good for clay soil and high water
    if ((data.soilType === 'clay' || data.soilType === 'loam') && 
        (data.waterAvailability === 'abundant' || data.waterAvailability === 'moderate')) {
      recommendations.push({
        name: 'Rice',
        suitability: 90,
        expectedYield: '4.5 tons/acre',
        revenue: '₹1.8L/acre',
        duration: '120 days',
        waterNeed: 'High',
        marketDemand: 'High',
        riskLevel: 'Low',
        reasoning: 'Excellent match for your soil type and water availability'
      });
    }

    // Wheat - versatile crop
    if (data.soilType === 'loam' || data.soilType === 'clay' || data.soilType === 'silt') {
      recommendations.push({
        name: 'Wheat',
        suitability: 85,
        expectedYield: '3.2 tons/acre',
        revenue: '₹1.2L/acre',
        duration: '90 days',
        waterNeed: 'Medium',
        marketDemand: 'Very High',
        riskLevel: 'Low',
        reasoning: 'High market demand and suitable for your conditions'
      });
    }

    // Cotton - for moderate water
    if (data.waterAvailability === 'moderate' || data.waterAvailability === 'limited') {
      recommendations.push({
        name: 'Cotton',
        suitability: 80,
        expectedYield: '2.8 tons/acre',
        revenue: '₹2.1L/acre',
        duration: '150 days',
        waterNeed: 'Medium',
        marketDemand: 'Medium',
        riskLevel: 'Medium',
        reasoning: 'Good revenue potential with moderate water needs'
      });
    }

    // Millets - for sandy soil and low water
    if (data.soilType === 'sandy' || data.waterAvailability === 'limited' || data.waterAvailability === 'scarce') {
      recommendations.push({
        name: 'Pearl Millet',
        suitability: 88,
        expectedYield: '2.5 tons/acre',
        revenue: '₹0.9L/acre',
        duration: '75 days',
        waterNeed: 'Low',
        marketDemand: 'Medium',
        riskLevel: 'Low',
        reasoning: 'Drought-resistant and suitable for low water availability'
      });
    }

    // Pulses - good for crop rotation
    recommendations.push({
      name: 'Chickpea',
      suitability: 75,
      expectedYield: '1.8 tons/acre',
      revenue: '₹1.1L/acre',
      duration: '100 days',
      waterNeed: 'Low',
      marketDemand: 'High',
      riskLevel: 'Low',
      reasoning: 'Good for soil health and has high market demand'
    });

    return {
      recommendations: recommendations.slice(0, 4),
      insights: {
        priceTrend: 'Stable',
        priceTrendPercentage: '+5%',
        bestPlantingTime: 'Current season is suitable for planting',
        demandForecast: 'Medium',
        additionalTips: [
          'Consider crop rotation to maintain soil health',
          'Monitor weather forecasts regularly',
          'Ensure proper irrigation management'
        ]
      }
    };
  }

  isEnabled(): boolean {
    this.initialize(); // Lazy initialization
    return this.enabled;
  }

  async getSellingStrategy(data: {
    cropType: string;
    expectedYield: number;
    yieldUnit: string;
    harvestMonth: string;
    currentMarketPrice?: number;
    storageAvailable: boolean;
    location?: string;
  }): Promise<any> {
    this.initialize(); // Lazy initialization
    
    console.log(`🤖 Groq getSellingStrategy called with:`, {
      cropType: data.cropType,
      expectedYield: data.expectedYield,
      yieldUnit: data.yieldUnit,
      currentMarketPrice: data.currentMarketPrice,
      storageAvailable: data.storageAvailable
    });
    
    if (!this.enabled || !this.client) {
      console.log('⚠️ Groq not enabled, using fallback selling strategy');
      return this.getFallbackSellingStrategy(data);
    }

    try {
      console.log('🤖 Using Groq AI for selling strategy...');
      
      // Crop-specific context
      const cropContext: { [key: string]: string } = {
        'Wheat': 'Wheat is a stable crop with 12-month storage life. Prices typically dip 10-15% during April-May harvest season and recover by 8-12% over next 3 months.',
        'Rice': 'Rice has good storage life and prices rise during festival seasons (Diwali, Pongal). Post-harvest prices typically increase 10-15% over 2-3 months.',
        'Maize': 'Maize has moderate storage (6 months) with steady year-round demand. Prices fluctuate 8-12% seasonally.',
        'Cotton': 'Cotton is export-dependent with high volatility (15-20%). Can be stored for 24 months. Prices vary significantly based on global markets.',
        'Potato': 'Potato is semi-perishable (3-month storage) with extreme volatility (25-30%). Prices can double or halve within weeks. Quick sale often recommended.',
        'Onion': 'Onion has 4-month storage with extreme price swings (30-40%). Market is highly unpredictable. Balanced selling strategy recommended.',
        'Tomato': 'Tomato is highly perishable (1-2 weeks). Must sell immediately. Prices vary 35-50% daily. Focus on quick sale.',
        'Soybean': 'Soybean has good storage (12 months) and export-driven pricing. Prices typically rise 8-10% post-harvest.',
        'Chickpea': 'Chickpea stores well (12 months) with festival demand spikes. Prices rise 12-15% during Diwali season.',
        'Sugarcane': 'Sugarcane must be sold immediately to mills. No storage option. Price is mill-dependent and relatively stable.',
        'Mustard': 'Mustard has good storage (12 months) with stable demand. Prices typically rise 8-10% post-harvest due to oil extraction demand.'
      };
      
      const context = cropContext[data.cropType] || 'This crop has moderate storage life and typical seasonal price variations.';
      
      // Calculate expected values for validation
      const basePrice = data.currentMarketPrice || 5000;
      const totalYield = data.expectedYield;
      const sellAllNowExpected = Math.round(totalYield * basePrice);
      
      const prompt = `You are an agricultural market expert specializing in Indian crop markets. Analyze this specific scenario:

Crop Details:
- Crop: ${data.cropType}
- Expected Yield: ${data.expectedYield} ${data.yieldUnit}
- Harvest Month: ${data.harvestMonth}
- Current Market Price: ₹${data.currentMarketPrice || basePrice}/${data.yieldUnit}
- Storage Available: ${data.storageAvailable ? 'Yes' : 'No'}
- Location: ${data.location || 'Not specified'}

Market Context for ${data.cropType}:
${context}

CRITICAL CALCULATION REQUIREMENTS:
1. "sellAllNow" MUST equal: ${data.expectedYield} × ${basePrice} = ₹${sellAllNowExpected}
2. Use the EXACT yield amount (${data.expectedYield} ${data.yieldUnit}) in all calculations
3. Price predictions must be based on the current price of ₹${basePrice}
4. All profit calculations must use these exact numbers

Your recommendations must be SPECIFIC to ${data.cropType}'s characteristics:
- Consider its storage life and perishability
- Account for its typical price volatility patterns
- Factor in seasonal demand patterns
- Use realistic price predictions based on historical ${data.cropType} market data

${data.storageAvailable ? 
  'Provide a split strategy (e.g., 30% sell now, 70% store) based on crop characteristics.' : 
  'Storage is NOT available - recommend selling 100% immediately.'}

Respond ONLY with valid JSON (no markdown):
{
  "summary": "Brief 2-3 sentence summary specific to ${data.cropType}",
  "sellNowPercentage": ${data.storageAvailable ? '30-70' : '100'},
  "storeLaterPercentage": ${data.storageAvailable ? '30-70' : '0'},
  "pricePredictions": [
    {"period": "1 month", "price": <calculate from base price>, "change": <percentage>},
    {"period": "2 months", "price": <calculate from base price>, "change": <percentage>},
    {"period": "3 months", "price": <calculate from base price>, "change": <percentage>}
  ],
  "profitComparison": {
    "sellAllNow": ${sellAllNowExpected},
    "followStrategy": <calculate based on strategy>,
    "additionalProfit": <followStrategy - sellAllNow>
  },
  "insights": ["${data.cropType}-specific insight1", "insight2", "insight3", "insight4"],
  "confidence": 75-95
}

VERIFY: sellAllNow MUST be exactly ₹${sellAllNowExpected} (${data.expectedYield} × ${basePrice})`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert agricultural market advisor. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile', // Updated to newer model
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Clean up response
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const result = JSON.parse(cleanedResponse);
      
      // Validate and correct the sellAllNow calculation if AI got it wrong
      const expectedSellAllNow = Math.round(data.expectedYield * (data.currentMarketPrice || 5000));
      if (result.profitComparison && Math.abs(result.profitComparison.sellAllNow - expectedSellAllNow) > 1000) {
        console.log(`⚠️ AI calculation mismatch - Correcting sellAllNow from ${result.profitComparison.sellAllNow} to ${expectedSellAllNow}`);
        result.profitComparison.sellAllNow = expectedSellAllNow;
        
        // Recalculate additional profit
        if (result.profitComparison.followStrategy) {
          result.profitComparison.additionalProfit = result.profitComparison.followStrategy - expectedSellAllNow;
        }
      }
      
      console.log(`✅ Groq AI response validated and corrected if needed`);
      return result;
    } catch (error) {
      console.error('Groq API error:', error);
      return this.getFallbackSellingStrategy(data);
    }
  }

  private getFallbackSellingStrategy(data: any): any {
    console.log(`📊 Fallback Strategy - Input Data:`, {
      cropType: data.cropType,
      expectedYield: data.expectedYield,
      yieldUnit: data.yieldUnit,
      currentMarketPrice: data.currentMarketPrice,
      storageAvailable: data.storageAvailable
    });
    
    // Crop-specific market data
    const cropData: { [key: string]: { basePrice: number; volatility: number; seasonalPattern: string; storageLife: number } } = {
      'Wheat': { basePrice: 2200, volatility: 0.08, seasonalPattern: 'Post-harvest dip in April-May', storageLife: 12 },
      'Rice': { basePrice: 2000, volatility: 0.10, seasonalPattern: 'Price rise during festival season', storageLife: 12 },
      'Maize': { basePrice: 1800, volatility: 0.12, seasonalPattern: 'Steady demand year-round', storageLife: 6 },
      'Cotton': { basePrice: 7500, volatility: 0.15, seasonalPattern: 'Global market dependent', storageLife: 24 },
      'Potato': { basePrice: 1200, volatility: 0.25, seasonalPattern: 'High volatility, quick sale recommended', storageLife: 3 },
      'Onion': { basePrice: 1500, volatility: 0.30, seasonalPattern: 'Extreme price swings', storageLife: 4 },
      'Tomato': { basePrice: 1800, volatility: 0.35, seasonalPattern: 'Highly perishable', storageLife: 1 },
      'Soybean': { basePrice: 4200, volatility: 0.10, seasonalPattern: 'Export-driven pricing', storageLife: 12 },
      'Chickpea': { basePrice: 5200, volatility: 0.12, seasonalPattern: 'Festival demand spike', storageLife: 12 },
      'Sugarcane': { basePrice: 350, volatility: 0.05, seasonalPattern: 'Mill-dependent pricing', storageLife: 0 }
    };

    const crop = cropData[data.cropType] || { basePrice: 2000, volatility: 0.10, seasonalPattern: 'Moderate', storageLife: 6 };
    const basePrice = data.currentMarketPrice || crop.basePrice;
    const totalYield = data.expectedYield;
    
    // Strategy varies by crop characteristics
    let sellNow, storeLater;
    
    if (crop.storageLife <= 1) {
      // Perishable crops - sell immediately
      sellNow = 100;
      storeLater = 0;
    } else if (crop.storageLife <= 4) {
      // Short storage life - sell most now
      sellNow = data.storageAvailable ? 70 : 100;
      storeLater = data.storageAvailable ? 30 : 0;
    } else if (crop.volatility > 0.20) {
      // High volatility - balanced approach
      sellNow = data.storageAvailable ? 50 : 100;
      storeLater = data.storageAvailable ? 50 : 0;
    } else {
      // Stable crops with good storage - store more
      sellNow = data.storageAvailable ? 30 : 100;
      storeLater = data.storageAvailable ? 70 : 0;
    }

    const sellNowAmount = (totalYield * sellNow) / 100;
    const storeLaterAmount = (totalYield * storeLater) / 100;

    // Price predictions based on crop volatility and seasonal patterns
    const priceIncrease1 = 1 + (crop.volatility * 0.5);
    const priceIncrease2 = 1 + (crop.volatility * 1.0);
    const priceIncrease3 = 1 + (crop.volatility * 0.8);
    
    const price1Month = Math.round(basePrice * priceIncrease1);
    const price2Months = Math.round(basePrice * priceIncrease2);
    const price3Months = Math.round(basePrice * priceIncrease3);

    // Profit calculations
    console.log(`💰 Profit Calculation Debug:`);
    console.log(`   - Total Yield: ${totalYield} ${data.yieldUnit}`);
    console.log(`   - Base Price: ₹${basePrice}/${data.yieldUnit}`);
    console.log(`   - Sell Now Amount: ${sellNowAmount} ${data.yieldUnit}`);
    console.log(`   - Store Later Amount: ${storeLaterAmount} ${data.yieldUnit}`);
    
    const sellAllNow = Math.round(totalYield * basePrice);
    console.log(`   - Sell All Now: ${totalYield} × ${basePrice} = ₹${sellAllNow}`);
    
    // For follow strategy: sell some now, rest later at predicted prices
    // Assuming stored portion is sold gradually: 30% in month 1, 40% in month 2, 30% in month 3
    const followStrategy = Math.round(
      (sellNowAmount * basePrice) + 
      (storeLaterAmount * 0.3 * price1Month) +
      (storeLaterAmount * 0.4 * price2Months) +
      (storeLaterAmount * 0.3 * price3Months)
    );
    console.log(`   - Follow Strategy: ₹${followStrategy}`);
    
    const additionalProfit = followStrategy - sellAllNow;
    
    // Storage costs (approximately 2-3% of value per month)
    const storageCostPerMonth = basePrice * 0.025;
    const avgStorageMonths = 2; // Average storage duration
    const totalStorageCost = Math.round(storeLaterAmount * storageCostPerMonth * avgStorageMonths);
    console.log(`   - Storage Cost: ₹${totalStorageCost}`);
    
    // Net additional profit after storage costs
    const netAdditionalProfit = additionalProfit - totalStorageCost;
    console.log(`   - Net Additional Profit: ₹${netAdditionalProfit}`);

    // Crop-specific insights
    const getInsights = () => {
      if (crop.storageLife <= 1) {
        return [
          `${data.cropType} is highly perishable - immediate sale is critical`,
          'Focus on finding buyers before harvest to avoid losses',
          'Consider cold storage facilities for small quantities',
          'Price negotiation should prioritize quick sale over maximum price'
        ];
      } else if (crop.volatility > 0.20) {
        return [
          `${data.cropType} has high price volatility - ${crop.seasonalPattern}`,
          'Diversify selling across multiple time periods to average out prices',
          'Monitor daily market rates and be ready to sell when prices spike',
          'Consider forward contracts to lock in minimum prices'
        ];
      } else if (data.storageAvailable) {
        return [
          `${data.cropType} prices typically rise ${Math.round(crop.volatility * 100)}% over 2-3 months post-harvest`,
          `Storage life of ${crop.storageLife} months allows flexible selling`,
          crop.seasonalPattern,
          'Monitor market prices weekly to identify optimal selling windows'
        ];
      } else {
        return [
          'Without storage, immediate sale is the safest option',
          `${data.cropType} can be stored for ${crop.storageLife} months with proper facilities`,
          'Consider partnering with local warehouses for future harvests',
          'Government warehouse receipt schemes can provide better prices'
        ];
      }
    };

    const getSummary = () => {
      if (crop.storageLife <= 1) {
        return `${data.cropType} is highly perishable. Sell 100% immediately to avoid spoilage losses. Focus on finding buyers before harvest.`;
      } else if (!data.storageAvailable) {
        return `Without storage facilities, sell your entire ${data.cropType} harvest immediately. Consider investing in storage for future harvests to maximize profits.`;
      } else if (crop.volatility > 0.20) {
        return `${data.cropType} has high price volatility. Recommend selling ${sellNow}% now and ${storeLater}% gradually over next 2-3 months to average out price fluctuations.`;
      } else {
        return `Based on market trends for ${data.cropType}, sell ${sellNow}% immediately to cover costs and store ${storeLater}% for better prices. Expected price increase of ${Math.round(crop.volatility * 100)}% over next 2-3 months.`;
      }
    };

    return {
      summary: getSummary(),
      sellNowPercentage: sellNow,
      storeLaterPercentage: storeLater,
      pricePredictions: [
        { period: '1 month', price: price1Month, change: Math.round((price1Month - basePrice) / basePrice * 100 * 10) / 10 },
        { period: '2 months', price: price2Months, change: Math.round((price2Months - basePrice) / basePrice * 100 * 10) / 10 },
        { period: '3 months', price: price3Months, change: Math.round((price3Months - basePrice) / basePrice * 100 * 10) / 10 }
      ],
      profitComparison: {
        sellAllNow,
        followStrategy,
        storageCost: data.storageAvailable ? totalStorageCost : 0,
        additionalProfit: data.storageAvailable ? Math.max(0, netAdditionalProfit) : 0
      },
      insights: getInsights(),
      confidence: crop.storageLife <= 1 ? 95 : (data.storageAvailable ? 75 : 85)
    };
  }
}

export const groqService = new GroqService();
