import { Package, MapPin, Calendar, Edit2, Trash2, TrendingUp, Save, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import { getRelativeTime, formatDateTime } from '../../utils/timeUtils'

const MyProcurementRequests = () => {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      console.log('Loading buyer procurement requests...')
      const response = await apiService.getMyProcurementRequests()
      console.log('My procurement requests response:', response)
      setRequests(response.requests || [])
    } catch (error) {
      console.error('Failed to load procurement requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (request: any) => {
    setEditingId(request.id)
    setEditForm({ ...request })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (id: string) => {
    try {
      // Use the buyer negotiation endpoint to update the procurement request
      await apiService.negotiateProcurement(id, editForm)
      await loadRequests()
      setEditingId(null)
      setEditForm({})
      alert('Procurement request updated successfully!')
    } catch (error) {
      console.error('Failed to update procurement request:', error)
      alert('Failed to update procurement request')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this procurement request? This action cannot be undone.')) {
      return
    }

    try {
      console.log('Deleting procurement request:', id);
      const response = await apiService.deleteProcurementRequest(id)
      console.log('Delete response:', response);
      await loadRequests()
      alert('Procurement request deleted successfully!')
    } catch (error: any) {
      console.error('Failed to delete procurement request:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to delete procurement request')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading your procurement requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Procurement Requests</h1>
          <p className="text-gray-600 mt-1">Manage your procurement requests and view quotes</p>
        </div>
        <Link
          to="/buyer/create-procurement-request"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Procurement Requests Yet</h3>
          <p className="text-gray-600 mb-6">Create your first procurement request to get quotes from farmers</p>
          <Link
            to="/buyer/create-procurement-request"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create Request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card hover:shadow-lg transition-shadow">
              {editingId === request.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                      <input
                        type="text"
                        value={editForm.cropType}
                        onChange={(e) => setEditForm({ ...editForm, cropType: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                      <input
                        type="text"
                        value={editForm.variety || ''}
                        onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
                      <select
                        value={editForm.qualityGrade}
                        onChange={(e) => setEditForm({ ...editForm, qualityGrade: e.target.value })}
                        className="input"
                      >
                        <option value="A">Grade A</option>
                        <option value="B">Grade B</option>
                        <option value="C">Grade C</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Price Per Unit</label>
                      <input
                        type="number"
                        value={editForm.maxPricePerUnit}
                        onChange={(e) => setEditForm({ ...editForm, maxPricePerUnit: parseFloat(e.target.value) })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
                      <input
                        type="text"
                        value={editForm.deliveryLocation}
                        onChange={(e) => setEditForm({ ...editForm, deliveryLocation: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="input"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSaveEdit(request.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {request.cropType} {request.variety && `(${request.variety})`}
                      </h3>
                      <p className="text-sm text-gray-600" title={formatDateTime(request.createdAt)}>
                        Created {getRelativeTime(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'open' ? 'bg-green-100 text-green-800' :
                        request.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {request.status}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        Grade {request.qualityGrade}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                      <p className="text-xs text-gray-600">Total Budget</p>
                      <p className="font-semibold text-gray-900">
                        ₹{(request.quantity * request.maxPricePerUnit).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Quotes Received</p>
                      <p className="font-semibold text-green-600">
                        {request.quotesCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{request.deliveryLocation}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        Required by {new Date(request.requiredBy).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mb-4">{request.description}</p>
                  )}

                  {request.currentBestQuote > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-green-900">
                          Best Quote: ₹{request.currentBestQuote}/{request.quantityUnit}
                        </p>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Link
                      to={`/buyer/procurement-request/${request.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      View Details & Quotes ({request.quotesCount || 0})
                    </Link>
                    <button 
                      onClick={() => handleEdit(request)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyProcurementRequests

