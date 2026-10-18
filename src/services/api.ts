import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Log all responses for debugging
        if (response.config.url?.includes('market-prices')) {
          console.log('🔍 Axios Response Interceptor:', {
            url: response.config.url,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          });
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Auth
  async register(data: any) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async sendOTP(data: any) {
    const response = await this.client.post('/auth/send-otp', data);
    return response.data;
  }

  async verifyOTP(data: any) {
    const response = await this.client.post('/auth/verify-otp', data);
    if (response.data.token) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/auth/profile', data);
    if (response.data.user) {
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async createPurchaseRequest(data: any) {
    const response = await this.client.post('/farmer/purchase-requests', data);
    return response.data;
  }

  async getMyPurchaseRequests() {
    const response = await this.client.get('/farmer/purchase-requests');
    return response.data;
  }

  async getMyListings() {
    // Farmer's listings are the same as purchase requests
    const response = await this.client.get('/farmer/purchase-requests');
    return response.data;
  }

  async getPurchaseRequest(id: string) {
    const response = await this.client.get(`/farmer/purchase-requests/${id}`);
    return response.data;
  }

  async getProcurementRequestDetail(id: string) {
    const response = await this.client.get(`/buyer/procurement-requests/${id}`);
    return response.data;
  }

  async getBuyerProcurementRequests() {
    const response = await this.client.get('/farmer/buyer-procurement-requests');
    return response.data;
  }

  async updatePurchaseRequest(id: string, data: any) {
    const response = await this.client.put(`/farmer/purchase-requests/${id}`, data);
    return response.data;
  }

  async deletePurchaseRequest(id: string) {
    const response = await this.client.delete(`/farmer/purchase-requests/${id}`);
    return response.data;
  }

  // Farmer APIs
  async getFarmerDashboard() {
    const response = await this.client.get('/farmer/dashboard');
    return response.data;
  }

  async getCropRecommendations(data: any) {
    const response = await this.client.post('/farmer/crop-recommendations', data);
    return response.data;
  }

  async getCrops() {
    const response = await this.client.get('/farmer/crops');
    return response.data;
  }

  async createCrop(data: any) {
    const response = await this.client.post('/farmer/crops', data);
    return response.data;
  }

  async updateCrop(id: string, data: any) {
    const response = await this.client.put(`/farmer/crops/${id}`, data);
    return response.data;
  }

  async deleteCrop(id: string) {
    const response = await this.client.delete(`/farmer/crops/${id}`);
    return response.data;
  }

  async getHarvests() {
    const response = await this.client.get('/farmer/harvests');
    return response.data;
  }

  async getHarvestTiming(cropId: string) {
    const response = await this.client.post(`/farmer/harvests/${cropId}/timing`);
    return response.data;
  }

  async listForSale(cropId: string, data: any) {
    const response = await this.client.post(`/farmer/harvests/${cropId}/list`, data);
    return response.data;
  }

  async getWeather(latitude?: number, longitude?: number, city?: string) {
    const params: any = {};
    if (latitude && longitude) {
      params.latitude = latitude;
      params.longitude = longitude;
    } else if (city) {
      params.city = city;
    }
    const response = await this.client.get('/farmer/weather', { params });
    return response.data;
  }

  async getMarketPrices(product?: string, state?: string) {
    const params: any = {};
    if (product) params.product = product;
    if (state) params.state = state;
    
    const response = await this.client.get('/farmer/market-prices', { params });
    return response.data;
  }

  // Buyer APIs
  async getBuyerDashboard() {
    const response = await this.client.get('/buyer/dashboard');
    return response.data;
  }

  async getAvailableProduce(filters?: any) {
    const response = await this.client.get('/buyer/available-produce', {
      params: filters,
    });
    return response.data;
  }

  async createProcurementRequest(data: any) {
    const response = await this.client.post('/buyer/procurement-requests', data);
    return response.data;
  }

  async getMyProcurementRequests() {
    const response = await this.client.get('/buyer/procurement-requests');
    return response.data;
  }

  async submitOffer(data: any) {
    const response = await this.client.post('/buyer/offers', data);
    return response.data;
  }

  async getMyOffers() {
    const response = await this.client.get('/offers/my-offers');
    return response.data;
  }

  async getOffersForListing(listingId: string) {
    const response = await this.client.get(`/offers/listing/${listingId}`);
    return response.data;
  }

  async getFarmerListing(id: string) {
    const response = await this.client.get(`/farmer/listings/${id}`);
    return response.data;
  }

  async updateOffer(offerId: string, data: any) {
    const response = await this.client.put(`/offers/${offerId}`, data);
    return response.data;
  }

  async acceptOffer(offerId: string) {
    const response = await this.client.post(`/offers/${offerId}/accept-award`);
    return response.data;
  }

  async confirmAcceptedOffer(offerId: string) {
    const response = await this.client.post(`/offers/${offerId}/confirm-acceptance`);
    return response.data;
  }

  async proposeAward(offerId: string) {
    const response = await this.client.post(`/offers/${offerId}/propose-award`);
    return response.data;
  }

  async counterOfferFromFarmer(offerId: string, data: any) {
    const response = await this.client.post(`/offers/${offerId}/counter`, data);
    return response.data;
  }

  async createOrder(data: any) {
    const response = await this.client.post('/buyer/orders', data);
    return response.data;
  }

  async getOrders() {
    const response = await this.client.get('/buyer/orders');
    return response.data;
  }

  async getOrderDetails(id: string) {
    const response = await this.client.get(`/buyer/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(id: string, status: string) {
    const response = await this.client.put(`/buyer/orders/${id}/status`, { status });
    return response.data;
  }

  async getInspections() {
    const response = await this.client.get('/buyer/inspections');
    return response.data;
  }

  async createInspection(data: any) {
    const response = await this.client.post('/buyer/inspections', data);
    return response.data;
  }

  async updateInspection(id: string, data: any) {
    const response = await this.client.put(`/buyer/inspections/${id}`, data);
    return response.data;
  }

  async analyzeQuality(id: string, imageBase64: string) {
    const response = await this.client.post(`/buyer/inspections/${id}/analyze`, {
      imageBase64,
    });
    return response.data;
  }

  async getMarketInsights() {
    const response = await this.client.get('/buyer/market-insights');
    return response.data;
  }

  async getPriceTrends(product?: string) {
    const response = await this.client.get('/buyer/price-trends', {
      params: { product },
    });
    return response.data;
  }

  // Admin APIs
  async getAdminDashboard() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  async getSystemHealth() {
    const response = await this.client.get('/admin/system-health');
    return response.data;
  }

  async getMetrics(timeRange?: string) {
    const response = await this.client.get('/admin/metrics', {
      params: { timeRange },
    });
    return response.data;
  }

  async getUsers(filters?: any) {
    const response = await this.client.get('/admin/users', {
      params: filters,
    });
    return response.data;
  }

  async getAnalytics() {
    const response = await this.client.get('/admin/analytics');
    return response.data;
  }

  // AI APIs
  async getAICropRecommendations(data: any) {
    const response = await this.client.post('/farmer/crop-recommendations', data);
    return response.data;
  }

  async getAISellingStrategy(data: any) {
    const response = await this.client.post('/ai/selling-strategy', data);
    return response.data;
  }



  async getAIHarvestTiming(data: any) {
    const response = await this.client.post('/ai/harvest-timing', data);
    return response.data;
  }

  async getAIRouteOptimization(data: any) {
    const response = await this.client.post('/ai/route-optimization', data);
    return response.data;
  }

  async getAIPriceAnalysis(data: any) {
    const response = await this.client.post('/ai/price-analysis', data);
    return response.data;
  }

  async getAIQualityAssessment(imageBase64: string) {
    const response = await this.client.post('/ai/quality-assessment', {
      imageBase64,
    });
    return response.data;
  }

  async getCropPlanningScenarios(data: any) {
    const response = await this.client.post('/ai/crop-planning-scenarios', data);
    return response.data;
  }

  async getResourceAllocationScenarios(data: any) {
    const response = await this.client.post('/ai/resource-allocation-scenarios', data);
    return response.data;
  }

  async getAuditRecord(decisionId: string) {
    const response = await this.client.get(`/ai/audit/${decisionId}`);
    return response.data;
  }

  async getUserAuditRecords(limit?: number) {
    const response = await this.client.get('/ai/audit', { params: { limit } });
    return response.data;
  }

  // Invoice APIs
  async getInvoices() {
    const response = await this.client.get('/invoices');
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    const response = await this.client.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async updateInvoiceStatus(invoiceId: string, data: any) {
    const response = await this.client.put(`/invoices/${invoiceId}/status`, data);
    return response.data;
  }

  // Notification APIs
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.put(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.put('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(id: string) {
    const response = await this.client.delete(`/notifications/${id}`);
    return response.data;
  }

  async clearAllNotifications() {
    const response = await this.client.delete('/notifications');
    return response.data;
  }

  // Quote/Negotiation APIs
  async submitQuote(data: any) {
    const response = await this.client.post('/quotes', data);
    return response.data;
  }

  async getQuotesForRequest(requestId: string) {
    const response = await this.client.get(`/quotes/request/${requestId}`);
    return response.data;
  }

  async updateQuote(quoteId: string, data: any) {
    const response = await this.client.put(`/quotes/${quoteId}`, data);
    return response.data;
  }

  async acceptQuote(quoteId: string) {
    const response = await this.client.post(`/quotes/${quoteId}/accept`);
    return response.data;
  }

  async counterOffer(quoteId: string, data: any) {
    const response = await this.client.post(`/quotes/${quoteId}/counter`, data);
    return response.data;
  }

  async acceptCounterOffer(quoteId: string, counterPrice: number) {
    const response = await this.client.post(`/quotes/${quoteId}/accept-counter`, {
      pricePerUnit: counterPrice
    });
    return response.data;
  }

  async deleteOffer(offerId: string) {
    const response = await this.client.delete(`/offers/${offerId}`);
    return response.data;
  }

  // Status update methods
  async updateListingStatus(listingId: string, status: string) {
    const response = await this.client.put(`/farmer/listings/${listingId}/status`, { status });
    return response.data;
  }

  async updateProcurementStatus(requestId: string, status: string) {
    const response = await this.client.put(`/buyer/procurement-requests/${requestId}/status`, { status });
    return response.data;
  }

  async deleteProcurementRequest(requestId: string) {
    const response = await this.client.delete(`/buyer/procurement-requests/${requestId}`);
    return response.data;
  }

  // Negotiation methods
  async negotiateListing(listingId: string, updates: any) {
    const response = await this.client.put(`/farmer/listings/${listingId}/negotiate`, updates);
    return response.data;
  }

  async negotiateProcurement(requestId: string, updates: any) {
    const response = await this.client.put(`/buyer/procurement-requests/${requestId}/negotiate`, updates);
    return response.data;
  }

  // AI Assistant (general-purpose farming Q&A)
  async askAIAssistant(question: string) {
    const response = await this.client.post('/ai/assistant', { question });
    return response.data;
  }

  // News + Disaster Insights for Dashboard
  async getNewsInsights(region?: string) {
    const params = region ? `?region=${encodeURIComponent(region)}` : '';
    const response = await this.client.get(`/ai/news-insights${params}`);
    return response.data;
  }

  // Auto-fetch market price for a specific crop
  async getMarketPriceForCrop(crop: string, state?: string) {
    const response = await this.client.get(`/ai/market-price/${encodeURIComponent(crop)}`, {
      params: state ? { state } : {},
    });
    return response.data;
  }

  // Quality assessment for farmers (image upload → Gemini Vision)
  async assessProduceQuality(
    imageBase64: string,
    cropType: string,
    stage: string,
    variety?: string,
    storageDays?: number,
    moisturePct?: number,
  ) {
    const response = await this.client.post('/ai/quality-assessment', {
      imageBase64,
      cropType,
      stage,
      variety,
      storageDays,
      moisturePct,
      mimeType: 'image/jpeg',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
