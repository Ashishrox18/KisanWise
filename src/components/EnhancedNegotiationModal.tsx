import { useState } from 'react'
import { X, MessageSquare, TrendingUp, Calculator, Send, CheckCircle, XCircle } from 'lucide-react'
import NegotiationHistory from './NegotiationHistory'

interface EnhancedNegotiationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    action: 'counter' | 'accept' | 'reject'
    pricePerUnit?: number
    quantity?: number
    message?: string
  }) => Promise<void>
  data: any
  type: 'listing' | 'procurement'
  userRole: 'buyer' | 'farmer'
  negotiationHistory?: any[]
}

const EnhancedNegotiationModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  data, 
  type, 
  userRole,
  negotiationHistory = []
}: EnhancedNegotiationModalProps) => {
  const [action, setAction] = useState<'counter' | 'accept' | 'reject'>('counter')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState(data?.quantity?.toString() || '')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const currentPrice = type === 'listing' ? data?.minimumPrice : data?.maxPricePerUnit
  const lastNegotiation = negotiationHistory[negotiationHistory.length - 1]
  const lastPrice = lastNegotiation?.price || currentPrice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData: any = { action, message }
      
      if (action === 'counter') {
        if (!price) {
          alert('Please enter a price')
          return
        }
        submitData.pricePerUnit = parseFloat(price)
        submitData.quantity = parseFloat(quantity)
      }

      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Negotiation failed:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    const priceValue = parseFloat(price) || 0
    const quantityValue = parseFloat(quantity) || 0
    return priceValue * quantityValue
  }

  const getPriceChange = () => {
    if (!price || !lastPrice) return null
    const change = parseFloat(price) - lastPrice
    if (change === 0) return null
    
    return (
      <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        ({change > 0 ? '+' : ''}₹{change}/{data?.quantityUnit})
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Negotiate: {data?.cropType} {data?.variety && `(${data.variety})`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Negotiation Form */}
            <div className="space-y-6">
              {/* Current Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Current Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Current Price</p>
                    <p className="font-semibold">₹{lastPrice?.toLocaleString()}/{data?.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-semibold">{data?.quantity} {data?.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Quality Grade</p>
                    <p className="font-semibold">Grade {data?.qualityGrade}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Value</p>
                    <p className="font-semibold">₹{((lastPrice || 0) * (data?.quantity || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Action Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Choose Action</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAction('counter')}
                    className={`p-3 rounded-lg border text-center transition ${
                      action === 'counter'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MessageSquare className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Counter Offer</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAction('accept')}
                    className={`p-3 rounded-lg border text-center transition ${
                      action === 'accept'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Accept</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAction('reject')}
                    className={`p-3 rounded-lg border text-center transition ${
                      action === 'reject'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <XCircle className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Reject</span>
                  </button>
                </div>
              </div>

              {/* Counter Offer Form */}
              {action === 'counter' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per {data?.quantityUnit}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="input pl-8"
                          placeholder={lastPrice?.toString()}
                          required
                        />
                      </div>
                      {getPriceChange()}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity ({data?.quantityUnit})
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="input"
                        placeholder={data?.quantity?.toString()}
                      />
                    </div>
                  </div>

                  {/* Total Calculation */}
                  {price && quantity && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calculator className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Total Value</span>
                        </div>
                        <span className="text-xl font-bold text-blue-900">
                          ₹{calculateTotal().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="input"
                      placeholder="Add a message to explain your counter offer..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !price}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? 'Submitting...' : 'Submit Counter Offer'}
                  </button>
                </form>
              )}

              {/* Accept/Reject Form */}
              {(action === 'accept' || action === 'reject') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    action === 'accept' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      action === 'accept' ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {action === 'accept' 
                        ? `You are about to accept the offer of ₹${lastPrice?.toLocaleString()}/${data?.quantityUnit}`
                        : 'You are about to reject this negotiation'
                      }
                    </p>
                    {action === 'accept' && (
                      <p className="text-sm text-green-700 mt-1">
                        Total value: ₹{((lastPrice || 0) * (data?.quantity || 0)).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="input"
                      placeholder={action === 'accept' 
                        ? "Add a message about accepting this offer..."
                        : "Add a message about why you're rejecting..."
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex items-center justify-center ${
                      action === 'accept'
                        ? 'btn-primary bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition'
                    }`}
                  >
                    {action === 'accept' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {loading ? 'Processing...' : (action === 'accept' ? 'Accept Offer' : 'Reject Offer')}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column - Negotiation History */}
            <div>
              <NegotiationHistory 
                history={negotiationHistory}
                currentUser={JSON.parse(sessionStorage.getItem('user') || '{}')}
                quantityUnit={data?.quantityUnit || 'unit'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedNegotiationModal
