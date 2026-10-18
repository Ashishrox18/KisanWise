import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Package, MessageSquare, Award, X, User } from 'lucide-react'
import { apiService } from '../../services/api'
import StatusWorkflow from '../../components/StatusWorkflow'

const ProcurementRequestDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<any>(null)
  const [myQuote, setMyQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteQuantity, setQuoteQuantity] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [isCountering, setIsCountering] = useState(false)

  useEffect(() => {
    loadData()
    updateStatusToInProgress()
  }, [id])

  const updateStatusToInProgress = async () => {
    try {
      await apiService.updateProcurementStatus(id!, 'in_progress')
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const loadData = async () => {
    try {
      const requestRes = await apiService.getPurchaseRequest(id!)
      setRequest(requestRes.request)
      
      // Check if farmer has already submitted a quote
      const quotesRes = await apiService.getQuotesForRequest(id!)
      const userStr = sessionStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        const existingQuote = quotesRes.quotes?.find((q: any) => q.farmerId === user.id)
        if (existingQuote) {
          setMyQuote(existingQuote)
          setQuotePrice(existingQuote.pricePerUnit.toString())
          setQuoteQuantity(existingQuote.quantity.toString())
          setQuoteMessage(existingQuote.message || '')
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitQuote = async () => {
    if (!quotePrice || !quoteQuantity) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (isCountering && myQuote) {
        await apiService.updateQuote(myQuote.id, {
          pricePerUnit: parseFloat(quotePrice),
          quantity: parseFloat(quoteQuantity),
          message: quoteMessage
        })
      } else {
        await apiService.submitQuote({
          requestId: id,
          pricePerUnit: parseFloat(quotePrice),
          quantity: parseFloat(quoteQuantity),
          quantityUnit: request.quantityUnit,
          message: quoteMessage
        })
      }
      
      setShowQuoteModal(false)
      setIsCountering(false)
      await loadData()
      alert(isCountering ? 'Quote updated successfully!' : 'Quote submitted successfully!')
    } catch (error) {
      console.error('Failed to submit quote:', error)
      alert('Failed to submit quote')
    }
  }

  const openQuoteModal = (countering = false) => {
    setIsCountering(countering)
    if (!countering) {
      setQuotePrice('')
      setQuoteQuantity(request?.quantity?.toString() || '')
      setQuoteMessage('')
    }
    setShowQuoteModal(true)
  }

  const handleAcceptCounterOffer = async (counterPrice: number) => {
    if (!confirm(`Are you sure you want to accept the buyer's counter offer of ₹${counterPrice}/${request.quantityUnit}? This will finalize the deal.`)) {
      return
    }

    try {
      await apiService.acceptCounterOffer(myQuote.id, counterPrice)
      await loadData()
      alert('Counter offer accepted successfully! The buyer will be notified.')
    } catch (error) {
      console.error('Failed to accept counter offer:', error)
      alert('Failed to accept counter offer')
    }
  }

  const handleNegotiate = async (updates: any) => {
    try {
      // Farmer should submit/update their quote, not negotiate the request directly
      if (myQuote) {
        // Update existing quote
        await apiService.updateQuote(myQuote.id, {
          pricePerUnit: updates.maxPricePerUnit || updates.minimumPrice,
          quantity: updates.quantity,
          message: updates.negotiationNotes || 'Updated quote terms'
        })
        alert('Quote updated successfully!')
      } else {
        // Submit new quote
        await apiService.submitQuote({
          requestId: id!,
          pricePerUnit: updates.maxPricePerUnit || updates.minimumPrice,
          quantity: updates.quantity,
          quantityUnit: request?.quantityUnit || 'kg',
          message: updates.negotiationNotes || 'Interested in your procurement request'
        })
        alert('Quote submitted successfully!')
      }
      await loadData()
    } catch (error) {
      console.error('Negotiation failed:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Procurement request not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/farmer/browse-procurement-requests')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Browse Requests
        </button>

        {/* Farmers should use "Submit Quote" button instead of Negotiate */}
      </div>

      {/* Request Details */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {request.cropType} {request.variety && `(${request.variety})`}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <User className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-600">
                Posted by Buyer • {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            request.status === 'released' ? 'bg-green-100 text-green-800' :
            request.status === 'open' ? 'bg-green-100 text-green-800' :
            request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            request.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
            request.status === 'awarded' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {request.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600">Quantity Needed</p>
            <p className="font-semibold text-gray-900">{request.quantity} {request.quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Max Price</p>
            <p className="font-semibold text-blue-600">₹{request.maxPricePerUnit}/{request.quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Budget</p>
            <p className="font-semibold text-gray-900">₹{(request.quantity * request.maxPricePerUnit).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Quality Grade</p>
            <p className="font-semibold text-purple-600">Grade {request.qualityGrade}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">Delivery to: {request.deliveryLocation}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              Required by {new Date(request.requiredBy).toLocaleDateString()}
            </span>
          </div>
        </div>

        {request.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Buyer's Requirements:</p>
            <p className="text-sm text-gray-700">{request.description}</p>
          </div>
        )}
      </div>

      {/* Status Workflow */}
      <StatusWorkflow currentStatus={request.status} type="procurement" />

      {/* My Quote Section */}
      {myQuote ? (
        <div className="card bg-green-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-green-900">Your Quote</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              myQuote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              myQuote.status === 'countered' ? 'bg-orange-100 text-orange-800' :
              myQuote.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {myQuote.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-green-700">Your Price</p>
              <p className="font-semibold text-green-900">₹{myQuote.pricePerUnit}/{request.quantityUnit}</p>
            </div>
            <div>
              <p className="text-xs text-green-700">Quantity</p>
              <p className="font-semibold text-green-900">{myQuote.quantity} {request.quantityUnit}</p>
            </div>
            <div>
              <p className="text-xs text-green-700">Total Amount</p>
              <p className="font-semibold text-green-900">₹{(myQuote.pricePerUnit * myQuote.quantity).toLocaleString()}</p>
            </div>
          </div>

          {myQuote.message && (
            <div className="mb-4 p-3 bg-white rounded">
              <p className="text-sm text-gray-700">{myQuote.message}</p>
            </div>
          )}

          {/* Counter Offers from Buyer */}
          {myQuote.negotiationHistory && myQuote.negotiationHistory.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 rounded border border-orange-200">
              <p className="text-sm font-medium text-orange-900 mb-2">Buyer Counter Offers:</p>
              {myQuote.negotiationHistory.map((item: any, idx: number) => (
                <div key={idx} className="text-sm text-orange-700 mb-2 p-2 bg-white rounded">
                  <p className="font-medium">Counter Price: ₹{item.price}/{request.quantityUnit}</p>
                  {item.message && <p className="text-xs mt-1">{item.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                  
                  {/* Accept Counter Offer Button - only show for latest counter offer if not accepted */}
                  {idx === myQuote.negotiationHistory.length - 1 && myQuote.status !== 'accepted' && request.status !== 'awarded' && (
                    <button
                      onClick={() => handleAcceptCounterOffer(item.price)}
                      className="mt-2 w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Accept This Counter Offer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {myQuote.status !== 'accepted' && request.status !== 'awarded' && (
            <button
              onClick={() => openQuoteModal(true)}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Update Quote
            </button>
          )}

          {myQuote.status === 'accepted' && (
            <div className="p-4 bg-green-100 rounded border border-green-300">
              <p className="text-sm font-medium text-green-900">🎉 Congratulations! Your quote has been awarded!</p>
              <p className="text-xs text-green-700 mt-1">The buyer will contact you soon for next steps.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit Your Quote</h3>
          <p className="text-gray-600 mb-6">
            Interested in this procurement request? Submit your best quote to the buyer.
          </p>
          <button
            onClick={() => openQuoteModal(false)}
            disabled={request.status === 'awarded'}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Submit Quote
          </button>
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCountering ? 'Update Your Quote' : 'Submit Quote'}
              </h3>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-900">Buyer's Max Price: ₹{request.maxPricePerUnit}/{request.quantityUnit}</p>
                <p className="text-xs text-blue-700 mt-1">Submit a competitive quote to increase your chances</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Price (₹/{request.quantityUnit}) *
                </label>
                <input
                  type="number"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  className="input"
                  placeholder="Enter your price per unit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({request.quantityUnit}) *
                </label>
                <input
                  type="number"
                  value={quoteQuantity}
                  onChange={(e) => setQuoteQuantity(e.target.value)}
                  className="input"
                  placeholder="Enter quantity you can supply"
                />
                <p className="text-xs text-gray-500 mt-1">Buyer needs: {request.quantity} {request.quantityUnit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Add any additional information about your produce quality, delivery terms, etc."
                />
              </div>

              {quotePrice && quoteQuantity && (
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm font-medium text-green-900">
                    Total Quote Amount: ₹{(parseFloat(quotePrice) * parseFloat(quoteQuantity)).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleSubmitQuote}
                  disabled={!quotePrice || !quoteQuantity}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isCountering ? 'Update Quote' : 'Submit Quote'}
                </button>
                <button
                  onClick={() => setShowQuoteModal(false)}
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

export default ProcurementRequestDetail

