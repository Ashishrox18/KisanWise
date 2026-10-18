import { Package, MapPin, Calendar, Edit2, Trash2, Save, X, Eye, CheckCircle, TrendingUp, DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../../services/api'
import { getRelativeTime, formatDateTime } from '../../utils/timeUtils'

const MyListings = () => {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [filter, setFilter] = useState<'active' | 'finalized' | 'cancelled'>('active')

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      const response = await apiService.getMyPurchaseRequests()
      console.log('Farmer listings response:', response)
      setListings(response.requests || [])
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (listing: any) => {
    setEditingId(listing.id)
    setEditForm({ ...listing })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await apiService.updatePurchaseRequest(id, editForm)
      await loadListings()
      setEditingId(null)
      setEditForm({})
    } catch (error) {
      console.error('Failed to update listing:', error)
      alert('Failed to update listing')
    }
  }

  const handleDelete = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    const isFinalized = listing && (listing.status === 'accepted' || listing.status === 'completed' || listing.status === 'awarded');
    
    console.log('Delete request for listing:', { id, listing, isFinalized, hasOfferId: !!listing?.offerId });
    
    const confirmMessage = isFinalized
      ? 'Are you sure you want to cancel this finalized sale? This action cannot be undone and may affect your relationship with the buyer.'
      : 'Are you sure you want to delete this listing?';
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // For finalized sales, we need to delete the offer, not the listing
      // The listing object has an offerId field for finalized sales
      if (isFinalized && listing?.offerId) {
        console.log('Deleting finalized sale (offer):', listing.offerId);
        await apiService.deleteOffer(listing.offerId);
      } else if (isFinalized && !listing?.offerId) {
        // Fallback: If finalized but no offerId, it means the listing was deleted
        // We can't delete it, so just show a message
        console.error('Cannot delete finalized sale: offer ID not found');
        alert('This sale has already been finalized and cannot be cancelled from here. Please contact support if needed.');
        return;
      } else {
        console.log('Deleting active listing:', id);
        await apiService.deletePurchaseRequest(id);
      }
      await loadListings()
      alert(isFinalized ? 'Sale cancelled successfully' : 'Listing deleted successfully')
    } catch (error) {
      console.error('Failed to delete listing:', error)
      alert(isFinalized ? 'Failed to cancel sale' : 'Failed to delete listing')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading your listings...</p>
      </div>
    )
  }

  // Filter listings based on status
  const filteredListings = listings.filter(listing => {
    if (filter === 'active') return listing.status === 'open' || listing.status === 'negotiating' || listing.status === 'in_progress';
    if (filter === 'finalized') return listing.status === 'accepted' || listing.status === 'completed' || listing.status === 'awarded';
    if (filter === 'cancelled') return listing.status === 'cancelled';
    return true;
  });

  // Calculate stats
  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'open' || l.status === 'negotiating' || l.status === 'in_progress').length,
    finalized: listings.filter(l => l.status === 'accepted' || l.status === 'completed' || l.status === 'awarded').length,
    cancelled: listings.filter(l => l.status === 'cancelled').length,
    totalRevenue: listings
      .filter(l => l.status === 'accepted' || l.status === 'completed' || l.status === 'awarded')
      .reduce((sum, l) => sum + ((l.finalPrice || l.currentBestOffer || l.minimumPrice) * l.quantity), 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Sales</h1>
          <p className="text-gray-600 mt-1">Manage your produce listings and view sales history</p>
        </div>
        <Link to="/farmer/harvest?tab=list-produce" className="btn-primary">
          List New Produce
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Listings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Finalized Sales</p>
              <p className="text-2xl font-bold text-green-600">{stats.finalized}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{(stats.totalRevenue / 100000).toFixed(1)}L</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            filter === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({stats.active})
        </button>
        <button
          onClick={() => setFilter('finalized')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            filter === 'finalized'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Finalized ({stats.finalized})
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            filter === 'cancelled'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Cancelled ({stats.cancelled})
        </button>
      </div>

      {filteredListings.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {filter} listings
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have any {filter} listings at the moment
          </p>
          {filter === 'active' && (
            <Link to="/farmer/harvest?tab=list-produce" className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              List Produce
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => {
            const isFinalized = listing.status === 'accepted' || listing.status === 'completed' || listing.status === 'awarded';
            const finalPrice = listing.finalPrice || listing.currentBestOffer || listing.minimumPrice;
            
            return (
              <div key={listing.id} className="card">
                {editingId === listing.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label><input type="text" value={editForm.cropType} onChange={(e) => setEditForm({ ...editForm, cropType: e.target.value })} className="input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Variety</label><input type="text" value={editForm.variety || ''} onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })} className="input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })} className="input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label><select value={editForm.qualityGrade} onChange={(e) => setEditForm({ ...editForm, qualityGrade: e.target.value })} className="input"><option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimum Price</label><input type="number" value={editForm.minimumPrice} onChange={(e) => setEditForm({ ...editForm, minimumPrice: parseFloat(e.target.value) })} className="input" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label><input type="text" value={editForm.pickupLocation} onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })} className="input" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="input" /></div>
                  <div className="flex space-x-3">
                    <button onClick={() => handleSaveEdit(listing.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"><Save className="h-4 w-4 mr-2" />Save</button>
                    <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"><X className="h-4 w-4 mr-2" />Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{listing.cropType} {listing.variety && `(${listing.variety})`}</h3>
                      <p className="text-sm text-gray-600" title={formatDateTime(listing.createdAt)}>Listed {getRelativeTime(listing.createdAt)}</p>
                      {isFinalized && listing.awardedAt && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          ✓ Sold on {new Date(listing.awardedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        listing.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        listing.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
                        listing.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        isFinalized ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status === 'awarded' ? 'Sold' : 
                         listing.status === 'cancelled' ? 'Cancelled' : 
                         listing.status}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Grade {listing.qualityGrade}</span>
                    </div>
                  </div>

                  {/* Cancelled Sale Highlight */}
                  {listing.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <X className="h-6 w-6 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-900">Sale Cancelled</p>
                            <p className="text-sm text-red-700">
                              Cancelled by: {listing.cancelledBy === 'farmer' ? 'You' : listing.awardedBuyerName || 'Buyer'}
                            </p>
                            {listing.cancelledAt && (
                              <p className="text-xs text-red-600 mt-1">
                                on {new Date(listing.cancelledAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-700">Was Priced At</p>
                          <p className="text-2xl font-bold text-red-600">₹{finalPrice}/{listing.quantityUnit}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Finalized Sale Highlight */}
                  {isFinalized && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900">Sale Finalized</p>
                            <p className="text-sm text-green-700">
                              Buyer: {listing.awardedBuyerName || listing.buyerName || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-700">Final Price</p>
                          <p className="text-2xl font-bold text-green-600">₹{finalPrice}/{listing.quantityUnit}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Total Revenue:</span>
                          <span className="font-bold text-green-900">₹{(finalPrice * listing.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p className="text-xs text-gray-600">Quantity</p><p className="font-semibold text-gray-900">{listing.quantity} {listing.quantityUnit}</p></div>
                    <div>
                      <p className="text-xs text-gray-600">{isFinalized ? 'Final Price' : 'Minimum Price'}</p>
                      <p className={`font-semibold ${isFinalized ? 'text-green-600' : 'text-gray-900'}`}>
                        ₹{finalPrice}/{listing.quantityUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Value</p>
                      <p className={`font-semibold ${isFinalized ? 'text-green-600' : 'text-gray-900'}`}>
                        ₹{(listing.quantity * finalPrice).toLocaleString()}
                      </p>
                    </div>
                    <div><p className="text-xs text-gray-600">Quotes</p><p className="font-semibold text-blue-600">{listing.quotesCount || 0}</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-700">{listing.pickupLocation}</span></div>
                    <div className="flex items-center space-x-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-700">Available from {new Date(listing.availableFrom).toLocaleDateString()}</span></div>
                  </div>
                  {listing.description && <p className="text-sm text-gray-600 mb-4">{listing.description}</p>}
                  {!isFinalized && listing.currentBestOffer > 0 && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"><p className="text-sm font-medium text-blue-900">Best Offer: ₹{listing.currentBestOffer}/{listing.quantityUnit}</p></div>}
                  <div className="flex space-x-3">
                    <Link to={`/farmer/listing/${listing.id}`} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"><Eye className="h-4 w-4 mr-2" />View Details</Link>
                    {listing.status === 'cancelled' ? (
                      // Cancelled items: only show View Details (no edit/delete)
                      null
                    ) : isFinalized ? (
                      // Finalized items: show Cancel Sale button
                      <button 
                        onClick={() => handleDelete(listing.id)} 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Sale
                      </button>
                    ) : (
                      // Active items: show Edit and Delete buttons
                      <>
                        <button onClick={() => handleEdit(listing)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"><Edit2 className="h-4 w-4 mr-2" />Edit</button>
                        <button onClick={() => handleDelete(listing.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

export default MyListings

