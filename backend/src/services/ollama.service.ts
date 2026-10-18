import axios from 'axios';

export class OllamaService {
  private baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
  private model = process.env.OLLAMA_MODEL || 'llama3.1:8b';

  async generateSellingStrategy(prompt: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      });

      // Parse the JSON response
      const result = JSON.parse(response.data.response);
      return result;
    } catch (error: any) {
      console.error('Ollama error:', error.message);
      
      // Fallback to mock data if Ollama is not available
      if (error.code === 'ECONNREFUSED') {
        console.warn('Ollama not running, using mock data');
        return this.getMockStrategy();
      }
      
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/api/tags`);
      return true;
    } catch {
      return false;
    }
  }

  private getMockStrategy(): any {
    // Fallback mock data for development/testing
    return {
      summary: "Based on historical market trends, it's recommended to sell 40% of your harvest immediately and store 60% for 2-3 months when prices typically rise by 15-20%.",
      sellNowPercentage: 40,
      storeLaterPercentage: 60,
      pricePredictions: [
        { period: "1 month", price: 2300, change: 4.5 },
        { period: "2 months", price: 2500, change: 13.6 },
        { period: "3 months", price: 2400, change: 9.1 }
      ],
      profitComparison: {
        sellAllNow: 220000,
        followStrategy: 238000,
        additionalProfit: 18000
      },
      insights: [
        "Market demand typically increases 2-3 months post-harvest",
        "Storage costs are minimal compared to expected price gains",
        "Weather forecasts suggest favorable conditions for storage",
        "Current market supply is high, causing temporary price depression"
      ],
      confidence: 82
    };
  }
}

export const ollamaService = new OllamaService();
