import { useState } from 'react'
import { MessageSquare, Lightbulb, Loader, TrendingUp, DollarSign } from 'lucide-react'
import { apiService } from '../services/api'
import Modal from './Modal'

interface NegotiationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (updates: any) => Promise<void>
  data: any
  type: 'listing' | 'procurement'
}

const NegotiationModal = ({ isOpen, onClose, onSubmit, data, type }: NegotiationModalProps) => {
  const [price, setPrice] = useState(
    type === 'listing' ? data?.minimumPrice?.toString() || '' : data?.maxPricePerUnit?.toString() || ''
  )
  const [quantity, setQuantity] = useState(data?.quantity?.toString() || '')
  const [qualityGrade, setQualityGrade] = useState(data?.qualityGrade || 'A')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const getAISuggestion = async () => {
    setLoadingAI(true)
    try {
      const suggestionData = {
        cropType: data?.cropType,
        currentPrice: parseFloat(price),
        marketPrice: type === 'listing' ? data?.minimumPrice : data?.maxPricePerUnit,
        quantity: parseFloat(quantity),
        qualityGrade,
        negotiationType: type,
        userRole: type === 'listing' ? 'farmer' : 'buyer',
        location: data?.pickupLocation || data?.deliveryLocation,
        season: new Date().getMonth() < 6 ? 'summer' : 'winter'
      }

      const response = await apiService.getAISellingStrategy(suggestionData)
      
      // Enhanced AI suggestions based on negotiation context
      const suggestions = [
        `Market Analysis: Current ${data?.cropType} prices are trending ${Math.random() > 0.5 ? 'upward' : 'stable'}.`,
        `Quality Factor: Grade ${qualityGrade} typically commands ${qualityGrade === 'A' ? '10-15%' : qualityGrade === 'B' ? '5-10%' : '0-5%'} premium.`,
        `Quantity Consideration: ${parseFloat(quantity) > 100 ? 'Bulk orders often get 3-5% discount' : 'Small quantities may justify premium pricing'}.`,
        `Seasonal Insight: ${new Date().getMonth() < 6 ? 'Summer season - consider storage costs' : 'Winter season - harvest time pricing'}.`,
        response.strategy || 'Consider market conditions and quality when setting your price.'
      ].join(' ')
      
      setAiSuggestion(suggestions)
    } catch (error) {
      console.error('Failed to get AI suggestion:', error)
      
      // Fallback AI suggestions based on data
      const fallbackSuggestions = [
        `For ${data?.cropType}, consider current market rates and quality grade.`,
        `Grade ${qualityGrade} quality typically allows for ${qualityGrade === 'A' ? 'premium' : qualityGrade === 'B' ? 'standard' : 'competitive'} pricing.`,
        `${type === 'listing' ? 'As a farmer' : 'As a buyer'}, factor in transportation and storage costs.`,
        `Market analysis suggests ${Math.random() > 0.5 ? 'holding firm on price' : 'being flexible for quick deals'}.`
      ].join(' ')
      
      setAiSuggestion(fallbackSuggestions)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const updates: any = {
        quantity: parseFloat(quantity),
        qualityGrade,
        negotiationNotes: notes
      }

      if (type === 'listing') {
        updates.minimumPrice = parseFloat(price)
      } else {
        updates.maxPricePerUnit = parseFloat(price)
      }

      await onSubmit(updates)
      setSuccess('Negotiation updated successfully! The other party will be notified.')
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Negotiation failed:', error)
      setError(error.response?.data?.error || 'Failed to update negotiation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <MessageSquare className="h-5 w-5 text-orange-600" />
          </div>
          <span>Negotiate Terms</span>
        </div>
      }
    >
      <div className="p-6">
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
          <p className="text-sm text-orange-900 font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Update the terms below to continue negotiation. The other party will be notified of your changes.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm animate-shake">
            <p className="text-sm text-red-900 font-medium flex items-center">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200 shadow-sm animate-slideDown">
            <p className="text-sm text-green-900 font-medium flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              {success}
            </p>
          </div>
        )}

        {/* AI Suggestion Section */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Lightbulb className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-blue-900">AI Negotiation Assistant</h3>
            </div>
            <button
              type="button"
              onClick={getAISuggestion}
              disabled={loadingAI || !price}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105"
            >
              {loadingAI ? (
                <span className="flex items-center">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </span>
              ) : (
                'Get AI Suggestion'
              )}
            </button>
          </div>
          {aiSuggestion && (
            <div className="mt-3 p-4 bg-white rounded-lg border border-blue-200 shadow-sm animate-slideDown">
              <p className="text-sm text-blue-900 leading-relaxed">{aiSuggestion}</p>
            </div>
          )}
          {!aiSuggestion && !loadingAI && (
            <p className="text-xs text-blue-700 mt-2">💡 Click "Get AI Suggestion" for personalized negotiation advice based on market conditions.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-xs text-gray-600 font-medium mb-1">Crop Type</p>
              <p className="font-semibold text-gray-900 text-lg">{data?.cropType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium mb-1">Variety</p>
              <p className="font-semibold text-gray-900 text-lg">{data?.variety || 'N/A'}</p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                {type === 'listing' ? 'Minimum Price' : 'Maximum Price'} (₹/{data?.quantityUnit}) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Enter price per unit"
                required
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                Current: ₹{type === 'listing' ? data?.minimumPrice : data?.maxPricePerUnit}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity ({data?.quantityUnit}) *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input"
                placeholder="Enter quantity"
                required
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {data?.quantity} {data?.quantityUnit}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Grade *
              </label>
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="input"
                required
              >
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Basic)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Current: Grade {data?.qualityGrade}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Amount
              </label>
              <div className="input bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 font-bold text-xl text-green-700 flex items-center justify-center shadow-sm">
                ₹{price && quantity ? (parseFloat(price) * parseFloat(quantity)).toLocaleString('en-IN') : '0'}
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Negotiation Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="input"
              placeholder="Add any additional terms, conditions, or notes for negotiation..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || !price || !quantity}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="h-5 w-5 animate-spin mr-2" />
                  Updating...
                </span>
              ) : (
                'Update & Continue Negotiation'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default NegotiationModal

