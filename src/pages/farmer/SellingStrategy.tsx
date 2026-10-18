import { useState, useEffect } from 'react';
import { 
  Sparkles, TrendingUp, Package, DollarSign, Calendar, AlertCircle, 
  CheckCircle, HelpCircle, MapPin, RefreshCw, Loader, ArrowRight, ShieldCheck
} from 'lucide-react';
import SpeakButton from '../../components/SpeakButton';
import { apiService } from '../../services/api';
import AuditPanel from '../../components/AuditPanel';
import { CROP_CATALOG } from './QualityAssessment';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SellingStrategy() {
  const currentMonth = months[new Date().getMonth()];
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [auditDecisionId, setAuditDecisionId] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [priceStatus, setPriceStatus] = useState<{
    price: number;
    unit: string;
    trend?: string;
    change?: number;
    source?: string;
    rawAverage?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    cropType: '',
    expectedYield: '',
    yieldUnit: 'quintals',
    harvestMonth: currentMonth,
    currentMarketPrice: '',
    storageAvailable: 'yes',
    location: ''
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 1. Auto-detect browser location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&addressdetails=1`,
            { headers: { 'User-Agent': 'KisanWise/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            const parts = [
              addr?.city || addr?.town || addr?.village || addr?.county,
              addr?.state
            ].filter(Boolean);
            if (parts.length > 0) {
              updateField('location', parts.join(', '));
            }
          }
        } catch {
          // Silent fallback
        } finally {
          setFetchingLocation(false);
        }
      },
      () => setFetchingLocation(false),
      { timeout: 7000 }
    );
  };

  // 2. Auto-fetch market price when crop or unit changes
  const fetchMarketPrice = async (selectedCrop: string, unit: string) => {
    if (!selectedCrop) return;
    // Extract base crop name (e.g. "Rice (Basmati)" -> "Rice", "Turmeric / Haldi" -> "Turmeric")
    const cleanCrop = selectedCrop.split(/[\(\/]/)[0].trim();
    setFetchingPrice(true);
    try {
      const res = await apiService.getMarketPriceForCrop(cleanCrop);
      if (res && res.averagePrice) {
        let price = res.averagePrice;
        if (unit === 'kg') {
          price = Math.round((price / 100) * 10) / 10;
        } else if (unit === 'tons') {
          price = price * 10;
        }
        setFormData(prev => ({ ...prev, currentMarketPrice: String(price) }));
        setPriceStatus({
          price,
          unit,
          trend: res.trend,
          change: res.change,
          source: res.source,
          rawAverage: res.averagePrice,
        });
      }
    } catch (err) {
      console.warn('Market price auto-fetch failed:', err);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleCropChange = (crop: string) => {
    updateField('cropType', crop);
    fetchMarketPrice(crop, formData.yieldUnit);
  };

  const handleUnitChange = (unit: string) => {
    updateField('yieldUnit', unit);
    if (priceStatus?.rawAverage) {
      let price = priceStatus.rawAverage;
      if (unit === 'kg') price = Math.round((price / 100) * 10) / 10;
      else if (unit === 'tons') price = price * 10;
      updateField('currentMarketPrice', String(price));
      setPriceStatus(prev => prev ? { ...prev, price, unit } : null);
    } else if (formData.cropType) {
      fetchMarketPrice(formData.cropType, unit);
    }
  };

  const getSellingStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cropType || !formData.expectedYield || !formData.harvestMonth) {
      alert('Please fill in crop type, expected yield, and harvest month.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.getAISellingStrategy({
        cropType: formData.cropType,
        expectedYield: parseFloat(formData.expectedYield),
        yieldUnit: formData.yieldUnit,
        harvestMonth: formData.harvestMonth,
        currentMarketPrice: formData.currentMarketPrice ? parseFloat(formData.currentMarketPrice) : null,
        storageAvailable: formData.storageAvailable === 'yes',
        location: formData.location || 'India'
      });

      setStrategy(response);
    } catch (error: any) {
      console.error('AI Strategy error:', error);
      alert(error.response?.data?.error || 'Failed to get AI recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStrategy(null);
    setPriceStatus(null);
    setFormData({
      cropType: '',
      expectedYield: '',
      yieldUnit: 'quintals',
      harvestMonth: currentMonth,
      currentMarketPrice: '',
      storageAvailable: 'yes',
      location: formData.location
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini AI + Live Mandi Prices + Trust Engine</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Selling Strategy</h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Maximize your revenue with AI-driven price forecasts, sell-or-store split recommendations, and verifiable confidence audits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Your Crop Details</h2>
              <p className="text-xs text-gray-500">Auto-fills market rates and your location</p>
            </div>
          </div>

          <form onSubmit={getSellingStrategy} className="space-y-4">
            {/* Crop Selector with full catalog */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crop & Variety <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.cropType}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                <option value="">Select your crop variety</option>
                {CROP_CATALOG.map((cat) => (
                  <optgroup key={cat.group} label={cat.group}>
                    {cat.items.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select from 80+ crop varieties and commercial hybrids</p>
            </div>

            {/* Expected Yield */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Harvest Yield <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  value={formData.expectedYield}
                  onChange={(e) => updateField('expectedYield', e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="e.g. 50"
                  step="0.1"
                  min="0.1"
                />
                <select
                  value={formData.yieldUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
                >
                  <option value="quintals">Quintals</option>
                  <option value="tons">Tons</option>
                  <option value="kg">Kg</option>
                </select>
              </div>
            </div>

            {/* Harvest Month */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Harvest Month <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-emerald-700 font-medium">Default: {currentMonth}</span>
              </div>
              <select
                required
                value={formData.harvestMonth}
                onChange={(e) => updateField('harvestMonth', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Market Price Auto-fetched */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Current Market Price (₹/{formData.yieldUnit})
                </label>
                {fetchingPrice && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <Loader className="w-3 h-3 animate-spin" /> Fetching live mandi price...
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.currentMarketPrice}
                  onChange={(e) => updateField('currentMarketPrice', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Auto-fetched or enter manually"
                  step="0.01"
                  min="0"
                />
                {formData.cropType && (
                  <button
                    type="button"
                    onClick={() => fetchMarketPrice(formData.cropType, formData.yieldUnit)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-50"
                    title="Refresh price"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingPrice ? 'animate-spin' : ''}`} />
                    <span>Auto-fetch</span>
                  </button>
                )}
              </div>
              {priceStatus && (
                <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <span>⚡ Live Mandi Rate: ₹{priceStatus.price}/{priceStatus.unit}</span>
                  {priceStatus.trend && (
                    <span className="font-semibold capitalize">
                      Trend: {priceStatus.trend} ({priceStatus.change ? `${priceStatus.change > 0 ? '+' : ''}${priceStatus.change}%` : 'stable'})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Storage Available */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage / Warehouse Available?
              </label>
              <select
                value={formData.storageAvailable}
                onChange={(e) => updateField('storageAvailable', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                <option value="yes">Yes — I have storage / warehouse facility</option>
                <option value="no">No — Must sell immediately after harvest</option>
              </select>
            </div>

            {/* Location auto-detected */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Farm Location (District, State)
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={fetchingLocation}
                  className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  {fetchingLocation ? 'Detecting...' : 'Auto-detect'}
                </button>
              </div>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="District, State (e.g. Pune, Maharashtra)"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Analyzing Market & Signals...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate AI Selling Strategy</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI Strategy Results */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI Strategy Analysis</h2>
                  <p className="text-xs text-gray-500">Tailored recommendation for maximum profitability</p>
                </div>
              </div>
              {strategy && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Live Verified
                </span>
              )}
            </div>

            {!strategy ? (
              <div className="text-center py-16">
                <div className="bg-emerald-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Ready to Optimize Your Harvest Sales</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Select your crop and yield on the left. Our Gemini engine will analyze market trends and calculate your optimal selling window.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Strategy Summary */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Strategy Recommendation</h3>
                        <SpeakButton text={strategy.summary} title="Read strategy aloud" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{strategy.summary}</p>
                      {strategy.trustEngine?.verdict && (
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <p className="text-xs text-gray-500 italic leading-snug flex-1">
                            Trust Engine: {strategy.trustEngine.verdict}
                          </p>
                          <SpeakButton text={`Trust Engine: ${strategy.trustEngine.verdict}`} title="Read Trust Engine verdict aloud" />
                        </div>
                      )}
                      {strategy.scenarioMapper?.reasoning && (
                        <div className="mt-1 flex items-start justify-between gap-2">
                          <p className="text-xs text-gray-500 italic leading-snug flex-1">
                            Scenario: {strategy.scenarioMapper.reasoning}
                          </p>
                          <SpeakButton text={`Scenario Mapper: ${strategy.scenarioMapper.reasoning}`} title="Read scenario reasoning aloud" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sell Now vs Store Split */}
                {strategy.sellNowPercentage !== undefined && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-3">Recommended Volume Split</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Sell Immediately at Harvest</span>
                          <span className="text-sm font-bold text-emerald-700">{strategy.sellNowPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${strategy.sellNowPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ≈ {((parseFloat(formData.expectedYield || '0') * strategy.sellNowPercentage) / 100).toFixed(1)} {formData.yieldUnit}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Store for Upcoming Price Peak</span>
                          <span className="text-sm font-bold text-blue-700">{strategy.storeLaterPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${strategy.storeLaterPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ≈ {((parseFloat(formData.expectedYield || '0') * strategy.storeLaterPercentage) / 100).toFixed(1)} {formData.yieldUnit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Predictions */}
                {strategy.pricePredictions && strategy.pricePredictions.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2.5">Price Trend Forecast</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {strategy.pricePredictions.map((pred: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium mb-1">{pred.period}</p>
                          <p className="text-sm font-bold text-gray-900">₹{pred.price}</p>
                          {pred.change !== undefined && (
                            <span className={`inline-block text-[11px] font-semibold mt-0.5 px-1.5 py-0.2 rounded ${
                              pred.change >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {pred.change >= 0 ? '+' : ''}{pred.change}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profit Comparison */}
                {strategy.profitComparison && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Revenue Comparison</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Sell all immediately:</span>
                        <span className="font-medium text-gray-900">₹{strategy.profitComparison.sellAllNow?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Follow AI staggered strategy:</span>
                        <span className="font-semibold text-emerald-700">₹{strategy.profitComparison.followStrategy?.toLocaleString()}</span>
                      </div>
                      {strategy.profitComparison.additionalProfit > 0 && (
                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Net Extra Profit:</span>
                          <span className="text-base font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            +₹{strategy.profitComparison.additionalProfit?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Insights */}
                {strategy.insights && strategy.insights.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Market Signals & Tips</h3>
                    <ul className="space-y-1.5">
                      {strategy.insights.map((insight: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence & Explainable AI Audit */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Confidence Score</span>
                    <span className="text-xs font-bold text-gray-900">
                      {strategy.confidence ?? strategy.trustEngine?.confidence ?? 85}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${strategy.confidence ?? strategy.trustEngine?.confidence ?? 85}%` }}
                    />
                  </div>

                  {strategy.decisionId && (
                    <button
                      type="button"
                      onClick={() => setAuditDecisionId(strategy.decisionId)}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-medium text-xs hover:bg-emerald-100 transition-colors shadow-sm"
                    >
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <span>Why this answer? (Inspect Signals & Audit Trail)</span>
                    </button>
                  )}
                </div>

                {auditDecisionId && (
                  <AuditPanel decisionId={auditDecisionId} onClose={() => setAuditDecisionId(null)} />
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Try Another Crop
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition text-sm font-medium shadow-sm"
                  >
                    Save & Print Strategy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
