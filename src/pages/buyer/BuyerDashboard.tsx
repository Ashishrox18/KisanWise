import { ShoppingCart, Package, TrendingUp, Clock, Plus, List, Lightbulb, FileText, Warehouse, MapPin, RefreshCw, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiService } from '../../services/api'

const BuyerDashboard = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [procurementRequests, setProcurementRequests] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizedPurchases, setFinalizedPurchases] = useState<any[]>([]);

  useEffect(() => {
    // Get user from localStorage
    const userData = sessionStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    loadDashboardData();
    loadMyOffers();
    loadFinalizedPurchases();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadMyOffers();
      loadDashboardData();
      loadFinalizedPurchases();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadMyOffers(), loadFinalizedPurchases()]);
    setRefreshing(false);
  };

  const loadFinalizedPurchases = async () => {
    try {
      // Get all buyer's offers
      const response = await apiService.getMyOffers();
      const offers = response.offers || [];
      
      // Filter for finalized purchases (accepted offers)
      const finalized = offers.filter((offer: any) => offer.status === 'accepted');
      
      setFinalizedPurchases(finalized);
    } catch (error) {
      console.error('Failed to load finalized purchases:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [requestsResponse, pricesResponse] = await Promise.all([
        apiService.getMyProcurementRequests(),
        apiService.getPriceTrends().catch(() => ({ trends: [] }))
      ]);
      
      setProcurementRequests(requestsResponse.requests || []);
      setPriceData(pricesResponse.trends || [
        { month: 'Jan', rice: 22000, wheat: 24000 },
        { month: 'Feb', rice: 23000, wheat: 25000 },
        { month: 'Mar', rice: 21500, wheat: 24500 },
        { month: 'Apr', rice: 22500, wheat: 26000 },
        { month: 'May', rice: 24000, wheat: 27000 },
        { month: 'Jun', rice: 23500, wheat: 25500 },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOffers = async () => {
    setLoadingOffers(true);
    try {
      const response = await apiService.getMyOffers();
      console.log('📦 Loaded buyer offers:', response.offers?.length || 0);
      
      // Enrich offers with listing details if available
      const enrichedOffers = await Promise.all(
        (response.offers || []).map(async (offer: any) => {
          try {
            if (offer.listingId && !offer.listing) {
              const listingRes = await apiService.getFarmerListing(offer.listingId);
              return { ...offer, listing: listingRes.listing };
            }
            return offer;
          } catch (error) {
            console.error('Failed to load listing for offer:', offer.id);
            return offer;
          }
        })
      );
      
      setMyOffers(enrichedOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Calculate stats from real data
  const activeOrders = procurementRequests.filter(r => 
    r.status === 'in_progress' || r.status === 'negotiating' || r.status === 'accepted'
  );
  
  // Calculate total value and volume from finalized purchases (accepted offers)
  const totalPurchasedValue = finalizedPurchases.reduce((sum, purchase) => {
    const quantity = purchase.quantity || 0;
    const price = purchase.pricePerUnit || 0;
    return sum + (quantity * price);
  }, 0);
  
  const totalPurchasedVolume = finalizedPurchases.reduce((sum, purchase) => {
    return sum + (purchase.quantity || 0);
  }, 0);
  
  // Get the most common unit from finalized purchases
  const volumeUnit = finalizedPurchases.length > 0 
    ? (finalizedPurchases[0]?.quantityUnit || 'quintals')
    : 'quintals';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Buyer'}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-page-help'))}
            title={t('help.howToUse', { defaultValue: 'How to use this page' })}
            className="group flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-indigo-600 border border-gray-200 rounded-xl shadow-xs transition text-sm font-medium"
            aria-label={t('help.howToUse', { defaultValue: 'How to use this page' })}
          >
            <div className="w-5 h-5 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center font-serif font-bold text-xs italic">
              i
            </div>
            <span className="hidden sm:inline">{t('help.howToUse', { defaultValue: 'How to use' })}</span>
          </button>

          <a
            href="https://drive.google.com/file/d/1jf7otUtRIj6R79m1XapC7EI4VElVr2nF/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl shadow-xs transition text-sm font-medium"
            title="Watch Platform Demo Video"
          >
            <Play className="h-3.5 w-3.5 text-gray-500 fill-gray-500" />
            <span>Watch Demo</span>
          </a>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Requests</p>
              <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value Purchased</p>
              <p className="text-2xl font-bold text-green-600">₹{totalPurchasedValue.toLocaleString('en-IN')}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Volume Purchased</p>
              <p className="text-2xl font-bold text-purple-600">{totalPurchasedVolume.toFixed(1)} {volumeUnit}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{finalizedPurchases.length}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Requests and Offers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Procurement Requests */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Procurement Requests</h2>
              <Link to="/buyer/my-procurement-requests" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2 text-sm">Loading requests...</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">No active requests</p>
                <Link
                  to="/buyer/create-procurement-request"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Create Your First Request
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{request.cropType}</h3>
                      <p className="text-sm text-gray-600">{request.quantity} {request.quantityUnit} • {request.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">₹{request.targetPrice}/{request.quantityUnit}</p>
                      <p className="text-xs text-gray-500">{request.quotesCount || 0} quotes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Offers Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Offers on Farmer Listings</h2>
              <Link to="/buyer/procurement" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Browse Listings
              </Link>
            </div>

            {loadingOffers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2 text-sm">Loading offers...</p>
              </div>
            ) : myOffers.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">No offers submitted yet</p>
                <Link
                  to="/buyer/procurement"
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  Browse Farmer Listings
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.slice(0, 3).map((offer) => (
                  <Link
                    key={offer.id}
                    to={`/buyer/farmer-listing/${offer.listingId}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {offer.listing?.cropType || 'Unknown Crop'}
                          {offer.listing?.variety && ` (${offer.listing.variety})`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {offer.quantity} {offer.quantityUnit} • ₹{offer.pricePerUnit}/{offer.quantityUnit}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        offer.status === 'countered' ? 'bg-orange-100 text-orange-800' :
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {offer.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                      <div className="text-xs text-orange-600">
                        🔄 {offer.negotiationHistory.length} counter offer(s) from farmer
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Procurement Tips */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="h-6 w-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">Procurement Tips</h2>
            </div>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Monitor Market Prices</h3>
                    <p className="text-sm text-gray-700">
                      Keep track of market trends to make informed purchasing decisions. Compare prices across regions for better deals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                <div className="flex items-start space-x-3">
                  <Package className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Quality Inspection</h3>
                    <p className="text-sm text-gray-700">
                      Always inspect produce quality before finalizing purchases. Request samples and verify certifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                <div className="flex items-start space-x-3">
                  <Warehouse className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Storage Planning</h3>
                    <p className="text-sm text-gray-700">
                      Plan storage capacity before bulk purchases. Consider temperature and humidity requirements for different crops.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Contract Farming Benefits</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      Consider contract farming for consistent supply. Build long-term relationships with reliable farmers for better pricing.
                    </p>
                    <p className="text-xs text-gray-500">Updated 3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Price Trends and Quick Actions */}
        <div className="space-y-6">
          {/* Price Trends Widget */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Price Trends</h2>
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Last 6 months</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rice" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="wheat" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-gray-600">Rice</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-gray-600">Wheat</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/buyer/create-procurement-request"
                  className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition text-center"
                >
                  <Plus className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm font-semibold">Float Tender</p>
                </Link>
                <Link
                  to="/buyer/procurement"
                  className="p-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition text-center"
                >
                  <List className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm font-semibold">Browse Listings</p>
                </Link>
              </div>

              {/* Secondary Actions */}
              <div className="space-y-2">
                <Link
                  to="/buyer/my-procurement-requests"
                  className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition group"
                >
                  <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center mr-3">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">My Requests</p>
                    <p className="text-xs text-gray-600">Manage procurement</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyerDashboard
