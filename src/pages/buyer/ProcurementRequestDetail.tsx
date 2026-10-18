import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Package, TrendingUp, MessageSquare, Award, X } from 'lucide-react'
import { apiService } from '../../services/api'
import StatusWorkflow from '../../components/StatusWorkflow'

const ProcurementRequestDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMessage, setCounterMessage] = useState('')

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
      const [requestRes, quotesRes] = await Promise.all([
        apiService.getProcurementRequestDetail(id!),
        apiService.getQuotesForRequest(id!)
      ])
      setRequest(requestRes.request)
      setQuotes(quotesRes.quotes || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCounterOffer = async () => {
    if (!selectedQuote || !counterPrice) return

    try {
      await apiService.counterOffer(selectedQuote.id, {
        pricePerUnit: parseFloat(counterPrice),
        message: counterMessage
      })
      setShowCounterModal(false)
      setSelectedQuote(null)
      setCounterPrice('')
      setCounterMessage('')
      await loadData()
    } catch (error) {
      console.error('Failed to submit counter offer:', error)
      alert('Failed to submit counter offer')
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to accept this quote? This will finalize the deal and generate an invoice.')) {
      return
    }

    try {
      await apiService.acceptQuote(quoteId)
      await loadData()
      alert('Quote accepted! Deal finalized and invoice generated.')
    } catch (error) {
      console.error('Failed to accept quote:', error)
      alert('Failed to accept quote')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          onClick={() => navigate('/buyer/my-procurement-requests')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to My Requests
        </button>
      </div>

      {/* Request Details */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {request.cropType} {request.variety && `(${request.variety})`}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Request ID: {request.id}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            request.status === 'awarded' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {request.status === 'awarded' ? 'DEAL FINALIZED' : 'OPEN FOR QUOTES'}
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
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{request.description}</p>
          </div>
        )}
      </div>

      {/* Status Workflow */}
      <StatusWorkflow currentStatus={request.status} type="procurement" />

      {/* Quotes Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Received Quotes ({quotes.length})
          </h2>
          <TrendingUp className="h-6 w-6 text-green-600" />
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No quotes received yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Farmer: {quote.farmerName}</h3>
                    <p className="text-sm text-gray-600">Submitted {new Date(quote.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    quote.status === 'countered' ? 'bg-orange-100 text-orange-800' :
                    quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {quote.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Quoted Price</p>
                    <p className="font-semibold text-green-600">₹{quote.pricePerUnit}/{request.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-semibold text-gray-900">{quote.quantity} {request.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Amount</p>
                    <p className="font-semibold text-gray-900">₹{(quote.pricePerUnit * quote.quantity).toLocaleString()}</p>
                  </div>
                </div>

                {quote.message && (
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{quote.message}</p>
                  </div>
                )}

                {/* Negotiation History */}
                {quote.negotiationHistory && quote.negotiationHistory.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-2">Negotiation History:</p>
                    {quote.negotiationHistory.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs text-blue-700 mb-1">
                        • {item.type === 'counter' ? 'Counter Offer' : 'Response'}: ₹{item.price} - {item.message}
                      </div>
                    ))}
                  </div>
                )}

                {quote.status !== 'accepted' && request.status !== 'awarded' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedQuote(quote)
                        setCounterPrice(quote.pricePerUnit.toString())
                        setShowCounterModal(true)
                      }}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Counter Offer
                    </button>
                    <button
                      onClick={() => handleAcceptQuote(quote.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Accept Quote
                    </button>
                  </div>
                )}

                {quote.status === 'accepted' && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm font-medium text-green-900">✓ This quote has been accepted - Deal finalized!</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Counter Offer</h3>
              <button
                onClick={() => {
                  setShowCounterModal(false)
                  setSelectedQuote(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Quote: ₹{selectedQuote.pricePerUnit}/{request.quantityUnit}</p>
                <p className="text-sm text-gray-600 mb-2">Your Max Budget: ₹{request.maxPricePerUnit}/{request.quantityUnit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Counter Price (₹/{request.quantityUnit})
                </label>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="input"
                  placeholder="Enter your counter price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Add a message to explain your counter offer..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCounterOffer}
                  disabled={!counterPrice}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  Submit Counter Offer
                </button>
                <button
                  onClick={() => {
                    setShowCounterModal(false)
                    setSelectedQuote(null)
                  }}
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

