import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  Sprout, Calendar, TrendingUp, 
  Cloud, Droplets, ThermometerSun, Wind, Package, MapPin,
  Warehouse, FileText, ShoppingCart, Lightbulb, AlertTriangle, ExternalLink, Sparkles, Radio,
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, ShieldOff, Leaf, Truck, Play
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiService } from '../../services/api'
import { useTranslation } from 'react-i18next'
import PageHelp from '../../components/PageHelp'

const FarmerDashboard = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [crops, setCrops] = useState<any[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [cropTips, setCropTips] = useState<{[key: string]: string}>({});
  const [loadingTips, setLoadingTips] = useState(false);
  const [soldCrops, setSoldCrops] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<{
    articles: any[];
    disasterAlert: any;
    aiInsights: string[];
    pestAlerts: any[];
    financialSchemes?: any[];
    marketTrends?: any[];
  } | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [showDisasterEvents, setShowDisasterEvents] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const userData = sessionStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    loadCrops();
    loadWeather();
    loadSoldCrops();
    loadNews();
  }, []);

  const loadNews = async (regionOverride?: string) => {
    try {
      setLoadingNews(true);
      const targetRegion = regionOverride || weather?.location?.city || user?.state || user?.location || undefined;
      const data = await apiService.getNewsInsights(targetRegion);
      setNewsData(data);
    } catch (err) {
      console.warn('Failed to load news insights:', err);
    } finally {
      setLoadingNews(false);
    }
  };

  const loadSoldCrops = async () => {
    try {
      // Fetch farmer's listings which includes finalized sales
      const response = await apiService.getMyPurchaseRequests();
      const listings = response.requests || [];
      
      // Filter for finalized/awarded listings (these are sold items)
      const finalizedListings = listings.filter((listing: any) => 
        listing.status === 'awarded' && listing.finalPrice
      );
      
      setSoldCrops(finalizedListings);
    } catch (error) {
      console.error('Failed to fetch sold crops:', error);
    }
  };

  // Auto-refresh sold crops every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadSoldCrops, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load AI tips when crops change
  useEffect(() => {
    if (crops.length > 0 && !loadingCrops) {
      loadCropTips();
    }
  }, [crops, loadingCrops]);

  const loadCropTips = async () => {
    const activeCropsFiltered = crops.filter(c => c.status !== 'ready' && c.status !== 'listed' && c.status !== 'sold');
    if (activeCropsFiltered.length === 0) return;

    setLoadingTips(true);
    const tips: {[key: string]: string} = {};

    // Comprehensive crop-specific tips database
    const cropTipsDatabase: {[key: string]: string} = {
      'Rice': 'Maintain 2-3 inches of standing water during vegetative stage. Apply nitrogen in 3 splits: basal, tillering, and panicle initiation. Watch for blast disease and stem borers.',
      'Wheat': 'Irrigate at crown root initiation (21 days), tillering (40 days), flowering (60 days), and grain filling (80 days). Apply nitrogen in 3 doses. Monitor for rust diseases and aphids.',
      'Cotton': 'Scout regularly for pink bollworm and whitefly. Maintain soil moisture during flowering and boll development. Apply potash for better fiber quality. Remove early squares to prevent pest buildup.',
      'Maize': 'Apply nitrogen at knee-high stage (30 days) and tasseling. Ensure adequate moisture during tasseling and silking for good pollination. Control fall armyworm with neem-based pesticides.',
      'Sugarcane': 'Maintain soil moisture throughout growth. Apply potash during grand growth phase (4-7 months) for better sugar content. Earthing up at 90-120 days protects roots and controls weeds.',
      'Potato': 'Hill up soil when plants are 6 inches tall to prevent greening. Irrigate every 7-10 days. Monitor for late blight in humid weather. Stop irrigation 10 days before harvest.',
      'Onion': 'Apply nitrogen in splits at 30 and 45 days. Stop irrigation 10-15 days before harvest for better storage. Cure bulbs in shade for 7-10 days before storage.',
      'Tomato': 'Stake plants at 15 days and prune suckers weekly. Apply calcium spray to prevent blossom end rot. Monitor for early blight and whitefly. Harvest when fruits show color break.',
      'Soybean': 'Inoculate seeds with Rhizobium culture before sowing. No nitrogen needed if properly inoculated. Control pod borers during flowering with neem oil. Harvest when 95% pods turn brown.',
      'Groundnut': 'Apply gypsum at 40-45 days (flowering stage) for better pod development. Maintain soil moisture during pegging and pod formation. Harvest when leaves turn yellow and pods show veining.',
      'Mustard': 'Irrigate at flowering (35 days) and pod formation (55 days). Apply sulfur for better oil content. Monitor for aphids and spray neem oil if population exceeds threshold.',
      'Chickpea': 'Avoid waterlogging - chickpea is sensitive to excess moisture. Apply phosphorus and potash at sowing. Spray boron at flowering for better pod set. Harvest when 80% pods turn brown.',
      'Sunflower': 'Irrigate at head formation and flowering stages. Apply boron spray at bud initiation for better seed filling. Protect heads from birds using nets. Harvest when back of head turns yellow.',
      'Bajra': 'Apply nitrogen in 2 splits: half at sowing, half at 30 days. Drought tolerant but needs moisture at flowering. Thin seedlings to 10-15 cm spacing for better yield.',
      'Jowar': 'Apply nitrogen at 30 days after sowing. Tolerates drought but needs moisture during grain filling. Control shoot fly with carbofuran at sowing. Harvest when grains harden.',
      'Bottle Gourd': 'Provide trellis support for vines. Hand pollinate flowers in early morning (6-8 AM) for better fruit set. Apply compost regularly. Harvest fruits when tender for better taste.',
      'Brinjal': 'Transplant 30-day seedlings at 60x45 cm spacing. Stake plants for support. Control fruit and shoot borer with pheromone traps. Harvest fruits when glossy and tender.',
      'Cabbage': 'Transplant at 4-5 leaf stage. Apply nitrogen in 3 splits. Maintain consistent moisture for head formation. Control diamond back moth with Bt spray. Harvest when heads are firm.',
      'Cauliflower': 'Blanch curds by tying leaves when curd is 5-7 cm diameter. Maintain consistent moisture. Apply boron to prevent hollow stem. Harvest when curds are compact and white.',
      'Carrot': 'Thin seedlings to 5 cm spacing at 3-4 leaf stage. Maintain consistent moisture for straight roots. Avoid fresh manure which causes forking. Harvest at 90-100 days.',
      'Chilli': 'Transplant 30-day seedlings. Apply calcium and boron for better fruit set. Control thrips and mites with neem oil. Harvest green or red based on market demand.',
      'Cucumber': 'Provide support for climbing varieties. Maintain consistent moisture. Apply potash for better fruit quality. Harvest fruits when tender, every 2-3 days.',
      'Peas': 'Inoculate seeds with Rhizobium. Provide support for climbing varieties. Irrigate at flowering and pod formation. Harvest green pods when fully developed but tender.',
      'Spinach': 'Sow in lines 20 cm apart. Apply nitrogen in 2-3 splits. Irrigate every 5-7 days. First harvest at 25-30 days, subsequent cuts every 15 days.',
      'Radish': 'Thin seedlings to 5 cm spacing. Maintain consistent moisture for tender roots. Avoid excess nitrogen which causes forking. Harvest at 30-40 days when roots are tender.',
    };

    try {
      // Get tips for up to 3 crops
      const cropsToFetch = activeCropsFiltered.slice(0, 3);
      
      for (const crop of cropsToFetch) {
        const cropName = crop.cropType || crop.name;
        
        // First try to get from database
        if (cropTipsDatabase[cropName]) {
          tips[cropName] = cropTipsDatabase[cropName];
        } else {
          // If not in database, try AI API
          try {
            const response = await apiService.getCropRecommendations({
              cropType: cropName,
              landSize: parseFloat(crop.area) || 1,
              soilType: crop.soilType || 'loam',
              season: 'current',
              location: user?.location || ''
            });

            if (response && response.recommendations && response.recommendations.length > 0) {
              const recommendation = response.recommendations[0];
              tips[cropName] = recommendation.careTips || recommendation.description || 
                cropTipsDatabase[cropName] || 
                `Apply balanced fertilizer and maintain proper irrigation for ${cropName}. Monitor regularly for pests and diseases.`;
            } else {
              tips[cropName] = `Apply balanced fertilizer and maintain proper irrigation for ${cropName}. Monitor regularly for pests and diseases.`;
            }
          } catch (error) {
            console.error(`Failed to get AI tips for ${cropName}:`, error);
            tips[cropName] = `Apply balanced fertilizer and maintain proper irrigation for ${cropName}. Monitor regularly for pests and diseases.`;
          }
        }
      }

      setCropTips(tips);
    } catch (error) {
      console.error('Failed to load crop tips:', error);
    } finally {
      setLoadingTips(false);
    }
  };

  const loadCrops = async () => {
    try {
      const response = await apiService.getCrops();
      const cropsWithDays = (response.crops || []).map((crop: any) => {
        // Calculate days to harvest
        const plantingDate = new Date(crop.plantingDate);
        const harvestDate = new Date(plantingDate);
        harvestDate.setDate(harvestDate.getDate() + (crop.duration || 90));
        
        const daysRemaining = Math.ceil(
          (harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          ...crop,
          daysToHarvest: Math.max(0, daysRemaining)
        };
      });
      setCrops(cropsWithDays);
    } catch (error) {
      console.error('Failed to load crops:', error);
    } finally {
      setLoadingCrops(false);
    }
  };

  const loadWeather = async () => {
    try {
      // Try to get user's location from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Success - use user's actual location
            const { latitude, longitude } = position.coords;
            console.log('📍 Using user location:', latitude, longitude);
            try {
              const response = await apiService.getWeather(latitude, longitude);
              setWeather(response);
              if (response?.location?.city) {
                loadNews(response.location.city);
              }
            } catch (error) {
              console.error('Failed to load weather with location:', error);
              // Fallback to default location
              const response = await apiService.getWeather();
              setWeather(response);
            } finally {
              setLoadingWeather(false);
            }
          },
          async (error) => {
            // Location unavailable - try IP-based geolocation as fallback
            console.log('📍 GPS location unavailable, trying IP-based location...');
            try {
              // Try to get approximate location from IP
              const ipResponse = await fetch('https://ipapi.co/json/');
              if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                console.log('📍 Using IP-based location:', ipData.city, ipData.country_name);
                const response = await apiService.getWeather(ipData.latitude, ipData.longitude);
                setWeather(response);
                if (ipData.region || ipData.city) {
                  loadNews(ipData.region || ipData.city);
                }
              } else {
                throw new Error('IP geolocation failed');
              }
            } catch (ipError) {
              // If IP geolocation also fails, use default
              console.log('📍 Using default location');
              const response = await apiService.getWeather();
              setWeather(response);
            } finally {
              setLoadingWeather(false);
            }
          },
          {
            timeout: 10000, // 10 second timeout
            enableHighAccuracy: false, // Faster, less battery
            maximumAge: 300000, // Accept cached position up to 5 minutes old
          }
        );
      } else {
        // Browser doesn't support geolocation - try IP-based
        console.log('📍 Geolocation not supported, trying IP-based location...');
        try {
          const ipResponse = await fetch('https://ipapi.co/json/');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            console.log('📍 Using IP-based location:', ipData.city, ipData.country_name);
            const response = await apiService.getWeather(ipData.latitude, ipData.longitude);
            setWeather(response);
            if (ipData.region || ipData.city) {
              loadNews(ipData.region || ipData.city);
            }
          } else {
            throw new Error('IP geolocation failed');
          }
        } catch (error) {
          console.log('📍 Using default location');
          const response = await apiService.getWeather();
          setWeather(response);
        } finally {
          setLoadingWeather(false);
        }
      }
    } catch (error) {
      console.error('Failed to load weather:', error);
      setLoadingWeather(false);
    }
  };

  const weatherData = weather?.forecast || [
    { day: 'Mon', temp: 28, rainfall: 0 },
    { day: 'Tue', temp: 30, rainfall: 5 },
    { day: 'Wed', temp: 29, rainfall: 12 },
    { day: 'Thu', temp: 27, rainfall: 8 },
    { day: 'Fri', temp: 28, rainfall: 0 },
    { day: 'Sat', temp: 31, rainfall: 0 },
    { day: 'Sun', temp: 32, rainfall: 0 },
  ]

  // Calculate stats from real data (excluding harvest ready, listed, and sold crops)
  const activeCropsFiltered = crops.filter(c => c.status !== 'ready' && c.status !== 'listed' && c.status !== 'sold');
  
  const totalLand = activeCropsFiltered.reduce((sum, crop) => sum + (parseFloat(crop.area) || 0), 0);
  const activeCrops = activeCropsFiltered.length;
  const expectedYield = activeCropsFiltered.reduce((sum, crop) => sum + (crop.expectedYield || 0), 0);
  
  // Calculate actual revenue from sold crops (finalized sales)
  const actualRevenue = soldCrops.reduce((sum, crop) => {
    const quantity = crop.quantity || 0;
    const price = crop.finalPrice || crop.currentBestOffer || 0;
    return sum + (quantity * price);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.welcomeBack')}, {user?.name || 'Farmer'}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-page-help'))}
            title={t('help.howToUse', { defaultValue: 'How to use this page' })}
            className="group flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-indigo-600 border border-gray-200 rounded-xl shadow-xs transition-all duration-150 text-sm font-medium"
            aria-label={t('help.howToUse', { defaultValue: 'How to use this page' })}
          >
            <div className="w-5 h-5 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center font-serif font-bold text-xs italic">
              i
            </div>
            <span className="hidden sm:inline">{t('help.howToUse', { defaultValue: 'How to use' })}</span>
          </button>

          <a
            href="https://drive.google.com/drive/folders/1OVLyLWQWmn-Q8rLDOUTN5P77ON7mEaAD?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl shadow-xs transition-all duration-150 text-sm font-medium"
            title="Watch Platform Demo Video"
          >
            <Play className="h-3.5 w-3.5 text-gray-500 fill-gray-500" />
            <span>Watch Demo</span>
          </a>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.totalLand')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalLand.toFixed(1)} {t('dashboard.acres')}</p>
            </div>
            <Sprout className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.activeCrops')}</p>
              <p className="text-2xl font-bold text-gray-900">{activeCrops}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.expectedYield')}</p>
              <p className="text-2xl font-bold text-gray-900">{expectedYield.toFixed(0)} {t('dashboard.tons')}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.totalRevenue')}</p>
              <p className="text-2xl font-bold text-green-600">₹{actualRevenue.toLocaleString('en-IN')}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Crops and Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Crops */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.currentCrops')}</h2>
              <Link to="/farmer/harvest" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            {loadingCrops ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-2 text-sm">{t('common.loading')}</p>
              </div>
            ) : crops.filter(crop => crop.status !== 'ready' && crop.status !== 'listed' && crop.status !== 'sold').length === 0 ? (
              <div className="text-center py-8">
                <Sprout className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">
                  {crops.length === 0 ? t('dashboard.noCropsPlanted') : t('dashboard.allCropsHarvested')}
                </p>
                <Link
                  to="/farmer/crop-planning"
                  className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                >
                  {crops.length === 0 ? t('dashboard.planFirstCrop') : t('dashboard.planNewCrop')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {crops.filter(crop => crop.status !== 'ready' && crop.status !== 'listed' && crop.status !== 'sold').slice(0, 3).map((crop) => (
                  <div key={crop.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Sprout className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{crop.cropType || crop.name}</h3>
                      <p className="text-sm text-gray-600">{crop.area} acres • {crop.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Farming Tips, Live News & Disaster Intelligence */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-orange-600 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {t('dashboard.liveAgriNews')}
                  </h2>
                  <p className="text-xs text-gray-500">{t('dashboard.liveAgriNewsDesc')}</p>
                </div>
              </div>
              <button 
                onClick={() => loadNews()}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition"
              >
                {loadingNews ? t('dashboard.updating') : t('dashboard.refreshFeed')}
              </button>
            </div>

            {/* 1. Live Disaster Alert from GDACS — Rich, non-technical farmer advisory */}
            {newsData?.disasterAlert && (() => {
              const alert = newsData.disasterAlert;
              const isSafe = alert.status === 'safe';
              const isWarning = alert.status === 'warning';
              const isSevere = alert.status === 'severe';

              const containerClass = isSafe
                ? 'bg-emerald-50 border-emerald-200'
                : isWarning
                ? 'bg-amber-50 border-amber-300'
                : 'bg-red-50 border-red-300';

              const headlineClass = isSafe ? 'text-emerald-900' : isWarning ? 'text-amber-900' : 'text-red-900';
              const badgeBg = isSafe ? 'bg-emerald-100 text-emerald-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
              const IconComp = isSafe ? ShieldCheck : isWarning ? ShieldAlert : ShieldOff;
              const iconClass = isSafe ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-red-600';
              const badgeLabel = isSafe ? t('dashboard.weatherSafeBadge') : isWarning ? t('dashboard.weatherWarningBadge') : t('dashboard.weatherSevereBadge');

              return (
                <div className={`border rounded-xl overflow-hidden ${containerClass}`}>
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <IconComp className={`h-5 w-5 flex-shrink-0 ${iconClass}`} />
                      <span className={`text-sm font-bold ${headlineClass}`}>{alert.headline}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="px-4 pb-3 text-xs text-gray-700 leading-relaxed">{alert.summary}</p>

                  {/* Three advisory columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 border-t border-gray-200">
                    {/* Soil */}
                    <div className="bg-white px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Leaf className="h-4 w-4 text-green-600" />
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{t('dashboard.soilWaterImpact')}</p>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{alert.soilAdvice}</p>
                    </div>
                    {/* Crop */}
                    <div className="bg-white px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{t('dashboard.cropAction')}</p>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{alert.cropAdvice}</p>
                    </div>
                    {/* Market & Transport */}
                    <div className="bg-white px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{t('dashboard.marketTransport')}</p>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{alert.monetaryTransportAdvice}</p>
                    </div>
                  </div>

                  {/* Collapsible events dropdown */}
                  {alert.events && alert.events.length > 0 && (
                    <div className="border-t border-gray-200">
                      <button
                        onClick={() => setShowDisasterEvents(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                      >
                        <span>{t('dashboard.viewRegionalEvents')} ({alert.events.length} {t('dashboard.observations')})</span>
                        {showDisasterEvents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {showDisasterEvents && (
                        <div className="px-4 pb-3 space-y-2 max-h-56 overflow-y-auto">
                          {alert.events.map((ev: any, idx: number) => (
                            <div key={ev.id || idx} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                              <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                ev.severity === 'Red' ? 'bg-red-500' : ev.severity === 'Orange' ? 'bg-amber-500' : 'bg-green-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 leading-snug">{ev.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500">{ev.type}</span>
                                  <span className="text-[10px] text-gray-400">·</span>
                                  <span className="text-[10px] text-gray-500">{ev.date}</span>
                                  <span className={`text-[10px] font-medium ${
                                    ev.severity === 'Red' ? 'text-red-600' : ev.severity === 'Orange' ? 'text-amber-600' : 'text-green-600'
                                  }`}>{ev.severityLabel}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. Live AI Actionable Insights */}
            {newsData?.aiInsights && newsData.aiInsights.length > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {t('dashboard.todaysAIBulletins')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {newsData.aiInsights.map((bullet: string, i: number) => (
                    <div key={i} className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-xs text-gray-800 leading-snug">
                      <span className="font-semibold text-emerald-700 mr-1.5">#{i + 1}</span>
                      {bullet.replace(/^-\s*/, '')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Pest & Disease Alert Panel */}
            {newsData?.pestAlerts && newsData.pestAlerts.length > 0 && (
              <div className="border border-orange-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200">
                  <span className="text-base">🔬</span>
                  <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider flex-1">
                    {t('dashboard.pestAlertsTitle')}
                  </h3>
                  <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full font-medium">
                    {t('dashboard.pestAlertsSeason')}
                  </span>
                </div>
                {/* Grid of pest cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100">
                  {newsData.pestAlerts.map((pa: any, idx: number) => {
                    const lvl = pa.warningLevel;
                    const lvlBg = lvl === 'High' ? 'bg-red-100 text-red-700' : lvl === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                    const lvlLabel = lvl === 'High' ? t('dashboard.highRisk') : lvl === 'Moderate' ? t('dashboard.moderateRisk') : t('dashboard.lowRisk');
                    const borderL = lvl === 'High' ? 'border-l-red-500' : lvl === 'Moderate' ? 'border-l-amber-400' : 'border-l-green-400';
                    return (
                      <div key={idx} className={`bg-white border-l-4 ${borderL} px-4 py-3`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl leading-none">{pa.icon}</span>
                            <p className="text-sm font-bold text-gray-900">{pa.pest}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${lvlBg}`}>
                            {lvlLabel}
                          </span>
                        </div>
                        {/* Affected crops */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(pa.affectedCrops || []).map((c: string, ci: number) => (
                            <span key={ci} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                        {/* Symptoms */}
                        <p className="text-[11px] text-gray-600 leading-snug mb-1">
                          <span className="font-semibold text-gray-700">{t('dashboard.pestSymptoms')}: </span>
                          {pa.symptoms}
                        </p>
                        {/* Action */}
                        <p className="text-[11px] text-emerald-800 leading-snug bg-emerald-50 px-2 py-1 rounded">
                          <span className="font-semibold">✅ {t('dashboard.pestAction')}: </span>
                          {pa.action}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Live Mandi Prices & Market Trends */}
            {newsData?.marketTrends && newsData.marketTrends.length > 0 && (
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      {t('dashboard.mandiTrendsTitle')}
                    </h3>
                  </div>
                  <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                    {t('dashboard.mandiTrendsDesc')}
                  </span>
                </div>
                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100">
                  {newsData.marketTrends.map((mt: any, idx: number) => {
                    const isRising = mt.trend === 'Rising';
                    const isSoft = mt.trend === 'Softening';
                    const trendBg = isRising 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : isSoft 
                      ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                      : 'bg-blue-100 text-blue-800 border border-blue-300';
                    const trendText = isRising 
                      ? `📈 ${t('dashboard.trendRising')}` 
                      : isSoft 
                      ? `📉 ${t('dashboard.trendSoftening')}` 
                      : `⚖️ ${t('dashboard.trendStable')}`;

                    return (
                      <div key={idx} className="bg-white p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl leading-none">{mt.icon}</span>
                              <span className="text-sm font-bold text-gray-900">{mt.crop}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trendBg}`}>
                              {trendText}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-base font-extrabold text-gray-900">{mt.mandiPriceRange}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {mt.mspComparison}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600 leading-snug mb-2">
                            {mt.trendReason}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[10px] text-gray-500">
                          <span>{t('dashboard.arrivals')}: <strong className="text-gray-700">{mt.arrivalStatus}</strong></span>
                          <span className="text-blue-600 font-medium">Mandi Benchmark</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Financial Availability & Government Schemes */}
            {newsData?.financialSchemes && newsData.financialSchemes.length > 0 && (
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 border-b border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏛️</span>
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      {t('dashboard.financialSchemesTitle')}
                    </h3>
                  </div>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                    {t('dashboard.financialSchemesDesc')}
                  </span>
                </div>
                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100">
                  {newsData.financialSchemes.map((fs: any, idx: number) => {
                    const catBg = fs.category === 'Credit' 
                      ? 'bg-blue-100 text-blue-800' 
                      : fs.category === 'Grant' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : fs.category === 'Insurance' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-amber-100 text-amber-800';

                    return (
                      <div key={idx} className="bg-white p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl leading-none">{fs.icon}</span>
                              <p className="text-xs font-bold text-gray-900 leading-tight">{fs.name}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${catBg}`}>
                              {fs.category}
                            </span>
                          </div>

                          {/* Benefit highlight */}
                          <div className="bg-purple-50/70 border border-purple-200/60 rounded-lg p-2 mb-2">
                            <p className="text-xs font-bold text-purple-950">
                              💰 {fs.benefit}
                            </p>
                            <p className="text-[10px] text-purple-700 mt-0.5 font-medium">
                              🟢 {fs.deadlineOrStatus}
                            </p>
                          </div>

                          <p className="text-[11px] text-gray-600 leading-snug mb-1.5">
                            {fs.details}
                          </p>

                          <p className="text-[10px] text-gray-500 mb-2">
                            <span className="font-semibold text-gray-600">{t('dashboard.eligibility')}:</span> {fs.eligibility}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                          <span className="text-gray-500">
                            {t('dashboard.howToApply')}: <strong className="text-purple-900 font-semibold">{fs.applyLinkOrDept}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Live Agriculture Headlines from GNews */}
            {newsData?.articles && newsData.articles.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>{t('dashboard.currentHeadlines')}</span>
                  <span className="text-[10px] text-gray-400 font-normal">({newsData.articles.length} updates)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {newsData.articles.slice(0, 4).map((art: any, idx: number) => (
                    <a
                      key={idx}
                      href={art.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-200 rounded-xl transition flex flex-col justify-between group"
                    >
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-800 line-clamp-2 mb-1">
                        {art.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>{art.source?.name || 'Agri News'}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-600" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Crop-specific management tips */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {activeCropsFiltered.length > 0 ? t('dashboard.tipsForYourCrops') : t('dashboard.farmingTips')}
              </h3>

              {activeCropsFiltered.length > 0 ? (
                <>
                  {loadingTips ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2 text-xs">{t('common.loadingTips')}</p>
                    </div>
                  ) : (
                    activeCropsFiltered.slice(0, 2).map((crop, index) => {
                      const cropName = crop.cropType || crop.name;
                      const tip = cropTips[cropName] || `Monitor ${cropName} regularly for optimal moisture and pest control.`;
                      return (
                        <div key={index} className="border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded-r-xl text-xs">
                          <p className="font-semibold text-gray-900 mb-0.5">{cropName} {t('common.careTips')}</p>
                          <p className="text-gray-700 leading-relaxed">{tip}</p>
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="border-l-4 border-emerald-500 bg-emerald-50/70 p-3 rounded-r-xl">
                    <p className="font-semibold text-gray-900 mb-0.5">{t('tips.optimalPlanting')}</p>
                    <p className="text-gray-700">{t('tips.optimalPlantingDesc')}</p>
                  </div>
                  <div className="border-l-4 border-blue-500 bg-blue-50/70 p-3 rounded-r-xl">
                    <p className="font-semibold text-gray-900 mb-0.5">{t('tips.waterManagement')}</p>
                    <p className="text-gray-700">{t('tips.waterManagementDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Weather and Quick Actions */}
        <div className="space-y-6">
          {/* Plant a Crop - Primary Action */}
          <Link
            to="/farmer/crop-planning"
            className="block card bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">{t('dashboard.plantACrop')}</h3>
                <p className="text-green-100 text-sm">{t('dashboard.getAIRecommendations')}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Sprout className="h-8 w-8" />
              </div>
            </div>
          </Link>

          {/* Weather Widget */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.weatherForecast')}</h2>
              {weather?.location && (
                <div className="flex items-center text-xs text-gray-500">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{weather.location.city || 'Your Location'}</span>
                </div>
              )}
            </div>
            {loadingWeather ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2 text-sm">{t('common.loading')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <ThermometerSun className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-600">{t('dashboard.temperature')}</p>
                      <p className="font-semibold">{weather?.current?.temperature || 28}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-600">{t('dashboard.humidity')}</p>
                      <p className="font-semibold">{weather?.current?.humidity || 65}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-600">{t('dashboard.wind')}</p>
                      <p className="font-semibold">{weather?.current?.windSpeed || 12} km/h</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Cloud className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-600">{t('dashboard.conditions')}</p>
                      <p className="font-semibold">{weather?.current?.conditions || t('dashboard.partlyCloudy')}</p>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weatherData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="temp" stroke="#22c55e" strokeWidth={2} />
                      <Line type="monotone" dataKey="rainfall" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
            <div className="space-y-3">
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/farmer/harvest?tab=list-produce"
                  className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition text-center"
                >
                  <ShoppingCart className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm font-semibold">{t('dashboard.listProduce')}</p>
                </Link>
                <Link
                  to="/farmer/harvest"
                  className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition text-center"
                >
                  <Package className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm font-semibold">{t('dashboard.manageHarvest')}</p>
                </Link>
              </div>

              {/* AI Feature Shortcuts */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">{t('dashboard.aiFeatures')}</p>
                <Link
                  to="/farmer/crop-planning"
                  className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Sprout className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t('dashboard.cropPlanningScenarios')}</p>
                    <p className="text-xs text-gray-500 truncate">{t('dashboard.cropPlanningScenariosDesc')}</p>
                  </div>
                </Link>
                <Link
                  to="/farmer/crop-map"
                  className="flex items-center p-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-emerald-200 rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t('dashboard.cropMap')}</p>
                    <p className="text-xs text-gray-500 truncate">{t('dashboard.cropMapDesc')}</p>
                  </div>
                </Link>
                <Link
                  to="/farmer/quality-assessment"
                  className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200 rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t('dashboard.qualityAssessment')}</p>
                    <p className="text-xs text-gray-500 truncate">{t('dashboard.qualityAssessmentDesc')}</p>
                  </div>
                </Link>
                <Link
                  to="/farmer/selling-strategy"
                  className="flex items-center p-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 border border-violet-200 rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-violet-100 group-hover:bg-violet-200 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t('dashboard.sellingStrategy')}</p>
                    <p className="text-xs text-gray-500 truncate">{t('dashboard.sellingStrategyDesc')}</p>
                  </div>
                </Link>
                <Link
                  to="/farmer/browse-procurement-requests"
                  className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition group"
                >
                  <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{t('dashboard.browseBuyerRequests')}</p>
                    <p className="text-xs text-gray-600">{t('dashboard.findBuyers')}</p>
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

export default FarmerDashboard

