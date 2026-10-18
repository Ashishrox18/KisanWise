import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const QualityInspection = () => {
  const inspections = [
    {
      orderId: 'ORD-001',
      product: 'Rice',
      quantity: '10 tons',
      farmer: 'Rajesh Kumar',
      status: 'passed',
      score: 95,
      parameters: {
        moisture: { value: '12%', status: 'pass', standard: '< 14%' },
        purity: { value: '98%', status: 'pass', standard: '> 95%' },
        weight: { value: '10.05 tons', status: 'pass', standard: '10 tons ±2%' },
        damage: { value: '1%', status: 'pass', standard: '< 3%' },
      },
    },
    {
      orderId: 'ORD-002',
      product: 'Wheat',
      quantity: '5 tons',
      farmer: 'Priya Sharma',
      status: 'pending',
      score: null,
      parameters: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quality Inspection</h1>
        <p className="text-gray-600 mt-1">AI-powered quality assessment and verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Pending Inspections</p>
          <p className="text-3xl font-bold text-yellow-600">1</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Passed</p>
          <p className="text-3xl font-bold text-green-600">1</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Avg. Quality Score</p>
          <p className="text-3xl font-bold text-gray-900">95%</p>
        </div>
      </div>

      <div className="space-y-4">
        {inspections.map((inspection) => (
          <div key={inspection.orderId} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold text-gray-900">{inspection.orderId}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    inspection.status === 'passed' ? 'bg-green-100 text-green-800' :
                    inspection.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {inspection.status === 'passed' ? 'Passed' :
                     inspection.status === 'failed' ? 'Failed' : 'Pending Inspection'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {inspection.product} • {inspection.quantity} • From: {inspection.farmer}
                </p>
              </div>
              {inspection.status === 'pending' && (
                <button className="btn-primary flex items-center">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Inspection
                </button>
              )}
            </div>

            {inspection.status === 'passed' && inspection.parameters && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Quality Score</p>
                    <p className="text-2xl font-bold text-green-600">{inspection.score}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600"
                      style={{ width: `${inspection.score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(inspection.parameters).map(([key, param]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">{key}</p>
                        {param.status === 'pass' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{param.value}</p>
                      <p className="text-xs text-gray-600">Standard: {param.standard}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex space-x-3">
                  <button className="btn-primary flex-1">Accept Shipment</button>
                  <button className="btn-secondary">View Report</button>
                </div>
              </>
            )}

            {inspection.status === 'pending' && (
              <div className="p-4 bg-blue-50 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Ready for Inspection</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Use the mobile app to capture photos and measurements. AI will automatically assess quality parameters.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default QualityInspection

