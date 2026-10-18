import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Award as AwardIcon, Download, FileText, CheckCircle } from 'lucide-react'
import { apiService } from '../services/api'

const Award = () => {
  const { type, id } = useParams<{ type: 'listing' | 'procurement'; id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [awardedQuantity, setAwardedQuantity] = useState('')
  const [contractTerms, setContractTerms] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [awarded, setAwarded] = useState(false)

  useEffect(() => {
    loadData()
  }, [type, id])

  const loadData = async () => {
    try {
      if (type === 'listing') {
        const res = await apiService.getFarmerListing(id!)
        setData(res.listing)
        setAwardedQuantity(res.listing.quantity.toString())
      } else {
        const res = await apiService.getProcurementRequestDetail(id!)
        setData(res.request)
        setAwardedQuantity(res.request.quantity.toString())
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateContract = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    const today = new Date().toLocaleDateString()
    const contractId = `CONTRACT-${Date.now()}`

    return `
═══════════════════════════════════════════════════════════════
                AGRICULTURAL PRODUCE CONTRACT
═══════════════════════════════════════════════════════════════

Contract ID: ${contractId}
Date: ${today}

BETWEEN:

${type === 'listing' ? 'SELLER (Farmer)' : 'BUYER'}:
Name: ${type === 'listing' ? data?.farmerName || 'Farmer' : user.name}
Contact: ${user.phone || 'N/A'}
Email: ${user.email}

AND:

${type === 'listing' ? 'BUYER' : 'SELLER (Farmer)'}:
Name: ${type === 'listing' ? user.name : data?.farmerName || 'Farmer'}
Contact: [To be filled]
Email: [To be filled]

═══════════════════════════════════════════════════════════════
                        TERMS OF AGREEMENT
═══════════════════════════════════════════════════════════════

1. PRODUCE DETAILS
   Crop Type: ${data?.cropType}
   Variety: ${data?.variety || 'Standard'}
   Quality Grade: Grade ${data?.qualityGrade}

2. QUANTITY
   Awarded Quantity: ${awardedQuantity} ${data?.quantityUnit}
   Total Available: ${data?.quantity} ${data?.quantityUnit}

3. PRICING
   Price per ${data?.quantityUnit}: ₹${type === 'listing' ? data?.minimumPrice : data?.maxPricePerUnit}
   Total Contract Value: ₹${((type === 'listing' ? data?.minimumPrice : data?.maxPricePerUnit) * parseFloat(awardedQuantity || '0')).toLocaleString()}

4. DELIVERY/PICKUP
   Location: ${type === 'listing' ? data?.pickupLocation : data?.deliveryLocation}
   ${type === 'listing' ? 'Available From' : 'Required By'}: ${new Date(type === 'listing' ? data?.availableFrom : data?.requiredBy).toLocaleDateString()}

5. PAYMENT TERMS
   - Payment to be made within 7 days of delivery
   - Mode of payment: Bank transfer or as mutually agreed
   - Advance payment: 30% (if applicable)

6. QUALITY STANDARDS
   - Produce must meet Grade ${data?.qualityGrade} specifications
   - Quality inspection to be conducted upon delivery
   - Rejection clause applies if quality standards not met

7. ADDITIONAL TERMS
${contractTerms || '   - As per mutual agreement between parties'}

═══════════════════════════════════════════════════════════════
                          DECLARATIONS
═══════════════════════════════════════════════════════════════

Both parties agree to the terms and conditions stated above and
commit to fulfilling their respective obligations under this contract.

SELLER SIGNATURE: _____________________  DATE: __________

BUYER SIGNATURE:  _____________________  DATE: __________

═══════════════════════════════════════════════════════════════
                    Generated via Krishi Era Platform
                         ${today}
═══════════════════════════════════════════════════════════════
    `.trim()
  }

  const handleDownloadContract = () => {
    const contract = generateContract()
    const blob = new Blob([contract], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contract-${type}-${id}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFinalizeAward = async () => {
    if (!awardedQuantity || parseFloat(awardedQuantity) <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    if (!confirm('Are you sure you want to finalize this award? This action cannot be undone.')) {
      return
    }

    setAwarding(true)
    try {
      // Update status to awarded
      if (type === 'listing') {
        await apiService.updateListingStatus(id!, 'awarded')
      } else {
        await apiService.updateProcurementStatus(id!, 'awarded')
      }

      setAwarded(true)
      
      // Download contract automatically
      handleDownloadContract()

      // Redirect after 3 seconds
      setTimeout(() => {
        if (type === 'listing') {
          navigate('/farmer/my-listings')
        } else {
          navigate('/buyer/my-procurement-requests')
        }
      }, 3000)
    } catch (error) {
      console.error('Failed to finalize award:', error)
      alert('Failed to finalize award. Please try again.')
    } finally {
      setAwarding(false)
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

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Data not found</p>
      </div>
    )
  }

  if (awarded) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-green-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Award Finalized!</h1>
        <p className="text-lg text-gray-600 mb-6">
          The contract has been generated and downloaded. You will be redirected shortly.
        </p>
        <button
          onClick={() => navigate(type === 'listing' ? '/farmer/my-listings' : '/buyer/my-procurement-requests')}
          className="btn-primary"
        >
          Go to My {type === 'listing' ? 'Listings' : 'Requests'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <div className="flex items-center space-x-2 text-orange-600">
          <AwardIcon className="h-6 w-6" />
          <span className="font-semibold">Award Contract</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Contract Summary</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-600 mb-1">Crop Type</p>
            <p className="font-semibold text-gray-900">{data.cropType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Variety</p>
            <p className="font-semibold text-gray-900">{data.variety || 'Standard'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Quality Grade</p>
            <p className="font-semibold text-purple-600">Grade {data.qualityGrade}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Available Quantity</p>
            <p className="font-semibold text-gray-900">{data.quantity} {data.quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Price per Unit</p>
            <p className="font-semibold text-green-600">
              ₹{type === 'listing' ? data.minimumPrice : data.maxPricePerUnit}/{data.quantityUnit}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Location</p>
            <p className="font-semibold text-gray-900 text-sm">
              {type === 'listing' ? data.pickupLocation : data.deliveryLocation}
            </p>
          </div>
        </div>

        {/* Award Quantity */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity to Award ({data.quantityUnit}) *
          </label>
          <input
            type="number"
            value={awardedQuantity}
            onChange={(e) => setAwardedQuantity(e.target.value)}
            className="input max-w-xs"
            placeholder="Enter quantity"
            max={data.quantity}
            step="0.01"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum available: {data.quantity} {data.quantityUnit}
          </p>
        </div>

        {/* Total Amount */}
        {awardedQuantity && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 mb-1">Total Contract Value</p>
            <p className="text-3xl font-bold text-green-900">
              ₹{((type === 'listing' ? data.minimumPrice : data.maxPricePerUnit) * parseFloat(awardedQuantity)).toLocaleString()}
            </p>
          </div>
        )}

        {/* Contract Terms */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Contract Terms (Optional)
          </label>
          <textarea
            value={contractTerms}
            onChange={(e) => setContractTerms(e.target.value)}
            rows={4}
            className="input"
            placeholder="Add any specific terms, conditions, or requirements for this contract..."
          />
        </div>
      </div>

      {/* Contract Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Contract Preview</h3>
          </div>
          <button
            onClick={handleDownloadContract}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="h-4 w-4" />
            <span>Download Contract</span>
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
            {generateContract()}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="card bg-orange-50 border-2 border-orange-200">
        <div className="flex items-start space-x-4">
          <AwardIcon className="h-8 w-8 text-orange-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Ready to Finalize?</h3>
            <p className="text-sm text-orange-700 mb-4">
              By clicking "Finalize Award", you confirm that all terms are acceptable and the contract will be generated. 
              The contract will be downloaded automatically and the status will be updated to "Awarded".
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleFinalizeAward}
                disabled={awarding || !awardedQuantity}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
              >
                <AwardIcon className="h-5 w-5" />
                <span>{awarding ? 'Finalizing...' : 'Finalize Award'}</span>
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition border border-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Award

