import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, TrendingUp, DollarSign, 
  Calendar, Package, AlertTriangle, CheckCircle 
} from 'lucide-react';

interface CropData {
  id: string;
  stage: 'pre-sowing' | 'growing' | 'harvest';
  cropType: string;
  variety?: string;
  landSize: number;
  landUnit: string;
  sowingDate?: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  quantity?: number;
  quantityUnit?: string;
  location: string;
  soilType?: string;
  irrigationType?: string;
}

export default function CropDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [crop, setCrop] = useState<CropData | null>(location.state?.crop || null);
  const [aiStrategy, setAiStrategy] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadCropData();
    }
  }, [id]);

  const loadCropData = async () => {
    // TODO: Load from API
  };

  const getAIRecommendations = async () => {
    setLoadingAI(true);
    try {
      // TODO: Call AI API based on stage
      setTimeout(() => {
        setAiStrategy({
          recommendation: 'Sample AI recommendation',
          confidence: 85
        });
        setLoadingAI(false);
      }, 1000);
    } catch (error) {
      setLoadingAI(false);
    }
  };

  const renderPreSowingStage = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Crop Planning</h2>
          {/* Form will go here */}
          <p className="text-gray-600">Pre-sowing stage form coming soon...</p>
        </div>
      </div>

      {/* AI Strategy Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 sticky top-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Strategy</h3>
          </div>
          
          {loadingAI ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Analyzing...</p>
            </div>
          ) : aiStrategy ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">{aiStrategy.recommendation}</p>
            </div>
          ) : (
            <button
              onClick={getAIRecommendations}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Get AI Recommendations
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderGrowingStage = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Growing Stage Management</h2>
          <p className="text-gray-600">Growing stage form coming soon...</p>
        </div>
      </div>

      {/* AI Strategy Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 sticky top-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Growing Strategy</h3>
          </div>
          <p className="text-sm text-gray-600">Weather-based recommendations and resource allocation strategy</p>
        </div>
      </div>
    </div>
  );

  const renderHarvestStage = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Harvest & Selling Strategy</h2>
          <p className="text-gray-600">Harvest stage with purchase request coming soon...</p>
        </div>
      </div>

      {/* AI Strategy Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow p-6 sticky top-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Selling Strategy</h3>
          </div>
          <p className="text-sm text-gray-600">AI-powered recommendations for optimal selling and storage strategy</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/farmer/crops')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {crop?.cropType || 'New Crop'}
          </h1>
          <p className="text-gray-600 mt-1">
            {crop?.stage === 'pre-sowing' && 'Planning & Preparation Stage'}
            {crop?.stage === 'growing' && 'Growing & Development Stage'}
            {crop?.stage === 'harvest' && 'Harvest & Selling Stage'}
          </p>
        </div>
      </div>

      {/* Stage-specific Content */}
      {crop?.stage === 'pre-sowing' && renderPreSowingStage()}
      {crop?.stage === 'growing' && renderGrowingStage()}
      {crop?.stage === 'harvest' && renderHarvestStage()}
      {!crop && <div>Loading...</div>}
    </div>
  );
}

