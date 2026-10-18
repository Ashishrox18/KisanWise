import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Package, X, User, MessageSquare, Award, Lightbulb, TrendingUp, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { apiService } from '../../services/api'
import StatusWorkflow from '../../components/StatusWorkflow'
import MicButton from '../../components/MicButton'

const ListingDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMessage, setCounterMessage] = useState('')
  const [marketPrice, setMarketPrice] = useState<any>(null)
  const [showStrategy, setShowStrategy] = useState(true)

  useEffect(() => {
    loadData()
    // Don't update status automatically - let it stay as is
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing offers data...');
      loadData()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [id])

  // Fetch live mandi price for this crop (for negotiation anchoring)
  useEffect(() => {
    if (!listing?.cropType) return
    let alive = true
    apiService.getMarketPrices(listing.cropType).then((res: any) => {
      if (!alive) return
      const key = (listing.cropType as string).toLowerCase()
      setMarketPrice(res?.prices?.[key] || null)
    }).catch(() => { /* silent */ })
    return () => { alive = false }
  }, [listing?.cropType])

  const loadData = async () => {
    try {
      console.log('🔄 Loading listing and offers data for ID:', id);
      let listingData = null;
      let offersData: any[] = [];

      try {
        const listingRes = await apiService.getFarmerListing(id!);
        listingData = listingRes.listing;
      } catch (err) {
        console.error('Failed to load listing:', err);
      }

      try {
        const offersRes = await apiService.getOffersForListing(id!);
        offersData = offersRes.offers || [];
      } catch (err) {
        console.error('Failed to load offers:', err);
      }

      setListing(listingData);
      setOffers(offersData);
      
      // Log each offer status
      if (offersData.length > 0) {
        offersData.forEach((offer: any, index: number) => {
          console.log(`   Offer ${index + 1}: ${offer.buyerName} - ₹${offer.pricePerUnit} - Status: ${offer.status}`);
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  // ── Negotiation strategy (computed, no backend call) ────────────────────
  const negotiationStrategy = useMemo(() => {
    if (!selectedOffer || !listing) return null
    const buyerPrice   = parseFloat(selectedOffer.pricePerUnit) || 0
    const minPrice     = parseFloat(listing.minimumPrice) || 0
    const expectedPrice = parseFloat(listing.expectedPrice) || minPrice * 1.1
    const mandiPrice   = marketPrice ? (parseFloat(marketPrice.current) || 0) : 0
    const trend        = marketPrice?.trend as string | undefined
    const unit         = listing.quantityUnit || 'quintal'

    // Suggested counter: midpoint between buyer's offer and minimum, anchored by mandi
    const anchor = mandiPrice > 0 ? Math.max(minPrice, mandiPrice * 0.92) : minPrice
    const suggested = Math.round(
      Math.max(anchor, Math.min(expectedPrice, (buyerPrice + Math.max(anchor, minPrice)) / 2 * 1.05))
    )

    const gap = expectedPrice - buyerPrice
    const gapPct = expectedPrice > 0 ? Math.round((gap / expectedPrice) * 100) : 0

    const points: { icon: string; text: string }[] = []

    // 1. Mandi anchor
    if (mandiPrice > 0) {
      points.push({
        icon: '📊',
        text: `Live mandi rate for ${listing.cropType} is ₹${Math.round(mandiPrice).toLocaleString('en-IN')}/${unit}. Use this as your price floor — never go below it.`,
      })
    }

    // 2. Market trend signal
    if (trend === 'rising') {
      points.push({ icon: '📈', text: 'Prices are trending upward — hold firm or ask slightly higher. Buyers know stock will cost more next week.' })
    } else if (trend === 'falling') {
      points.push({ icon: '📉', text: 'Prices are softening. Closing a deal today at a good price beats waiting for a better one that may not come.' })
    } else {
      points.push({ icon: '↔️', text: 'Market is stable. A quick deal at fair price saves storage and handling costs for both sides.' })
    }

    // 3. Gap analysis
    if (gapPct > 20) {
      points.push({ icon: '🎯', text: `Buyer is ${gapPct}% below your expected price. Counter at ₹${suggested.toLocaleString('en-IN')}/${unit} — close the gap in steps, not all at once.` })
    } else if (gapPct > 8) {
      points.push({ icon: '🤝', text: `Small gap of ${gapPct}%. A counter at ₹${suggested.toLocaleString('en-IN')}/${unit} signals good faith while protecting your margin.` })
    } else {
      points.push({ icon: '✅', text: `Buyer's offer is close to your target (${gapPct}% gap). Consider accepting or proposing ₹${suggested.toLocaleString('en-IN')}/${unit} to wrap up.` })
    }

    // 4. Justification language
    points.push({
      icon: '🗣️',
      text: 'In your message, mention: quality grade, harvest date freshness, and transport convenience — concrete facts justify higher prices better than a bare number.',
    })

    // 5. Walk-away advice
    if (minPrice > 0) {
      points.push({ icon: '🚫', text: `Never go below ₹${Math.round(minPrice).toLocaleString('en-IN')}/${unit} (your minimum). Walking away is better than underselling.` })
    }

    return { suggested, points, buyerPrice, minPrice, expectedPrice, mandiPrice, unit }
  }, [selectedOffer, listing, marketPrice])

  const handleCounterOffer = async () => {
    if (!selectedOffer || !counterPrice) return

    try {
      await apiService.counterOfferFromFarmer(selectedOffer.id, {
        pricePerUnit: parseFloat(counterPrice),
        message: counterMessage
      })
      setShowCounterModal(false)
      setSelectedOffer(null)
      setCounterPrice('')
      setCounterMessage('')
      await loadData()
    } catch (error) {
      console.error('Failed to submit counter offer:', error)
      alert('Failed to submit counter offer')
    }
  }

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to accept this offer? This will finalize the deal.')) {
      return
    }

    try {
      await apiService.acceptOffer(offerId)
      await loadData()
      alert('Offer accepted! Deal finalized and invoice generated.')
    } catch (error) {
      console.error('Failed to accept offer:', error)
      alert('Failed to accept offer')
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
          onClick={() => navigate('/farmer/my-listings')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to My Listings
        </button>
      </div>

      {/* Listing Details */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {listing.cropType} {listing.variety && `(${listing.variety})`}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Listing ID: {listing.id}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            listing.status === 'awarded' || listing.status === 'accepted' ? 'bg-green-100 text-green-800' :
            listing.status === 'negotiating' || listing.status === 'countered' ? 'bg-yellow-100 text-yellow-800' :
            listing.status === 'awarding' ? 'bg-purple-100 text-purple-800' :
            listing.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {listing.status === 'awarded' || listing.status === 'accepted' ? 'DEAL FINALIZED' : 
             listing.status === 'awarding' ? 'AWARDING IN PROGRESS' :
             listing.status === 'negotiating' || listing.status === 'countered' ? 'UNDER NEGOTIATION' :
             listing.status === 'in_progress' ? 'OFFERS RECEIVED' :
             'OPEN FOR OFFERS'}
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
            <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
            <p className="text-sm text-gray-700">{listing.description}</p>
          </div>
        )}
      </div>

      {/* Status Workflow */}
      <StatusWorkflow currentStatus={listing.status || 'open'} type="listing" />

      {/* Invoice Section - Only show for finalized sales */}
      {(listing.status === 'awarded' || listing.status === 'accepted') && (
        <div className="card bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sale Invoice</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Invoice Date</p>
              <p className="font-semibold text-gray-900">
                {listing.awardedAt ? new Date(listing.awardedAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Seller Details */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Seller Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Farmer ID</p>
                <p className="font-medium text-gray-900">{listing.farmerId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Pickup Location</p>
                <p className="font-medium text-gray-900">{listing.pickupLocation}</p>
              </div>
            </div>
          </div>

          {/* Buyer Details */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Buyer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Buyer Name</p>
                <p className="font-medium text-gray-900">
                  {listing.awardedBuyerName || offers.find(o => o.status === 'accepted')?.buyerName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Buyer ID</p>
                <p className="font-medium text-gray-900">
                  {listing.awardedBuyerId || offers.find(o => o.status === 'accepted')?.buyerId || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Product Details</h3>
            <table className="w-full">
              <thead className="border-b border-gray-300">
                <tr className="text-left">
                  <th className="pb-2 text-xs font-semibold text-gray-700">Item</th>
                  <th className="pb-2 text-xs font-semibold text-gray-700 text-right">Quantity</th>
                  <th className="pb-2 text-xs font-semibold text-gray-700 text-right">Price/Unit</th>
                  <th className="pb-2 text-xs font-semibold text-gray-700 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{listing.cropType}</p>
                    {listing.variety && <p className="text-xs text-gray-600">Variety: {listing.variety}</p>}
                    <p className="text-xs text-gray-600">Grade: {listing.qualityGrade}</p>
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    {listing.quantity} {listing.quantityUnit}
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    ₹{listing.finalPrice || listing.currentBestOffer || listing.minimumPrice}
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    ₹{((listing.finalPrice || listing.currentBestOffer || listing.minimumPrice) * listing.quantity).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Amount */}
          <div className="p-4 bg-green-100 rounded-lg border-2 border-green-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Subtotal</span>
              <span className="font-semibold text-gray-900">
                ₹{((listing.finalPrice || listing.currentBestOffer || listing.minimumPrice) * listing.quantity).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Tax (0%)</span>
              <span className="font-semibold text-gray-900">₹0</span>
            </div>
            <div className="border-t-2 border-green-300 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">
                  ₹{((listing.finalPrice || listing.currentBestOffer || listing.minimumPrice) * listing.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Payment Terms</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Payment to be made upon delivery or as per agreed terms</li>
              <li>• Quality inspection will be done at pickup location</li>
              <li>• Any disputes to be resolved within 7 days of delivery</li>
            </ul>
          </div>

          {/* Print Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Print Invoice
            </button>
          </div>
        </div>
      )}

      {/* Offers Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Received Offers ({offers.length})
          </h2>
          <Package className="h-6 w-6 text-blue-600" />
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No offers received yet</p>
            <p className="text-sm text-gray-500 mt-2">Buyers will see your listing and can make offers</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">Buyer: {offer.buyerName || 'Anonymous'}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Submitted {new Date(offer.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    offer.status === 'countered' ? 'bg-orange-100 text-orange-800' :
                    offer.status === 'proposed_award' ? 'bg-purple-100 text-purple-800' :
                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {offer.status === 'proposed_award' ? 'PURCHASE PROPOSED' : offer.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Offered Price</p>
                    <p className="font-semibold text-blue-600">₹{offer.pricePerUnit}/{listing.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-semibold text-gray-900">{offer.quantity} {listing.quantityUnit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Amount</p>
                    <p className="font-semibold text-gray-900">₹{(offer.pricePerUnit * offer.quantity).toLocaleString()}</p>
                  </div>
                </div>

                {/* Price Comparison */}
                <div className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Your minimum price:</span>
                    <span className="font-medium text-gray-900">₹{listing.minimumPrice}/{listing.quantityUnit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Buyer's offer:</span>
                    <span className={`font-medium ${offer.pricePerUnit >= listing.minimumPrice ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{offer.pricePerUnit}/{listing.quantityUnit}
                      {offer.pricePerUnit >= listing.minimumPrice ? ' ✓' : ' (Below minimum)'}
                    </span>
                  </div>
                </div>

                {offer.message && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-1">Buyer's Message:</p>
                    <p className="text-sm text-blue-700">{offer.message}</p>
                  </div>
                )}

                {/* Negotiation History */}
                {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                  <div className="mb-3 p-3 bg-orange-50 rounded border border-orange-200">
                    <p className="text-xs font-medium text-orange-900 mb-2">Negotiation History:</p>
                    {offer.negotiationHistory.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs text-orange-700 mb-1">
                        • {item.by === 'farmer' ? 'You' : 'Buyer'} countered: ₹{item.price} - {item.message}
                      </div>
                    ))}
                  </div>
                )}

                {offer.status !== 'accepted' && listing.status !== 'awarded' && listing.status !== 'accepted' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedOffer(offer)
                        setCounterPrice(offer.pricePerUnit.toString())
                        setShowCounterModal(true)
                      }}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {offer.status === 'proposed_award' ? 'Negotiate Price' : 'Counter Offer'}
                    </button>
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      {offer.status === 'proposed_award' ? 'Accept & Finalize' : 'Accept Offer'}
                    </button>
                  </div>
                )}

                {offer.status === 'proposed_award' && (
                  <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                    <p className="text-sm font-medium text-purple-900">🎯 Buyer wants to purchase!</p>
                    <p className="text-xs text-purple-700 mt-1">
                      The buyer is ready to proceed with this offer. Accept to finalize the deal or negotiate for a better price.
                    </p>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm font-medium text-green-900">✓ This offer has been accepted</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counter Offer Modal — with negotiation strategy advisor */}
      {showCounterModal && selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-semibold text-gray-900">Counter Offer</h3>
              </div>
              <button onClick={() => { setShowCounterModal(false); setSelectedOffer(null) }} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Price overview */}
              <div className="px-5 pt-4 pb-2 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-600 font-medium mb-0.5">Buyer's Offer</p>
                  <p className="text-lg font-bold text-orange-700">₹{parseFloat(selectedOffer.pricePerUnit).toLocaleString('en-IN')}<span className="text-xs font-normal">/{listing.quantityUnit}</span></p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Your Minimum</p>
                  <p className="text-lg font-bold text-gray-700">₹{parseFloat(listing.minimumPrice).toLocaleString('en-IN')}<span className="text-xs font-normal">/{listing.quantityUnit}</span></p>
                </div>
                {negotiationStrategy?.mandiPrice ? (
                  <div className="col-span-2 bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Live Mandi Rate <span className="text-[10px] font-normal">({marketPrice?.trend})</span></p>
                      <p className="text-base font-bold text-blue-700">₹{Math.round(negotiationStrategy.mandiPrice).toLocaleString('en-IN')}<span className="text-xs font-normal">/{negotiationStrategy.unit}</span></p>
                    </div>
                    {marketPrice?.trend === 'rising'
                      ? <TrendingUp className="h-5 w-5 text-green-500" />
                      : <TrendingUp className="h-5 w-5 text-gray-400 rotate-180" />}
                  </div>
                ) : null}
              </div>

              {/* Negotiation strategy advisor */}
              {negotiationStrategy && (
                <div className="px-5 pb-3">
                  <button
                    type="button"
                    onClick={() => setShowStrategy(s => !s)}
                    className="w-full flex items-center justify-between py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 mb-2 hover:bg-amber-100 transition"
                  >
                    <span className="flex items-center gap-1.5"><Lightbulb className="h-4 w-4" /> Negotiation Strategy</span>
                    {showStrategy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showStrategy && (
                    <div className="space-y-2 mb-3">
                      {negotiationStrategy.points.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-900">
                          <span className="text-base leading-none mt-0.5">{p.icon}</span>
                          <span>{p.text}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs text-green-700 font-semibold flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Suggested counter price</p>
                          <p className="text-base font-bold text-green-800">₹{negotiationStrategy.suggested.toLocaleString('en-IN')}<span className="text-xs font-normal">/{negotiationStrategy.unit}</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCounterPrice(negotiationStrategy.suggested.toString())}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                        >Use this</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Counter price input */}
              <div className="px-5 pb-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Counter Price (₹/{listing.quantityUnit})
                  </label>
                  <input
                    type="number"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="input w-full"
                    placeholder={`e.g. ${negotiationStrategy?.suggested ?? ''}`}
                  />
                  {counterPrice && listing.minimumPrice && parseFloat(counterPrice) < parseFloat(listing.minimumPrice) && (
                    <p className="text-xs text-red-500 mt-1">⚠️ This is below your minimum price of ₹{parseFloat(listing.minimumPrice).toLocaleString('en-IN')}.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to buyer <span className="text-gray-400 font-normal">(optional but recommended)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      rows={3}
                      className="input w-full pr-10"
                      placeholder="e.g. Fresh harvest, Grade A quality, available for pickup this week…"
                    />
                    <span className="absolute bottom-2.5 right-2.5">
                      <MicButton onTranscribe={(t) => setCounterMessage(prev => prev ? prev + ' ' + t : t)} title="Dictate message" />
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Mention quality grade, freshness, and pickup availability — specific reasons help justify your price.</p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white">
              <button
                onClick={handleCounterOffer}
                disabled={!counterPrice}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition disabled:opacity-50 font-medium text-sm"
              >
                Submit Counter Offer
              </button>
              <button
                onClick={() => { setShowCounterModal(false); setSelectedOffer(null) }}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ListingDetail

