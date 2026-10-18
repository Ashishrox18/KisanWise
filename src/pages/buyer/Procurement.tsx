import { Search, MapPin, Package, Calendar, Plus, TrendingUp, Truck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import { getRelativeTime, formatDateTime } from '../../utils/timeUtils'
import { gradeToTier, QUALITY_TIERS } from '../../utils/cropQualityGrades'

const Procurement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCrop, setSelectedCrop] = useState('')
  const [selectedQuality, setSelectedQuality] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      console.log('Loading buyer procurement page...')
      const response = await apiService.getAvailableProduce()
      console.log('Available produce response:', response)
      setListings(response.listings || [])
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredListings = listings.filter(listing => {
    const matchesSearch = !searchTerm || 
      listing.cropType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCrop = !selectedCrop || listing.cropType === selectedCrop
    const matchesQuality = !selectedQuality || gradeToTier(listing.qualityGrade, listing.cropType) === selectedQuality
    const matchesLocation = !selectedLocation || 
      listing.pickupLocation.toLowerCase().includes(selectedLocation.toLowerCase())
    
    return matchesSearch && matchesCrop && matchesQuality && matchesLocation
  })

  const uniqueCrops = Array.from(new Set(listings.map(l => l.cropType)))
  const uniqueLocations = Array.from(new Set(listings.map(l => {
    const parts = l.pickupLocation.split(',')
    return parts[parts.length - 1]?.trim() || l.pickupLocation
  })))
  const totalAvailable = filteredListings.reduce((sum, l) => sum + l.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Procurement</h1>
          <p className="text-gray-600 mt-1">Browse live farmer listings or create a procurement request</p>
        </div>
        <Link
          to="/buyer/create-procurement-request"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Live Listings</p>
              <p className="text-2xl font-bold text-gray-900">{filteredListings.length}</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Available</p>
              <p className="text-2xl font-bold text-gray-900">{totalAvailable.toFixed(0)} quintals</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crop Types</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueCrops.length}</p>
            </div>
            <Package className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by crop, variety, or location..."
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <select 
              className="input"
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
            >
              <option value="">All Crops</option>
              {uniqueCrops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
          <div>
            <select 
              className="input"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div>
            <select 
              className="input"
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
            >
              <option value="">All Quality Tiers</option>
              {QUALITY_TIERS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(selectedCrop || selectedLocation || selectedQuality || searchTerm) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-2 hover:text-blue-900">×</button>
              </span>
            )}
            {selectedCrop && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center">
                Crop: {selectedCrop}
                <button onClick={() => setSelectedCrop('')} className="ml-2 hover:text-green-900">×</button>
              </span>
            )}
            {selectedLocation && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center">
                Location: {selectedLocation}
                <button onClick={() => setSelectedLocation('')} className="ml-2 hover:text-purple-900">×</button>
              </span>
            )}
            {selectedQuality && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center">
                Quality: {selectedQuality}
                <button onClick={() => setSelectedQuality('')} className="ml-2 hover:text-orange-900">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCrop('')
                setSelectedLocation('')
                setSelectedQuality('')
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Available Produce */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading available produce...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Listings Available</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCrop || selectedQuality || selectedLocation
              ? 'Try adjusting your filters' 
              : 'No farmers have listed produce yet'}
          </p>
          <Link
            to="/buyer/create-procurement-request"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create Procurement Request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {listing.cropType} {listing.variety && `(${listing.variety})`}
                      </h3>
                      <p className="text-sm text-gray-600" title={formatDateTime(listing.createdAt)}>
                        Listed {getRelativeTime(listing.createdAt)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {listing.qualityGrade || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Quantity</p>
                      <p className="font-semibold text-gray-900">
                        {listing.quantity} {listing.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Price</p>
                      <p className="font-semibold text-green-600">
                        ₹{listing.minimumPrice}/{listing.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Location</p>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <p className="font-semibold text-gray-900 text-sm">{listing.pickupLocation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Available From</p>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="font-semibold text-gray-900 text-sm">
                          {new Date(listing.availableFrom).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {listing.description && (
                    <p className="text-sm text-gray-600 mb-2">{listing.description}</p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Total Value: ₹{(listing.quantity * listing.minimumPrice).toLocaleString()}</span>
                    <span>•</span>
                    <span className={`font-medium ${
                      listing.status === 'open' || listing.status === 'released' ? 'text-green-600' : 
                      listing.status === 'in_progress' ? 'text-blue-600' :
                      listing.status === 'negotiating' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {listing.status === 'open' || listing.status === 'released' ? 'Available Now' : 
                       listing.status === 'in_progress' ? 'In Progress' :
                       listing.status === 'negotiating' ? 'Negotiating' :
                       listing.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col space-y-2">
                  <Link
                    to={`/buyer/farmer-listing/${listing.id}`}
                    className="btn-primary whitespace-nowrap text-center"
                  >
                    View Details & Make Offer
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Procurement

