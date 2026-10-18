import { useState, useEffect, useRef } from 'react'
import { Sprout, TrendingUp, Calendar, MapPin, AlertCircle, Loader, Navigation, Search, CheckCircle, X, Info } from 'lucide-react'
import { apiService } from '../../services/api'
import FieldSectorMap, { SectorCrop } from '../../components/FieldSectorMap'
import MicButton from '../../components/MicButton'
import CropCostBreakdown from '../../components/CropCostBreakdown'

// ── Existing commodity list from market price service ────────────────────────
export const COMMODITY_CROPS = [
  'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Onion',
  'Tomato', 'Soybean', 'Groundnut', 'Mustard', 'Sunflower', 'Chickpea',
  'Lentils', 'Bajra', 'Jowar', 'Green Gram', 'Black Gram', 'Barley', 'Millet'
];

const COMMODITY_CROP_PROFILES: Record<string, {
  waterNeed: 'High' | 'Medium' | 'Low';
  duration: string;
  expectedYield: string;
  revenue: string;
  preferredSoils: string[];
  preferredSeasons: string[];
  priceTrend: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  defaultReason: string;
}> = {
  'Wheat': { waterNeed: 'Medium', duration: '90-120 days', expectedYield: '3.2 tons/acre', revenue: '₹1.2L/acre', preferredSoils: ['loam', 'clay'], preferredSeasons: ['rabi'], priceTrend: 'Rising (+6%)', riskLevel: 'Low', defaultReason: 'High mandi demand and stable MSP floor.' },
  'Rice': { waterNeed: 'High', duration: '120-140 days', expectedYield: '4.5 tons/acre', revenue: '₹1.8L/acre', preferredSoils: ['clay', 'loam', 'silt'], preferredSeasons: ['kharif'], priceTrend: 'Rising (+4%)', riskLevel: 'Low', defaultReason: 'Requires standing water and clayey retention soil.' },
  'Maize': { waterNeed: 'Medium', duration: '85-100 days', expectedYield: '3.8 tons/acre', revenue: '₹1.1L/acre', preferredSoils: ['loam', 'sandy'], preferredSeasons: ['kharif', 'rabi'], priceTrend: 'Stable (+2%)', riskLevel: 'Low', defaultReason: 'Resilient grain with continuous poultry & starch feed demand.' },
  'Cotton': { waterNeed: 'Medium', duration: '150-180 days', expectedYield: '1.6 tons/acre', revenue: '₹1.5L/acre', preferredSoils: ['clay', 'loam'], preferredSeasons: ['kharif'], priceTrend: 'Softening (-3%)', riskLevel: 'Medium', defaultReason: 'High value cash crop; sensitive to pest pressure and bollworm.' },
  'Sugarcane': { waterNeed: 'High', duration: '300-360 days', expectedYield: '35 tons/acre', revenue: '₹2.4L/acre', preferredSoils: ['loam', 'clay'], preferredSeasons: ['kharif', 'rabi'], priceTrend: 'Stable (FRP backed)', riskLevel: 'Low', defaultReason: 'Year-long crop with assured mill procurement.' },
  'Potato': { waterNeed: 'Medium', duration: '75-90 days', expectedYield: '8.5 tons/acre', revenue: '₹1.6L/acre', preferredSoils: ['sandy', 'loam'], preferredSeasons: ['rabi'], priceTrend: 'Rising (+8%)', riskLevel: 'Medium', defaultReason: 'Fast cash turnaround; requires cold storage access.' },
  'Onion': { waterNeed: 'Medium', duration: '100-120 days', expectedYield: '7.2 tons/acre', revenue: '₹1.7L/acre', preferredSoils: ['loam', 'silt'], preferredSeasons: ['rabi', 'kharif'], priceTrend: 'Volatile (+12%)', riskLevel: 'High', defaultReason: 'High profit upside with price volatility.' },
  'Tomato': { waterNeed: 'Medium', duration: '90-110 days', expectedYield: '12 tons/acre', revenue: '₹2.1L/acre', preferredSoils: ['loam', 'sandy'], preferredSeasons: ['rabi', 'zaid'], priceTrend: 'Rising (+7%)', riskLevel: 'Medium', defaultReason: 'High perishability requiring immediate market linkage.' },
  'Soybean': { waterNeed: 'Medium', duration: '90-105 days', expectedYield: '1.4 tons/acre', revenue: '₹95,000/acre', preferredSoils: ['clay', 'loam'], preferredSeasons: ['kharif'], priceTrend: 'Stable (MSP parity)', riskLevel: 'Low', defaultReason: 'Nitrogen-fixing oilseed with strong domestic crush demand.' },
  'Groundnut': { waterNeed: 'Low', duration: '105-125 days', expectedYield: '1.8 tons/acre', revenue: '₹1.3L/acre', preferredSoils: ['sandy', 'loam'], preferredSeasons: ['kharif', 'zaid'], priceTrend: 'Rising (+5%)', riskLevel: 'Low', defaultReason: 'Well suited to sandy loam; drought tolerant.' },
  'Mustard': { waterNeed: 'Low', duration: '105-120 days', expectedYield: '1.9 tons/acre', revenue: '₹1.25L/acre', preferredSoils: ['loam', 'sandy'], preferredSeasons: ['rabi'], priceTrend: 'Rising (+9%)', riskLevel: 'Low', defaultReason: 'Low water requirement with high oil mill demand.' },
  'Sunflower': { waterNeed: 'Low', duration: '85-95 days', expectedYield: '1.1 tons/acre', revenue: '₹85,000/acre', preferredSoils: ['loam', 'sandy'], preferredSeasons: ['zaid', 'rabi'], priceTrend: 'Stable', riskLevel: 'Medium', defaultReason: 'Fast growing drought resistant oilseed.' },
  'Chickpea': { waterNeed: 'Low', duration: '95-110 days', expectedYield: '1.5 tons/acre', revenue: '₹1.15L/acre', preferredSoils: ['loam', 'clay'], preferredSeasons: ['rabi'], priceTrend: 'Rising (+4%)', riskLevel: 'Low', defaultReason: 'Ideal for residual moisture; improves soil nitrogen.' },
  'Lentils': { waterNeed: 'Low', duration: '90-110 days', expectedYield: '1.2 tons/acre', revenue: '₹90,000/acre', preferredSoils: ['loam', 'clay'], preferredSeasons: ['rabi'], priceTrend: 'Rising (+3%)', riskLevel: 'Low', defaultReason: 'Hardy pulse crop suitable for dryland tracts.' },
  'Bajra': { waterNeed: 'Low', duration: '75-90 days', expectedYield: '2.2 tons/acre', revenue: '₹70,000/acre', preferredSoils: ['sandy', 'loam'], preferredSeasons: ['kharif'], priceTrend: 'Stable', riskLevel: 'Low', defaultReason: 'Highly heat and drought resilient millet.' },
  'Jowar': { waterNeed: 'Low', duration: '100-115 days', expectedYield: '2.5 tons/acre', revenue: '₹80,000/acre', preferredSoils: ['clay', 'loam'], preferredSeasons: ['kharif', 'rabi'], priceTrend: 'Stable', riskLevel: 'Low', defaultReason: 'Dual purpose grain and fodder crop.' },
  'Green Gram': { waterNeed: 'Low', duration: '65-75 days', expectedYield: '0.8 tons/acre', revenue: '₹75,000/acre', preferredSoils: ['loam', 'sandy'], preferredSeasons: ['zaid', 'kharif'], priceTrend: 'Rising (+5%)', riskLevel: 'Low', defaultReason: 'Short duration catch crop between main seasons.' },
  'Black Gram': { waterNeed: 'Low', duration: '70-85 days', expectedYield: '0.9 tons/acre', revenue: '₹80,000/acre', preferredSoils: ['loam', 'clay'], preferredSeasons: ['kharif', 'rabi'], priceTrend: 'Rising (+6%)', riskLevel: 'Low', defaultReason: 'High protein pulse with steady domestic consumption.' },
  'Barley': { waterNeed: 'Low', duration: '90-105 days', expectedYield: '2.8 tons/acre', revenue: '₹95,000/acre', preferredSoils: ['sandy', 'loam'], preferredSeasons: ['rabi'], priceTrend: 'Stable', riskLevel: 'Low', defaultReason: 'Tolerates salinity and moisture stress.' },
  'Millet': { waterNeed: 'Low', duration: '70-90 days', expectedYield: '1.8 tons/acre', revenue: '₹75,000/acre', preferredSoils: ['sandy', 'loam'], preferredSeasons: ['kharif'], priceTrend: 'Rising (+4%)', riskLevel: 'Low', defaultReason: 'Climate-smart grain with growing health grain demand.' },
};

function computeSearchedCropProfile(
  cropName: string,
  formData: { soilType: string; waterAvailability: string; season: string; budget: string; landSize: string }
): SectorCrop {
  const profile = COMMODITY_CROP_PROFILES[cropName] || {
    waterNeed: 'Medium' as const,
    duration: '90-110 days',
    expectedYield: '2.5 tons/acre',
    revenue: '₹1.0L/acre',
    preferredSoils: ['loam', 'clay'],
    preferredSeasons: ['rabi', 'kharif'],
    priceTrend: 'Stable',
    riskLevel: 'Medium' as const,
    defaultReason: 'Standard commercial crop profile.',
  };

  let score = 40;
  const reasons: string[] = [];

  if (formData.soilType && profile.preferredSoils.includes(formData.soilType)) {
    score += 20;
    reasons.push(`Well adapted to your ${formData.soilType} soil.`);
  } else if (formData.soilType) {
    score -= 10;
    reasons.push(`Prefers ${profile.preferredSoils.join('/')} soil over ${formData.soilType}.`);
  }

  if (formData.season && profile.preferredSeasons.includes(formData.season)) {
    score += 25;
    reasons.push(`Aligns with ${formData.season.toUpperCase()} seasonal cycle.`);
  } else if (formData.season) {
    score -= 15;
    reasons.push(`Outside primary ${profile.preferredSeasons.join('/')} window.`);
  }

  if (profile.waterNeed === 'High' && ['scarce', 'limited'].includes(formData.waterAvailability)) {
    score -= 20;
    reasons.push(`High water requirement is risky under ${formData.waterAvailability} water availability.`);
  } else {
    score += 15;
  }

  const finalSuitability = Math.max(25, Math.min(95, score));

  return {
    name: cropName,
    suitability: finalSuitability,
    expectedYield: profile.expectedYield,
    revenue: profile.revenue,
    duration: profile.duration,
    waterNeed: profile.waterNeed,
    marketDemand: finalSuitability > 70 ? 'High' : 'Moderate',
    riskLevel: finalSuitability < 50 ? 'High' : profile.riskLevel,
    priceTrend: profile.priceTrend,
    reasoning: reasons.join(' ') || profile.defaultReason,
  };
}

function getAutoSeason(): { value: string; label: string; period: string } {
  const month = new Date().getMonth(); // 0-11
  if (month >= 5 && month <= 8) {
    return { value: 'kharif', label: 'Kharif (Monsoon)', period: 'June – September' };
  } else if (month >= 2 && month <= 4) {
    return { value: 'zaid', label: 'Zaid (Summer)', period: 'March – May' };
  } else {
    return { value: 'rabi', label: 'Rabi (Winter)', period: 'October – February' };
  }
}

const CropPlanning = () => {
  const currentSeason = getAutoSeason();
  const [formData, setFormData] = useState({
    landSize: '',
    soilType: '',
    location: '',
    waterAvailability: '',
    budget: '',
    season: currentSeason.value
  });
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedCrops, setSelectedCrops] = useState<SectorCrop[]>([]);
  const [cropSearch, setCropSearch] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.getAICropRecommendations({
        landSize: parseFloat(formData.landSize),
        soilType: formData.soilType,
        location: formData.location,
        waterAvailability: formData.waterAvailability,
        budget: parseFloat(formData.budget),
        season: formData.season
      });

      // Check if there's a budget error
      if (response.error) {
        setError(response.error.suggestion || response.error.message);
        setRecommendations([]);
        setInsights(null);
      } else {
        const recs = response.recommendations || [];
        setRecommendations(recs);
        setInsights(response.insights || null);
        if (recs.length > 0) {
          setSelectedCrops(recs.slice(0, 2));
        }
      }
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setError('Failed to get AI recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCropSelection = (crop: SectorCrop) => {
    setSelectedCrops(prev => {
      const exists = prev.some(c => c.name.toLowerCase() === crop.name.toLowerCase());
      if (exists) {
        return prev.filter(c => c.name.toLowerCase() !== crop.name.toLowerCase());
      } else {
        return [...prev, crop];
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Show location suggestions when typing with debounce
    if (field === 'location' && value.length > 2) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Set new timeout for debounced search
      setSearchingLocations(true);
      searchTimeoutRef.current = setTimeout(() => {
        fetchLocationSuggestions(value);
      }, 500); // Wait 500ms after user stops typing
    } else if (field === 'location') {
      setShowSuggestions(false);
      setLocationSuggestions([]);
      setSearchingLocations(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  };

  const fetchLocationSuggestions = async (query: string) => {
    try {
      // Use OpenStreetMap Nominatim API to search for locations in India
      // This includes cities, towns, villages, and other settlements
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'KrishiEra/1.0'
          }
        }
      );
      const data = await response.json();
      
      // Format the results to show village/town/city, district, state
      const suggestions = data.map((item: any) => {
        const address = item.address;
        const parts = [];
        
        // Add village/town/city
        if (address.village) parts.push(address.village);
        else if (address.town) parts.push(address.town);
        else if (address.city) parts.push(address.city);
        else if (address.municipality) parts.push(address.municipality);
        
        // Add district if different from city/town
        if (address.county && !parts.includes(address.county)) {
          parts.push(address.county);
        }
        
        // Add state
        if (address.state) parts.push(address.state);
        
        return parts.join(', ');
      }).filter((loc: string) => loc.length > 0);
      
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      // Fallback to empty suggestions on error
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchingLocations(false);
    }
  };

  const selectLocation = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setShowSuggestions(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);
    console.log('🔍 Requesting location permission...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ Location obtained:', latitude, longitude);
        
        try {
          // Use OpenStreetMap Nominatim API for reverse geocoding (free)
          console.log('🌍 Fetching address from coordinates...');
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'KrishiConnect/1.0'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log('📍 Geocoding response:', data);
            const address = data.address;
            
            // Build a readable location string
            const locationParts = [
              address.village || address.town || address.city || address.suburb,
              address.county || address.state_district,
              address.state
            ].filter(Boolean);
            
            const locationString = locationParts.join(', ');
            
            if (locationString) {
              console.log('✅ Location set:', locationString);
              setFormData(prev => ({ ...prev, location: locationString }));
            } else {
              const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              console.log('⚠️ Using coordinates:', coords);
              setFormData(prev => ({ ...prev, location: coords }));
            }
          } else {
            console.warn('⚠️ Geocoding API returned error:', response.status);
            // Fallback to coordinates if geocoding fails
            const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setFormData(prev => ({ ...prev, location: coords }));
          }
        } catch (error) {
          console.error('❌ Error fetching location:', error);
          // Fallback to coordinates
          const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setFormData(prev => ({ ...prev, location: coords }));
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        setFetchingLocation(false);
        console.error('❌ Geolocation error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Unable to detect location. ';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage += 'Location permission was denied. Please check your browser settings and allow location access for this site.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage += 'Location information is unavailable. Please check your device settings.';
            break;
          case 3: // TIMEOUT
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred. Please enter your location manually.';
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup timeout on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crop Planning</h1>
        <p className="text-gray-600 mt-1">AI-powered recommendations for optimal crop selection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Land Size (acres)</label>
                <input
                  type="number"
                  value={formData.landSize}
                  onChange={(e) => handleInputChange('landSize', e.target.value)}
                  className="input"
                  placeholder="Enter land size"
                  required
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="label">Soil Type</label>
                <select
                  value={formData.soilType}
                  onChange={(e) => handleInputChange('soilType', e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select soil type</option>
                  <option value="clay">Clay</option>
                  <option value="loam">Loam</option>
                  <option value="sandy">Sandy</option>
                  <option value="silt">Silt</option>
                  <option value="peat">Peat</option>
                </select>
              </div>

              <div>
                <label className="label">Location</label>
                <div className="relative" ref={locationInputRef}>
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    onFocus={() => formData.location.length > 2 && fetchLocationSuggestions(formData.location)}
                    className="input pl-10 pr-20"
                    placeholder="Enter village, town, or city"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    {searchingLocations && (
                      <Loader className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={fetchingLocation}
                      className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                      title="Use current location"
                    >
                      {fetchingLocation ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Navigation className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Location Suggestions Dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {locationSuggestions.map((location, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectLocation(location)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">{location}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Type to search for villages, towns, or cities across India
                </p>
              </div>

              <div>
                <label className="label">Water Availability</label>
                <select 
                  value={formData.waterAvailability}
                  onChange={(e) => handleInputChange('waterAvailability', e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select availability</option>
                  <option value="abundant">Abundant</option>
                  <option value="moderate">Moderate</option>
                  <option value="limited">Limited</option>
                  <option value="scarce">Scarce</option>
                </select>
              </div>

              <div>
                <label className="label">Budget (₹)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  className="input"
                  placeholder="Enter available budget"
                  required
                  min="0"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Season</label>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Auto-detected ({currentSeason.period})
                  </span>
                </div>
                <select 
                  value={formData.season}
                  onChange={(e) => handleInputChange('season', e.target.value)}
                  className="input"
                  required
                >
                  <option value="kharif">Kharif (Monsoon — June to Sept)</option>
                  <option value="rabi">Rabi (Winter — Oct to Feb)</option>
                  <option value="zaid">Zaid (Summer — March to May)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Automatically set to current season ({currentSeason.label}), change if planning ahead.</p>
              </div>

              <button 
                type="submit" 
                className="w-full btn-primary flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Get AI Recommendations'
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">AI Analysis</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Our AI considers weather patterns, market demand, soil conditions, and historical data to provide personalized recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Crop Recommendations</h2>
            <p className="text-sm text-gray-600 mb-4">
              {recommendations.length > 0 
                ? 'Based on your farm data and current market conditions' 
                : 'Fill in your farm details to get personalized recommendations'}
            </p>
          </div>

          {/* 2D Field Sector Map — Multi-Crop Visualization */}
          {selectedCrops.length > 0 && (
            <div className="mb-6">
              <FieldSectorMap
                totalAcres={parseFloat(formData.landSize) || 5}
                selectedCrops={selectedCrops}
                onRemoveCrop={(cropName) => {
                  setSelectedCrops(prev => prev.filter(c => c.name.toLowerCase() !== cropName.toLowerCase()));
                }}
              />
            </div>
          )}

          {/* Search Input for Any Commodity */}
          <div className="card p-3 mb-4 bg-white border border-gray-200 shadow-xs">
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                placeholder="Search any crop or commodity to evaluate (e.g. Mustard, Cotton, Potato, Soybean)..."
                className="flex-1 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {cropSearch && (
                <button
                  type="button"
                  onClick={() => setCropSearch('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <MicButton onTranscribe={(t) => setCropSearch(t)} title="Search by voice" className="absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
            {cropSearch.trim() && (
              <p className="text-xs text-gray-500 mt-2">
                Evaluating crops matching &quot;{cropSearch}&quot; on-demand against your soil, water, and season. Select any to partition into your 2D sector map.
              </p>
            )}
          </div>

          {loading ? (
            <div className="card text-center py-12">
              <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">Analyzing your farm data...</p>
              <p className="text-sm text-gray-600 mt-2">Our AI is considering soil type, water availability, market trends, and more</p>
            </div>
          ) : error ? (
            <div className="card text-center py-12">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget Consideration</h3>
              <p className="text-gray-700 max-w-2xl mx-auto">{error}</p>
              <button 
                onClick={() => {
                  setError('');
                  setFormData(prev => ({ ...prev, budget: '' }));
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Adjust Budget
              </button>
            </div>
          ) : (() => {
            // Determine crops to render: either searched crops or recommendations
            let displayedCrops: SectorCrop[] = [];

            if (cropSearch.trim()) {
              const query = cropSearch.toLowerCase().trim();
              const matchingNames = COMMODITY_CROPS.filter(name => name.toLowerCase().includes(query));
              
              displayedCrops = matchingNames.map(name => {
                const existing = recommendations.find(r => r.name.toLowerCase() === name.toLowerCase());
                if (existing) return existing;
                return computeSearchedCropProfile(name, formData);
              });
            } else {
              displayedCrops = recommendations;
            }

            if (displayedCrops.length === 0) {
              return (
                <div className="card text-center py-12">
                  <Sprout className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {cropSearch ? 'No Matching Crops Found' : 'No Recommendations Yet'}
                  </h3>
                  <p className="text-gray-600">
                    {cropSearch 
                      ? `No commodities matching "${cropSearch}". Try searching Wheat, Rice, Mustard, Cotton, Potato, etc.`
                      : 'Enter your farm details in the form to get AI-powered crop recommendations, or search any commodity above.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {displayedCrops.map((crop, index) => {
                  const isSelected = selectedCrops.some(c => c.name.toLowerCase() === crop.name.toLowerCase());
                  const isSearchedOnDemand = !recommendations.some(r => r.name.toLowerCase() === crop.name.toLowerCase());

                  return (
                    <div
                      key={index}
                      className={`card transition-all hover:shadow-md border ${
                        isSelected ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-600'
                          }`}>
                            <Sprout className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
                              {isSearchedOnDemand && (
                                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  Searched • On-Demand Scenario
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center">
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600"
                                    style={{ width: `${crop.suitability}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 ml-2">{crop.suitability}% match</span>
                              </div>
                              {crop.priceTrend && (
                                <span className="text-[11px] text-gray-500 font-medium ml-2">
                                  Trend: {crop.priceTrend}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top-right multi-select toggle button */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary-600">{crop.revenue}</p>
                            <p className="text-xs text-gray-500">Expected revenue</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCropSelection(crop);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-400'
                            }`}
                          >
                            <CheckCircle className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                            <span>{isSelected ? '✓ In Sector Map' : '+ Add to Sector Map'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">Expected Yield</p>
                          <p className="font-semibold text-gray-900">{crop.expectedYield}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Duration</p>
                          <p className="font-semibold text-gray-900">{crop.duration}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Water Need</p>
                          <p className="font-semibold text-gray-900">{crop.waterNeed}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Market Demand</p>
                          <p className="font-semibold text-gray-900">{crop.marketDemand}</p>
                        </div>
                      </div>

                      {crop.reasoning && (
                        <div className={`mb-3 p-3 rounded-lg text-sm ${
                          isSearchedOnDemand ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-blue-50 text-blue-900'
                        }`}>
                          <p>
                            <span className="font-medium">
                              {isSearchedOnDemand ? 'AI Evaluation & Fit Insight:' : 'AI Insight:'}
                            </span>{' '}
                            {crop.reasoning}
                          </p>
                        </div>
                      )}

                      {/* ── Expenditure split + budget optimiser ── */}
                      <CropCostBreakdown
                        cropName={crop.name}
                        landSize={parseFloat(formData.landSize) || 1}
                        season={formData.season}
                        waterAvailability={formData.waterAvailability}
                        budget={parseFloat(formData.budget) || 0}
                      />

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          crop.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                          crop.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {crop.riskLevel} Risk
                        </span>
                        
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiService.createCrop({
                                name: crop.name,
                                area: parseFloat(formData.landSize) || 1,
                                plantingDate: new Date().toISOString(),
                                duration: parseInt(crop.duration || '90') || 90,
                                expectedYield: parseFloat(crop.expectedYield || '0') || 0,
                                expectedRevenue: parseFloat(crop.revenue?.replace(/[₹,L]/g, '') || '0') * 100000 || 0,
                                status: 'planned',
                                soilType: formData.soilType || 'loam',
                                waterNeed: crop.waterNeed || 'Medium',
                                marketDemand: crop.marketDemand || 'High',
                                riskLevel: crop.riskLevel || 'Low'
                              });
                              
                              alert(`✅ ${crop.name} has been added to your crop plan! Check Harvest Management to see it.`);
                            } catch (error) {
                              console.error('Failed to save crop:', error);
                              alert('Failed to save crop plan. Please try again.');
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          Plant This Crop
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Market Insights */}
          {insights && (
            <div className="card mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Price Trend</p>
                  <p className="text-lg font-semibold text-gray-900">{insights.priceTrend}</p>
                  <p className="text-xs text-gray-600 mt-1">{insights.priceTrendPercentage} in last 30 days</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Best Planting Time</p>
                  <p className="text-lg font-semibold text-gray-900">{insights.bestPlantingTime}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
                  <p className="text-sm text-gray-600">Demand Forecast</p>
                  <p className="text-lg font-semibold text-gray-900">{insights.demandForecast}</p>
                </div>
              </div>
              
              {insights.additionalTips && insights.additionalTips.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Additional Tips:</h3>
                  <ul className="space-y-1">
                    {insights.additionalTips.map((tip: string, index: number) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CropPlanning

