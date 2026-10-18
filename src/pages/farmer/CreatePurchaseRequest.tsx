import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, TrendingUp, Package, DollarSign, Calendar, MapPin } from 'lucide-react';
import { apiService } from '../../services/api';

export default function CreatePurchaseRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<any>(null);
  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    quantity: '',
    quantityUnit: 'quintals',
    qualityGrade: 'A',
    minimumPrice: '',
    expectedPrice: '',
    pickupLocation: '',
    availableFrom: '',
    availableTill: '',
    storageCapacity: '',
    immediateNeed: 'no',
    currentMarketPrice: '',
    description: ''
  });

  const cropTypes = [
    'Wheat', 'Rice', 'Maize', 'Bajra', 'Jowar',
    'Cotton', 'Sugarcane', 'Potato', 'Onion', 'Tomato',
    'Soybean', 'Groundnut', 'Mustard', 'Sunflower'
  ];

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getAISellingStrategy = async () => {
    if (!formData.cropType || !formData.quantity || !formData.currentMarketPrice) {
      alert('Please fill crop type, quantity, and current market price first');
      return;
    }

    setLoadingAI(true);
    try {
      const response = await apiService.getAISellingStrategy({
        cropType: formData.cropType,
        quantity: parseFloat(formData.quantity),
        quantityUnit: formData.quantityUnit,
        qualityGrade: formData.qualityGrade,
        currentMarketPrice: parseFloat(formData.currentMarketPrice),
        storageCapacity: formData.storageCapacity,
        immediateNeed: formData.immediateNeed === 'yes',
        location: formData.pickupLocation
      });

      setAiStrategy(response);
    } catch (error) {
      console.error('AI Strategy error:', error);
      alert('Failed to get AI recommendations');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiService.createPurchaseRequest({
        ...formData,
        quantity: parseFloat(formData.quantity),
        minimumPrice: parseFloat(formData.minimumPrice),
        expectedPrice: parseFloat(formData.expectedPrice),
        aiRecommendation: aiStrategy
      });

      alert('Purchase request created successfully!');
      navigate('/farmer/purchase-requests');
    } catch (error) {
      console.error('Create request error:', error);
      alert('Failed to create purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-gray-600 mt-1">List your harvest for buyers to quote</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
            <div className="p-6 space-y-6">
              {/* Crop Details */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Crop Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crop Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.cropType}
                      onChange={(e) => updateField('cropType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Crop</option>
                      {cropTypes.map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variety
                    </label>
                    <input
                      type="text"
                      value={formData.variety}
                      onChange={(e) => updateField('variety', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., HD-2967"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) => updateField('quantity', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter quantity"
                        step="0.01"
                      />
                      <select
                        value={formData.quantityUnit}
                        onChange={(e) => updateField('quantityUnit', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="quintals">Quintals</option>
                        <option value="tons">Tons</option>
                        <option value="kg">Kg</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.qualityGrade}
                      onChange={(e) => updateField('qualityGrade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="A">Grade A (Premium)</option>
                      <option value="B">Grade B (Good)</option>
                      <option value="C">Grade C (Average)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Market Price (₹/{formData.quantityUnit})
                    </label>
                    <input
                      type="number"
                      value={formData.currentMarketPrice}
                      onChange={(e) => updateField('currentMarketPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Current price"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Price (₹/{formData.quantityUnit}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.minimumPrice}
                      onChange={(e) => updateField('minimumPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Min acceptable"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Price (₹/{formData.quantityUnit})
                    </label>
                    <input
                      type="number"
                      value={formData.expectedPrice}
                      onChange={(e) => updateField('expectedPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Target price"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Availability */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Availability</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => updateField('pickupLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Village, District, State"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.availableFrom}
                      onChange={(e) => updateField('availableFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Till
                    </label>
                    <input
                      type="date"
                      value={formData.availableTill}
                      onChange={(e) => updateField('availableTill', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Storage & Urgency */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage & Urgency</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Storage Capacity ({formData.quantityUnit})
                    </label>
                    <input
                      type="number"
                      value={formData.storageCapacity}
                      onChange={(e) => updateField('storageCapacity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Available storage"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Immediate Cash Need?
                    </label>
                    <select
                      value={formData.immediateNeed}
                      onChange={(e) => updateField('immediateNeed', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="no">No - Can wait for better price</option>
                      <option value="yes">Yes - Need money urgently</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Details
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Any additional information for buyers..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Purchase Request'}
              </button>
            </div>
          </form>
        </div>

        {/* AI Strategy Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow p-6 sticky top-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Selling Strategy</h3>
            </div>

            {!aiStrategy ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Get AI-powered recommendations on:
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <TrendingUp className="h-4 w-4 mr-2 mt-0.5 text-orange-600" />
                    <span>Sell now vs store later analysis</span>
                  </li>
                  <li className="flex items-start">
                    <DollarSign className="h-4 w-4 mr-2 mt-0.5 text-orange-600" />
                    <span>Price trend predictions</span>
                  </li>
                  <li className="flex items-start">
                    <Package className="h-4 w-4 mr-2 mt-0.5 text-orange-600" />
                    <span>Optimal quantity split</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={getAISellingStrategy}
                  disabled={loadingAI}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {loadingAI ? 'Analyzing...' : 'Get AI Strategy'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Recommendations will be displayed here */}
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Recommendation</h4>
                  <p className="text-sm text-gray-700">{aiStrategy.recommendation}</p>
                </div>
                
                {aiStrategy.sellNowPercentage && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Optimal Split</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sell Now:</span>
                        <span className="font-semibold text-green-600">{aiStrategy.sellNowPercentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Store for Later:</span>
                        <span className="font-semibold text-blue-600">{aiStrategy.storeLaterPercentage}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={getAISellingStrategy}
                  disabled={loadingAI}
                  className="w-full px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition"
                >
                  Refresh Strategy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

