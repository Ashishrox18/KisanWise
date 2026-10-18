import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, CheckCircle } from 'lucide-react';
import { apiService } from '../../services/api';

export default function CreateProcurementRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    quantity: '',
    quantityUnit: 'quintals',
    qualityGrade: 'A',
    maxPricePerUnit: '',
    deliveryLocation: '',
    requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: ''
  });

  const cropTypes = [
    'Wheat', 'Rice', 'Maize', 'Bajra', 'Jowar',
    'Cotton', 'Sugarcane', 'Potato', 'Onion', 'Tomato',
    'Soybean', 'Groundnut', 'Mustard', 'Sunflower', 'Chickpea',
    'Lentils', 'Green Gram', 'Black Gram', 'Barley', 'Millet'
  ];

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cropType || !formData.quantity || !formData.maxPricePerUnit || !formData.deliveryLocation) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await apiService.createProcurementRequest({
        cropType: formData.cropType,
        variety: formData.variety,
        quantity: parseFloat(formData.quantity),
        quantityUnit: formData.quantityUnit,
        qualityGrade: formData.qualityGrade,
        maxPricePerUnit: parseFloat(formData.maxPricePerUnit),
        deliveryLocation: formData.deliveryLocation,
        requiredBy: formData.requiredBy,
        description: formData.description,
        status: 'open'
      });

      alert('Procurement request created successfully! Farmers can now see and quote on it.');
      navigate('/buyer/procurement');
    } catch (error: any) {
      console.error('Create procurement request error:', error);
      alert(error.response?.data?.error || 'Failed to create procurement request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <ShoppingCart className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create Procurement Request</h1>
        <p className="text-gray-600 mt-2">Tell farmers what you need and receive competitive quotes</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg">
        <div className="p-6 space-y-6">
          {/* Crop Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
              What Do You Need?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.cropType}
                  onChange={(e) => updateField('cropType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select crop you need</option>
                  {cropTypes.map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety (Optional)
                </label>
                <input
                  type="text"
                  value={formData.variety}
                  onChange={(e) => updateField('variety', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Basmati, HD-2967"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Needed <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                    step="0.01"
                    min="0"
                  />
                  <select
                    value={formData.quantityUnit}
                    onChange={(e) => updateField('quantityUnit', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="quintals">Quintals</option>
                    <option value="tons">Tons</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Quality Grade <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.qualityGrade}
                  onChange={(e) => updateField('qualityGrade', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">Grade A - Premium Quality</option>
                  <option value="B">Grade B - Good Quality</option>
                  <option value="C">Grade C - Average Quality</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Delivery */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Budget & Delivery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Price per {formData.quantityUnit} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    value={formData.maxPricePerUnit}
                    onChange={(e) => updateField('maxPricePerUnit', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your maximum budget"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Farmers will quote at or below this price</p>
              </div>

              <div className="flex items-center justify-center bg-blue-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Maximum Budget</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{formData.quantity && formData.maxPricePerUnit 
                      ? (parseFloat(formData.quantity) * parseFloat(formData.maxPricePerUnit)).toLocaleString()
                      : '0'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.deliveryLocation}
                  onChange={(e) => updateField('deliveryLocation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, District, State"
                />
                <p className="text-xs text-gray-500 mt-1">Where you need the produce delivered</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required By <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.requiredBy}
                  onChange={(e) => updateField('requiredBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Requirements (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add any specific requirements (organic certification, packaging needs, delivery terms, etc.)"
            />
          </div>

          {/* Benefits Info */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              What happens next?
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 ml-7">
              <li>• Your request will be visible to all farmers on the platform</li>
              <li>• Farmers with matching produce will submit competitive quotes</li>
              <li>• You'll receive notifications when farmers make offers</li>
              <li>• Compare quotes and select the best offer</li>
              <li>• Negotiate terms and finalize the deal</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Tips for Better Procurement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900 mb-1">✓ Set Realistic Budgets</p>
            <p>Research market rates to attract quality offers</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">✓ Be Specific</p>
            <p>Clear requirements help farmers provide accurate quotes</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">✓ Plan Ahead</p>
            <p>Give farmers enough time to prepare and deliver</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">✓ Add Details</p>
            <p>More information leads to better matching</p>
          </div>
        </div>
      </div>
    </div>
  );
}

