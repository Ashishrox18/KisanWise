import { Check, Circle, Clock } from 'lucide-react'

interface StatusWorkflowProps {
  currentStatus: string
  type: 'procurement' | 'listing'
}

const StatusWorkflow = ({ currentStatus, type }: StatusWorkflowProps) => {
  const stages = [
    { key: 'released', label: 'Released' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'negotiating', label: 'Negotiating' },
    { key: 'awarding', label: 'Awarding' },
    { key: 'contract_generation', label: 'Contract Generation' },
    { key: 'awarded', label: 'Awarded' },
  ]

  // Map various status values to workflow stages
  const statusMap: Record<string, string> = {
    // Stage 1: Released
    'open': 'released',
    'released': 'released',
    'active': 'released',

    // Stage 2: In Progress
    'in_progress': 'in_progress',
    'quoted': 'in_progress',
    'has_offers': 'in_progress',
    'pending': 'in_progress',

    // Stage 3: Negotiating
    'negotiating': 'negotiating',
    'countered': 'negotiating',
    'counter_offer': 'negotiating',
    'counter': 'negotiating',

    // Stage 4: Awarding
    'awarding': 'awarding',
    'pending_award': 'awarding',
    'proposed_award': 'awarding',
    'award_pending': 'awarding',

    // Stage 5: Contract Generation
    'contract_generation': 'contract_generation',
    'pending_buyer_confirmation': 'contract_generation',
    'farmer_accepted': 'contract_generation',
    'generating_contract': 'contract_generation',

    // Stage 6: Awarded
    'awarded': 'awarded',
    'accepted': 'awarded',
    'completed': 'awarded',
    'confirmed': 'awarded',
    'closed': 'awarded'
  }

  const cleanStatus = (currentStatus || '').toLowerCase().trim()
  const normalizedStatus = statusMap[cleanStatus] || 'released'

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.key === normalizedStatus)
  }

  const currentIndex = getCurrentStageIndex()

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Workflow</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={stage.key} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
                {/* Circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-green-600 border-green-600' 
                    : isCurrent 
                    ? 'bg-blue-600 border-blue-600 animate-pulse' 
                    : 'bg-white border-gray-300'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : isCurrent ? (
                    <Clock className="h-5 w-5 text-white" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {stage.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Status Description */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900">
          Current Status: <span className="capitalize">{stages[currentIndex]?.label || normalizedStatus}</span>
        </p>
        <p className="text-xs text-blue-700 mt-1">
          {normalizedStatus === 'released' && `${type === 'procurement' ? 'Procurement request' : 'Listing'} has been created and is visible to interested parties`}
          {normalizedStatus === 'in_progress' && 'Parties are viewing and considering this opportunity'}
          {normalizedStatus === 'negotiating' && 'Active negotiation in progress with price and terms discussion'}
          {normalizedStatus === 'awarding' && 'Final decision being made on the best offer'}
          {normalizedStatus === 'contract_generation' && 'Contract is being prepared for signing'}
          {normalizedStatus === 'awarded' && 'Deal has been finalized and contract awarded'}
        </p>
      </div>
    </div>
  )
}

export default StatusWorkflow

