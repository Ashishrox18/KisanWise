import axios from 'axios';

// ── Extra context sources (macro, used by Scenario Mapper) ──

interface MarketPrice {
  commodity: string;
  market: string;
  state: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  date: string;
  trend?: 'rising' | 'falling' | 'stable';
  change?: number;
}

interface PriceCache {
  [key: string]: {
    data: MarketPrice[];
    timestamp: number;
  };
}

class MarketPriceService {
  private cache: PriceCache = {};
  private cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours

  // Crop name mapping for API compatibility
  private cropMapping: { [key: string]: string[] } = {
    'Wheat': ['wheat', 'gehun'],
    'Rice': ['rice', 'paddy', 'dhan'],
    'Maize': ['maize', 'corn', 'makka'],
    'Cotton': ['cotton', 'kapas'],
    'Sugarcane': ['sugarcane', 'ganna'],
    'Potato': ['potato', 'aloo'],
    'Onion': ['onion', 'pyaz'],
    'Tomato': ['tomato', 'tamatar'],
    'Soybean': ['soybean', 'soya'],
    'Groundnut': ['groundnut', 'peanut', 'moongfali'],
    'Mustard': ['mustard', 'sarson'],
    'Sunflower': ['sunflower'],
    'Chickpea': ['chickpea', 'gram', 'chana'],
    'Lentils': ['lentil', 'masoor'],
    'Bajra': ['bajra', 'pearl millet'],
    'Jowar': ['jowar', 'sorghum'],
    'Green Gram': ['green gram', 'moong'],
    'Black Gram': ['black gram', 'urad'],
    'Barley': ['barley', 'jau'],
    'Millet': ['millet', 'bajra']
  };

  /**
   * Get market prices for a specific crop
   * Uses data.gov.in API for real agricultural market data
   */
  async getMarketPrices(cropType: string, state?: string): Promise<MarketPrice[]> {
    const cacheKey = `${cropType}-${state || 'all'}`;
    
    // Check cache first
    if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheExpiry) {
      console.log(`📦 Using cached market prices for ${cropType}`);
      return this.cache[cacheKey].data;
    }

    try {
      console.log(`🌾 Fetching market prices for ${cropType}...`);
      
      // Try to fetch from data.gov.in API
      const prices = await this.fetchFromDataGovIn(cropType, state);
      
      if (prices.length > 0) {
        // Cache the results
        this.cache[cacheKey] = {
          data: prices,
          timestamp: Date.now()
        };
        return prices;
      }

      // Fallback to mock data if API fails
      console.log(`⚠️ Using fallback prices for ${cropType}`);
      return this.getFallbackPrices(cropType);
    } catch (error) {
      console.error('Market price fetch error:', error);
      return this.getFallbackPrices(cropType);
    }
  }

  /**
   * Fetch prices from data.gov.in API
   */
  private async fetchFromDataGovIn(cropType: string, state?: string): Promise<MarketPrice[]> {
    try {
      // Data.gov.in API endpoint for agricultural market prices
      // Note: This is a public API, but may require API key for production use
      const apiUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
      
      const params: any = {
        'api-key': process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
        'format': 'json',
        'limit': 100,
        'filters[commodity]': this.getCropVariants(cropType)[0]
      };

      if (state) {
        params['filters[state]'] = state;
      }

      const response = await axios.get(apiUrl, {
        params,
        timeout: 10000
      });

      if (response.data && response.data.records) {
        return this.parseDataGovResponse(response.data.records, cropType);
      }

      return [];
    } catch (error: any) {
      console.error('Data.gov.in API error:', error.message);
      return [];
    }
  }

  /**
   * Parse data.gov.in API response
   */
  private parseDataGovResponse(records: any[], cropType: string): MarketPrice[] {
    const prices: MarketPrice[] = [];

    for (const record of records) {
      try {
        const minPrice = parseFloat(record.min_price) || 0;
        const maxPrice = parseFloat(record.max_price) || 0;
        const modalPrice = parseFloat(record.modal_price) || ((minPrice + maxPrice) / 2);

        if (modalPrice > 0) {
          prices.push({
            commodity: cropType,
            market: record.market || 'Unknown',
            state: record.state || 'Unknown',
            district: record.district || 'Unknown',
            minPrice,
            maxPrice,
            modalPrice,
            date: record.arrival_date || new Date().toISOString().split('T')[0]
          });
        }
      } catch (error) {
        console.error('Error parsing record:', error);
      }
    }

    return prices;
  }

  /**
   * Get average price for a crop across all markets
   */
  async getAveragePrice(cropType: string, state?: string): Promise<{
    average: number;
    min: number;
    max: number;
    trend: 'rising' | 'falling' | 'stable';
    change: number;
    unit: string;
  }> {
    console.log(`🌾 Getting average price for ${cropType}${state ? ` in ${state}` : ''}`);
    
    const prices = await this.getMarketPrices(cropType, state);

    if (prices.length === 0) {
      console.log(`⚠️ No API data found for ${cropType}, using fallback prices`);
      return this.getFallbackAveragePrice(cropType);
    }

    console.log(`✅ Found ${prices.length} market prices for ${cropType}`);

    // Calculate average modal price
    const modalPrices = prices.map(p => p.modalPrice);
    const average = Math.round(modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length);
    const min = Math.round(Math.min(...modalPrices));
    const max = Math.round(Math.max(...modalPrices));

    // Estimate trend (simplified - in production, compare with historical data)
    const trend = this.estimateTrend(cropType);
    const change = this.estimateChange(cropType);

    console.log(`📊 Average price for ${cropType}: ₹${average} (${min}-${max}), Trend: ${trend} (${change}%)`);

    return {
      average,
      min,
      max,
      trend,
      change,
      unit: this.getPriceUnit(cropType)
    };
  }

  /**
   * Get crop name variants for API queries
   */
  private getCropVariants(cropType: string): string[] {
    return this.cropMapping[cropType] || [cropType.toLowerCase()];
  }

  /**
   * Get price unit based on crop type
   */
  private getPriceUnit(cropType: string): string {
    const tonCrops = ['Sugarcane', 'Cotton'];
    return tonCrops.includes(cropType) ? 'ton' : 'quintal';
  }

  /**
   * Estimate price trend (simplified)
   */
  private estimateTrend(cropType: string): 'rising' | 'falling' | 'stable' {
    // In production, this would analyze historical data
    // For now, use seasonal patterns
    const currentMonth = new Date().getMonth();
    
    // Post-harvest months typically see falling prices
    const harvestMonths: { [key: string]: number[] } = {
      'Wheat': [3, 4], // April-May
      'Rice': [9, 10], // October-November
      'Cotton': [10, 11], // November-December
    };

    const cropHarvestMonths = harvestMonths[cropType] || [];
    if (cropHarvestMonths.includes(currentMonth)) {
      return 'falling';
    } else if (cropHarvestMonths.includes((currentMonth + 1) % 12)) {
      return 'stable';
    }
    
    return 'rising';
  }

  /**
   * Estimate price change percentage
   */
  private estimateChange(cropType: string): number {
    const trend = this.estimateTrend(cropType);
    
    if (trend === 'rising') {
      return Math.round(Math.random() * 5 + 3); // 3-8%
    } else if (trend === 'falling') {
      return -Math.round(Math.random() * 5 + 2); // -2 to -7%
    }
    
    return Math.round(Math.random() * 3 - 1); // -1 to +2%
  }

  /**
   * Fallback prices based on typical Indian market rates (per quintal)
   */
  private getFallbackPrices(cropType: string): MarketPrice[] {
    console.log(`📦 Using fallback prices for ${cropType}`);
    
    const fallbackData: { [key: string]: number } = {
      'Wheat': 2450,
      'Rice': 2250,
      'Rice (Basmati)': 3800,
      'Rice (Non-Basmati)': 2200,
      'Rice (Sona Masoori)': 2800,
      'Maize': 2100,
      'Maize / Corn': 2100,
      'Bajra': 2350,
      'Bajra / Pearl Millet': 2350,
      'Jowar': 3180,
      'Jowar / Sorghum': 3180,
      'Barley': 2100,
      'Ragi': 3846,
      'Ragi / Finger Millet': 3846,
      'Oats': 2500,
      'Cotton': 7122,
      'Cotton (BT)': 7122,
      'Cotton (Desi)': 6620,
      'Sugarcane': 350,
      'Potato': 1400,
      'Onion': 1800,
      'Tomato': 2000,
      'Garlic': 9000,
      'Ginger': 7500,
      'Ginger / Adrak': 7500,
      'Turmeric': 9800,
      'Turmeric / Haldi': 9800,
      'Chilli': 14000,
      'Chilli / Green Pepper': 3500,
      'Capsicum': 3800,
      'Soybean': 4600,
      'Groundnut': 6377,
      'Groundnut / Peanut': 6377,
      'Mustard': 5650,
      'Mustard / Sarson': 5650,
      'Sunflower': 6760,
      'Chickpea': 5440,
      'Chickpea / Chana': 5440,
      'Lentils': 6425,
      'Lentils / Masoor Dal': 6425,
      'Green Gram': 8558,
      'Green Gram / Moong Dal': 8558,
      'Black Gram': 6950,
      'Black Gram / Urad Dal': 6950,
      'Pigeon Pea / Tur Dal': 7000,
      'Kidney Beans / Rajma': 9500,
      'Field Peas / Matar': 4500,
      'Moth Beans': 6500,
      'Horse Gram / Kulthi': 5500,
      'Millet': 2350,
      'Mango': 5000,
      'Banana': 2200,
      'Papaya': 1800,
      'Guava': 2500,
      'Lemon / Nimbu': 4000,
      'Orange': 4500,
      'Pomegranate': 7000,
      'Grapes': 6000,
      'Watermelon': 1200,
      'Apple': 8500,
      'Brinjal / Eggplant': 1800,
      'Okra / Bhindi': 2500,
      'Cauliflower': 1800,
      'Cabbage': 1500,
      'Spinach': 1600,
      'Carrot': 2200,
      'Radish': 1400,
      'Bitter Gourd / Karela': 2800,
      'Bottle Gourd / Lauki': 1600,
      'Cucumber': 1800,
      'Coffee': 26000,
      'Tea': 19000,
      'Cardamom': 160000,
      'Coriander': 7500,
      'Cumin / Jeera': 26000,
      'Black Pepper': 50000,
      'Clove': 80000,
      'Cinnamon': 35000,
      'Fennel / Saunf': 12000,
      'Jute': 5050,
      'Tobacco': 15000,
      'Rubber': 18000,
      'Rose': 9000,
      'Marigold': 3500,
      'Jasmine': 14000
    };

    const cleanName = cropType.split(/[\(\/]/)[0].trim().toLowerCase();
    let basePrice = fallbackData[cropType];
    if (!basePrice) {
      for (const [key, val] of Object.entries(fallbackData)) {
        if (key.toLowerCase() === cleanName || key.toLowerCase().includes(cleanName) || cleanName.includes(key.toLowerCase())) {
          basePrice = val;
          break;
        }
      }
    }
    basePrice = basePrice || 2200;
    const variation = basePrice * 0.1; // 10% variation

    console.log(`💰 Fallback price for ${cropType}: ₹${basePrice}/quintal`);

    return [{
      commodity: cropType,
      market: 'Average Market',
      state: 'India',
      district: 'National Average',
      minPrice: Math.round(basePrice - variation),
      maxPrice: Math.round(basePrice + variation),
      modalPrice: basePrice,
      date: new Date().toISOString().split('T')[0]
    }];
  }

  /**
   * Fallback average price
   */
  private getFallbackAveragePrice(cropType: string): {
    average: number;
    min: number;
    max: number;
    trend: 'rising' | 'falling' | 'stable';
    change: number;
    unit: string;
  } {
    const prices = this.getFallbackPrices(cropType);
    const price = prices[0];

    const result = {
      average: price.modalPrice,
      min: price.minPrice,
      max: price.maxPrice,
      trend: this.estimateTrend(cropType),
      change: this.estimateChange(cropType),
      unit: this.getPriceUnit(cropType)
    };

    console.log(`📊 Fallback average for ${cropType}:`, result);
    return result;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache() {
    this.cache = {};
    console.log('🗑️ Market price cache cleared');
  }
}

export const marketPriceService = new MarketPriceService();

// ─────────────────────────────────────────────────────────────────
// World Bank Commodity Price (Pink Sheet) — global trend context
// ─────────────────────────────────────────────────────────────────
export async function getWorldBankCommodityContext(commodityCode = 'WHEAT'): Promise<string> {
  try {
    const response = await axios.get(
      `https://api.worldbank.org/v2/en/indicator/PCOMM_${commodityCode}_USD?format=json&mrv=3`,
      { timeout: 8000 },
    );
    const records: any[] = response.data?.[1] ?? [];
    if (!records.length) return 'World Bank commodity data unavailable.';
    const recent = records.slice(0, 2).map((r: any) => `${r.date}: $${r.value ?? 'N/A'}/mt`).join(', ');
    return `World Bank ${commodityCode} price (USD/mt): ${recent}`;
  } catch {
    return 'World Bank commodity data unavailable.';
  }
}

// ─────────────────────────────────────────────────────────────────
// FAOSTAT — production/trade context for crop planning
// ─────────────────────────────────────────────────────────────────
export async function getFaostatContext(cropCode = '15' /* wheat */): Promise<string> {
  try {
    const response = await axios.get(
      `https://fenixservices.fao.org/faostat/api/v1/en/data/QCL?area=100&item=${cropCode}&element=5510&year=2022&format=json&limit=1`,
      { timeout: 8000 },
    );
    const data = response.data?.data?.[0];
    if (!data) return 'FAOSTAT data unavailable.';
    return `FAOSTAT India production (${data.Item}, ${data.Year}): ${data.Value} ${data.Unit}`;
  } catch {
    return 'FAOSTAT data unavailable.';
  }
}
