import { MessageSquare, User, Clock, TrendingUp, TrendingDown } from 'lucide-react'

interface NegotiationEntry {
  id: string
  user: 'buyer' | 'farmer'
  userId: string
  userName: string
  price: number
  quantity: number
  message: string
  timestamp: string
  type: 'quote' | 'counter_offer' | 'accept' | 'reject'
}

interface NegotiationHistoryProps {
  history: NegotiationEntry[]
  currentUser: any
  quantityUnit: string
}

const NegotiationHistory = ({ history, currentUser, quantityUnit }: NegotiationHistoryProps) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No negotiation history yet</p>
      </div>
    )
  }

  const getEntryIcon = (entry: NegotiationEntry) => {
    switch (entry.type) {
      case 'accept':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'reject':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-blue-600" />
    }
  }

  const getEntryColor = (entry: NegotiationEntry) => {
    if (entry.userId === currentUser.id) {
      return 'bg-blue-50 border-blue-200'
    }
    return 'bg-gray-50 border-gray-200'
  }

  const getEntryTitle = (entry: NegotiationEntry) => {
    const isCurrentUser = entry.userId === currentUser.id
    const userName = isCurrentUser ? 'You' : entry.userName
    
    switch (entry.type) {
      case 'quote':
        return `${userName} submitted a quote`
      case 'counter_offer':
        return `${userName} made a counter offer`
      case 'accept':
        return `${userName} accepted the offer`
      case 'reject':
        return `${userName} rejected the offer`
      default:
        return `${userName} responded`
    }
  }

  const getPriceChange = (entry: NegotiationEntry, index: number) => {
    if (index === 0) return null
    
    const previousEntry = history[index - 1]
    if (!previousEntry || entry.type === 'accept' || entry.type === 'reject') return null
    
    const change = entry.price - previousEntry.price
    if (change === 0) return null
    
    return (
      <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        ({change > 0 ? '+' : ''}₹{change}/{quantityUnit})
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2" />
        Negotiation History ({history.length})
      </h3>
      
      <div className="space-y-3">
        {history.map((entry, index) => (
          <div
            key={entry.id}
            className={`p-4 rounded-lg border ${getEntryColor(entry)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getEntryIcon(entry)}
                <div>
                  <p className="font-medium text-gray-900">
                    {getEntryTitle(entry)}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {entry.type !== 'reject' && (
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">
                      ₹{entry.price.toLocaleString()}/{quantityUnit}
                    </span>
                    {getPriceChange(entry, index)}
                  </div>
                  {entry.quantity && (
                    <p className="text-sm text-gray-600">
                      Qty: {entry.quantity} {quantityUnit}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {entry.message && (
              <div className="mt-2 p-3 bg-white rounded border border-gray-100">
                <p className="text-sm text-gray-700">{entry.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Negotiation Summary</p>
            <p className="text-xs text-blue-700">
              {history.length} round{history.length !== 1 ? 's' : ''} of negotiation
            </p>
          </div>
          <div className="text-right">
            {history.length > 1 && (
              <>
                <p className="text-sm text-blue-700">
                  Started: ₹{history[0]?.price?.toLocaleString()}/{quantityUnit}
                </p>
                <p className="text-sm font-medium text-blue-900">
                  Latest: ₹{history[history.length - 1]?.price?.toLocaleString()}/{quantityUnit}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NegotiationHistory
