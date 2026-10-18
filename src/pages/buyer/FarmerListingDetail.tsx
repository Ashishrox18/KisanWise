import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Package, MessageSquare, Award, X, User } from 'lucide-react'
import { apiService } from '../../services/api'
import StatusWorkflow from '../../components/StatusWorkflow'

const FarmerListingDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<any>(null)
  const [myOffer, setMyOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerQuantity, setOfferQuantity] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [isCountering, setIsCountering] = useState(false)

  useEffect(() => {
    loadData()
    // Don't update status automatically - let it stay as is
    
    // Poll for updates every 10 seconds, but don't clear form if modal is open
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing offer data...');
      if (!showOfferModal) {
        loadData()
      } else {
        console.log('⏸️ Skipping auto-refresh - modal is open');
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [id, showOfferModal])

  const loadData = async (preserveFormValues = false) => {
    try {
      console.log('🔄 Loading listing data for ID:', id);
      
      let listingData = null;
      let offersData: any[] = [];

      try {
        const listingRes = await apiService.getFarmerListing(id!);
        listingData = listingRes.listing;
      } catch (err) {
        console.error('Failed to load listing:', err);
      }

      if (listingData) setListing(listingData);

      try {
        const offersRes = await apiService.getOffersForListing(id!);
        offersData = offersRes.offers || [];
      } catch (err) {
        console.error('Failed to load offers:', err);
      }
      
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('👤 Current user ID:', user.id);
        const existingOffer = offersData.find((o: any) => o.buyerId === user.id);
        console.log('💼 Existing offer found:', existingOffer);
        
        if (existingOffer) {
          console.log('✅ Setting myOffer with negotiation history:', existingOffer.negotiationHistory);
          setMyOffer(existingOffer);
          if (!preserveFormValues) {
            setOfferPrice(existingOffer.pricePerUnit.toString());
            setOfferQuantity(existingOffer.quantity.toString());
            setOfferMessage(existingOffer.message || '');
          }
        } else if (!preserveFormValues) {
          console.log('❌ No existing offer found, clearing state');
          setMyOffer(null);
          setOfferPrice('');
          setOfferQuantity('');
          setOfferMessage('');
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitOffer = async () => {
    if (!offerPrice || !offerQuantity) {
      alert('Please fill in all required fields')
      return
    }

    try {
      console.log('Submitting offer:', { 
        isCountering, 
        offerId: myOffer?.id,
        pricePerUnit: parseFloat(offerPrice),
        quantity: parseFloat(offerQuantity),
        message: offerMessage
      });

      if (isCountering && myOffer) {
        const response = await apiService.updateOffer(myOffer.id, {
          pricePerUnit: parseFloat(offerPrice),
          quantity: parseFloat(offerQuantity),
          message: offerMessage
        })
        console.log('Update offer response:', response);
      } else {
        const response = await apiService.submitOffer({
          listingId: id,
          farmerId: listing.farmerId,
          pricePerUnit: parseFloat(offerPrice),
          quantity: parseFloat(offerQuantity),
          quantityUnit: listing.quantityUnit,
          message: offerMessage
        })
        console.log('Submit offer response:', response);
      }
      
      setShowOfferModal(false)
      setIsCountering(false)
      
      alert(isCountering ? 'Offer updated successfully!' : 'Offer submitted successfully!')
      
      // Wait a moment for the backend to save, then reload
      setTimeout(async () => {
        console.log('Reloading data after offer submission...');
        await loadData()
      }, 1000)
    } catch (error: any) {
      console.error('Failed to submit offer:', error);
      alert(error.response?.data?.error || 'Failed to submit offer')
    }
  }

  const handleAwardListing = async () => {
    if (!myOffer) {
      alert('Please submit an offer first')
      return
    }

    if (!confirm('Are you sure you want to propose this purchase? The farmer will need to accept before the deal is finalized.')) {
      return
    }

    try {
      await apiService.proposeAward(myOffer.id)
      await loadData()
      alert('Purchase proposal sent to farmer! Waiting for their approval.')
    } catch (error) {
      console.error('Failed to propose award:', error)
      alert('Failed to send purchase proposal')
    }
  }

  const openOfferModal = (countering = false) => {
    setIsCountering(countering)
    // Always start with empty form - let user enter their own values
    if (!countering) {
      setOfferPrice('')
      setOfferQuantity('')
      setOfferMessage('')
    }
    setShowOfferModal(true)
  }

  const handleAward = () => {
    navigate(`/award/listing/${id}`)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Listing not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/buyer/procurement')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Browse Listings
        </button>
        
        {/* Award Button - Only show if buyer has an accepted offer */}
        {listing.status !== 'awarded' && myOffer?.status === 'accepted' && (
          <button
            onClick={handleAward}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Award className="h-4 w-4" />
            <span>Award Contract</span>
          </button>
        )}
      </div>

      {/* Listing Details */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {listing.cropType} {listing.variety && `(${listing.variety})`}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <User className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-600">
                Listed by Farmer • {new Date(listing.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            listing.status === 'open' ? 'bg-green-100 text-green-800' :
            listing.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
            listing.status === 'awarded' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {listing.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600">Available Quantity</p>
            <p className="font-semibold text-gray-900">{listing.quantity} {listing.quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Minimum Price</p>
            <p className="font-semibold text-green-600">₹{listing.minimumPrice}/{listing.quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Value</p>
            <p className="font-semibold text-gray-900">₹{(listing.quantity * listing.minimumPrice).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Quality Grade</p>
            <p className="font-semibold text-purple-600">Grade {listing.qualityGrade}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">Pickup from: {listing.pickupLocation}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              Available from {new Date(listing.availableFrom).toLocaleDateString()}
            </span>
          </div>
        </div>

        {listing.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">About this produce:</p>
            <p className="text-sm text-gray-700">{listing.description}</p>
          </div>
        )}
      </div>

      {/* Status Workflow */}
      <StatusWorkflow currentStatus={listing.status || 'open'} type="listing" />

      {/* My Offer Section */}
      {myOffer ? (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-900">Your Offer</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              myOffer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              myOffer.status === 'countered' ? 'bg-orange-100 text-orange-800' :
              myOffer.status === 'proposed_award' ? 'bg-purple-100 text-purple-800' :
              myOffer.status === 'farmer_accepted' ? 'bg-green-100 text-green-800' :
              myOffer.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {myOffer.status === 'proposed_award' ? 'AWAITING FARMER APPROVAL' : 
               myOffer.status === 'farmer_accepted' ? 'FARMER ACCEPTED - CONFIRM NOW' :
               myOffer.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-blue-700">Your Offer Price</p>
              <p className="font-semibold text-blue-900">₹{myOffer.pricePerUnit}/{listing.quantityUnit}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Quantity</p>
              <p className="font-semibold text-blue-900">{myOffer.quantity} {listing.quantityUnit}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Total Amount</p>
              <p className="font-semibold text-blue-900">₹{(myOffer.pricePerUnit * myOffer.quantity).toLocaleString()}</p>
            </div>
          </div>

          {myOffer.message && (
            <div className="mb-4 p-3 bg-white rounded">
              <p className="text-sm text-gray-700">{myOffer.message}</p>
            </div>
          )}

          {/* Counter Offers from Farmer */}
          {myOffer.negotiationHistory && myOffer.negotiationHistory.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 rounded border border-orange-200">
              <p className="text-sm font-medium text-orange-900 mb-2">
                🔔 Farmer Counter Offers ({myOffer.negotiationHistory.length}):
              </p>
              {myOffer.negotiationHistory.map((item: any, idx: number) => (
                <div key={idx} className="text-sm text-orange-700 mb-2 p-3 bg-white rounded border border-orange-300">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-orange-900">Counter Price: ₹{item.price}/{listing.quantityUnit}</p>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                      {item.by === 'farmer' ? 'From Farmer' : 'From You'}
                    </span>
                  </div>
                  {item.message && (
                    <p className="text-sm mt-2 p-2 bg-orange-50 rounded italic">
                      "{item.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
              <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-300">
                <p className="text-sm text-yellow-900">
                  💡 The farmer has countered your offer. You can update your offer to match their price or propose a different amount.
                </p>
              </div>
            </div>
          )}

          {myOffer.status !== 'accepted' && myOffer.status !== 'proposed_award' && listing.status !== 'awarded' && (
            <div className="flex space-x-3">
              <button
                onClick={() => openOfferModal(true)}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Update Offer
              </button>
              <button
                onClick={handleAwardListing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
              >
                <Award className="h-4 w-4 mr-2" />
                Propose Purchase
              </button>
            </div>
          )}

          {myOffer.status === 'proposed_award' && (
            <div className="p-4 bg-purple-100 rounded border border-purple-300">
              <p className="text-sm font-medium text-purple-900">⏳ Purchase proposal sent to farmer</p>
              <p className="text-xs text-purple-700 mt-1">Waiting for the farmer to review and accept your purchase proposal.</p>
            </div>
          )}

          {myOffer.status === 'farmer_accepted' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded border-2 border-green-300">
                <p className="text-lg font-bold text-green-900 mb-2">🎉 Farmer Accepted Your Offer!</p>
                <p className="text-sm text-green-700 mb-3">
                  The farmer has agreed to sell at ₹{myOffer.pricePerUnit}/{listing.quantityUnit}. 
                  Please confirm to finalize this deal.
                </p>
                <div className="bg-white p-3 rounded border border-green-200 mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Price per unit:</span>
                    <span className="font-bold text-gray-900">₹{myOffer.pricePerUnit}/{listing.quantityUnit}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-bold text-gray-900">{myOffer.quantity} {listing.quantityUnit}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                    <span className="text-gray-700 font-medium">Total Amount:</span>
                    <span className="font-bold text-green-600 text-lg">₹{(myOffer.pricePerUnit * myOffer.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to confirm this purchase? This will finalize the deal.')) {
                    return;
                  }
                  try {
                    await apiService.confirmAcceptedOffer(myOffer.id);
                    await loadData();
                    alert('Purchase confirmed! The deal is now finalized.');
                  } catch (error) {
                    console.error('Failed to confirm purchase:', error);
                    alert('Failed to confirm purchase');
                  }
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center text-lg font-semibold"
              >
                <Award className="h-5 w-5 mr-2" />
                Confirm Purchase & Finalize Deal
              </button>
            </div>
          )}

          {myOffer.status === 'accepted' && (
            <div className="p-4 bg-green-100 rounded border border-green-300">
              <p className="text-sm font-medium text-green-900">🎉 Your offer has been accepted!</p>
              <p className="text-xs text-green-700 mt-1">The farmer will contact you soon for delivery arrangements.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Make an Offer</h3>
          <p className="text-gray-600 mb-6">
            Interested in this produce? Submit your offer to the farmer.
          </p>
          <button
            onClick={() => openOfferModal(false)}
            disabled={listing.status === 'awarded'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Submit Offer
          </button>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCountering ? 'Update Your Offer' : 'Submit Offer'}
              </h3>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Offer Price (₹/{listing.quantityUnit}) *
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="input"
                  placeholder="Enter your offer price per unit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({listing.quantityUnit}) *
                </label>
                <input
                  type="number"
                  value={offerQuantity}
                  onChange={(e) => setOfferQuantity(e.target.value)}
                  className="input"
                  placeholder="Enter quantity you want to purchase"
                />
                <p className="text-xs text-gray-500 mt-1">Available: {listing.quantity} {listing.quantityUnit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Add any additional information or requirements..."
                />
              </div>

              {offerPrice && offerQuantity && (
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm font-medium text-blue-900">
                    Total Offer Amount: ₹{(parseFloat(offerPrice) * parseFloat(offerQuantity)).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleSubmitOffer}
                  disabled={!offerPrice || !offerQuantity}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isCountering ? 'Update Offer' : 'Submit Offer'}
                </button>
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default FarmerListingDetail

