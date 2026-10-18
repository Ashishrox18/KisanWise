import { Search, MapPin, Package, Calendar, TrendingUp, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import { gradeToTier, QUALITY_TIERS } from '../../utils/cropQualityGrades'

const BrowseProcurementRequests = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCrop, setSelectedCrop] = useState('')
  const [selectedQuality, setSelectedQuality] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const response = await apiService.getBuyerProcurementRequests()
      setRequests(response.requests || [])
    } catch (error) {
      console.error('Failed to load procurement requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.cropType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCrop = !selectedCrop || request.cropType === selectedCrop
    const matchesQuality = !selectedQuality || gradeToTier(request.qualityGrade, request.cropType) === selectedQuality
    const matchesLocation = !selectedLocation || 
      request.deliveryLocation.toLowerCase().includes(selectedLocation.toLowerCase())
    
    // Include all active statuses: open, released, in_progress, negotiating
    const isActive = ['open', 'released', 'in_progress', 'negotiating'].includes(request.status)
    
    return matchesSearch && matchesCrop && matchesQuality && matchesLocation && isActive
  })

  const uniqueCrops = Array.from(new Set(requests.map(r => r.cropType)))
  const uniqueLocations = Array.from(new Set(requests.map(r => {
    const parts = r.deliveryLocation.split(',')
    return parts[parts.length - 1]?.trim() || r.deliveryLocation
  })))
  const totalDemand = filteredRequests.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Procurement Requests</h1>
        <p className="text-gray-600 mt-1">View buyer requirements and submit your quotes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Requests</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Demand</p>
              <p className="text-2xl font-bold text-gray-900">{totalDemand.toFixed(0)} quintals</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crop Types</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueCrops.length}</p>
            </div>
            <Filter className="h-8 w-8 text-purple-600" />
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
        
        {/* Active Filters */}
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

      {/* Procurement Requests */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading procurement requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Procurement Requests Available</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCrop || selectedQuality || selectedLocation
              ? 'Try adjusting your filters' 
              : 'No buyers have posted procurement requests yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {request.cropType} {request.variety && `(${request.variety})`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Posted {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {request.qualityGrade || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Quantity Needed</p>
                      <p className="font-semibold text-gray-900">
                        {request.quantity} {request.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Max Price</p>
                      <p className="font-semibold text-blue-600">
                        ₹{request.maxPricePerUnit}/{request.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Delivery Location</p>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <p className="font-semibold text-gray-900 text-sm">{request.deliveryLocation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Required By</p>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="font-semibold text-gray-900 text-sm">
                          {new Date(request.requiredBy).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Total Budget: ₹{(request.quantity * request.maxPricePerUnit).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-green-600 font-medium">{request.quotesCount || 0} quotes received</span>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col space-y-2">
                  <Link
                    to={`/farmer/procurement-request/${request.id}`}
                    className="btn-primary whitespace-nowrap text-center"
                  >
                    View Details & Submit Quote
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

export default BrowseProcurementRequests

