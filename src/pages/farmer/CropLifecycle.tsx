import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, TrendingUp, Package, AlertCircle, Calendar, MapPin } from 'lucide-react';

interface CropStage {
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
  status: 'active' | 'completed';
  createdAt: string;
}

export default function CropLifecycle() {
  const navigate = useNavigate();
  const [crops, setCrops] = useState<CropStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrops();
  }, []);

  const loadCrops = async () => {
    // TODO: Load from API
    setLoading(false);
    // Mock data for now
    setCrops([
      {
        id: '1',
        stage: 'pre-sowing',
        cropType: 'Wheat',
        landSize: 5,
        landUnit: 'acres',
        location: 'Field A',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'pre-sowing':
        return {
          icon: Sprout,
          color: 'blue',
          label: 'Pre-Sowing',
          description: 'Planning & Preparation'
        };
      case 'growing':
        return {
          icon: TrendingUp,
          color: 'green',
          label: 'Growing',
          description: 'Crop Development'
        };
      case 'harvest':
        return {
          icon: Package,
          color: 'orange',
          label: 'Harvest Ready',
          description: 'Ready to Sell'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'gray',
          label: 'Unknown',
          description: ''
        };
    }
  };

  const handleCropClick = (crop: CropStage) => {
    navigate(`/farmer/crop/${crop.id}`, { state: { crop } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Lifecycle Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your crops from planning to harvest</p>
        </div>
        <button
          onClick={() => navigate('/farmer/crop/new')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          + Add New Crop
        </button>
      </div>

      {/* Stage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['pre-sowing', 'growing', 'harvest'].map((stage) => {
          const info = getStageInfo(stage);
          const Icon = info.icon;
          const count = crops.filter(c => c.stage === stage && c.status === 'active').length;
          
          return (
            <div key={stage} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{info.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                </div>
                <div className={`p-3 bg-${info.color}-100 rounded-lg`}>
                  <Icon className={`h-8 w-8 text-${info.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Crops List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Crops</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : crops.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active crops. Click "Add New Crop" to get started.
            </div>
          ) : (
            crops.map((crop) => {
              const info = getStageInfo(crop.stage);
              const Icon = info.icon;
              
              return (
                <div
                  key={crop.id}
                  onClick={() => handleCropClick(crop)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 bg-${info.color}-100 rounded-lg`}>
                        <Icon className={`h-6 w-6 text-${info.color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{crop.cropType}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {crop.location}
                          </span>
                          <span>{crop.landSize} {crop.landUnit}</span>
                          {crop.sowingDate && (
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Sown: {new Date(crop.sowingDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-${info.color}-100 text-${info.color}-700`}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

