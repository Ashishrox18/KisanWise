import { Activity, AlertTriangle, CheckCircle, Clock, Cpu, Database, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SystemMonitoring = () => {
  const performanceData = [
    { time: '00:00', cpu: 45, memory: 62, requests: 1200 },
    { time: '04:00', cpu: 38, memory: 58, requests: 800 },
    { time: '08:00', cpu: 72, memory: 75, requests: 3500 },
    { time: '12:00', cpu: 85, memory: 82, requests: 4200 },
    { time: '16:00', cpu: 68, memory: 71, requests: 2800 },
    { time: '20:00', cpu: 52, memory: 65, requests: 1800 },
  ]

  const services = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.9%', latency: '45ms', requests: '125K/hr' },
    { name: 'AI/ML Services', status: 'healthy', uptime: '99.8%', latency: '120ms', requests: '8K/hr' },
    { name: 'Database', status: 'healthy', uptime: '99.9%', latency: '12ms', requests: '450K/hr' },
    { name: 'IoT Core', status: 'warning', uptime: '98.5%', latency: '85ms', requests: '25K/hr' },
    { name: 'Storage Services', status: 'healthy', uptime: '99.9%', latency: '35ms', requests: '45K/hr' },
    { name: 'Notification Service', status: 'healthy', uptime: '99.7%', latency: '55ms', requests: '18K/hr' },
  ]

  const alerts = [
    {
      severity: 'warning',
      service: 'IoT Core',
      message: 'Elevated latency detected in sensor data processing',
      time: '15 minutes ago',
    },
    {
      severity: 'info',
      service: 'Auto Scaling',
      message: 'Scaled up 2 additional instances due to increased load',
      time: '1 hour ago',
    },
    {
      severity: 'resolved',
      service: 'Database',
      message: 'Connection pool optimization completed successfully',
      time: '3 hours ago',
    },
  ]

  const metrics = [
    { name: 'API Response Time', value: '45ms', target: '< 100ms', status: 'good' },
    { name: 'Error Rate', value: '0.02%', target: '< 0.1%', status: 'good' },
    { name: 'Throughput', value: '125K req/hr', target: '> 100K', status: 'good' },
    { name: 'Database Queries', value: '450K/hr', target: '< 500K', status: 'good' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
        <p className="text-gray-600 mt-1">Real-time platform health and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-green-600">Healthy</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">99.8%</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-yellow-600">1</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">45ms</p>
            </div>
            <Zap className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cpu" stroke="#22c55e" strokeWidth={2} name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} name="Memory %" />
              <Line type="monotone" dataKey="requests" stroke="#f97316" strokeWidth={2} name="Requests/min" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Health</h2>
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.name} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : service.status === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <p className="font-semibold text-gray-900">{service.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    service.status === 'healthy' ? 'bg-green-100 text-green-800' :
                    service.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {service.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Uptime</p>
                    <p className="font-semibold text-gray-900">{service.uptime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Latency</p>
                    <p className="font-semibold text-gray-900">{service.latency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Requests</p>
                    <p className="font-semibold text-gray-900">{service.requests}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
            <div className="space-y-3">
              {metrics.map((metric) => (
                <div key={metric.name} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-gray-600">Target: {metric.target}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  alert.severity === 'error' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'resolved' ? 'bg-green-50 border-green-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start space-x-2">
                    {alert.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    ) : alert.severity === 'resolved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.service}</p>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <Cpu className="h-6 w-6 text-primary-600" />
            <h3 className="font-semibold text-gray-900">CPU Usage</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">68%</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600" style={{ width: '68%' }} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Memory Usage</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">71%</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: '71%' }} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <Activity className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold text-gray-900">Network I/O</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">2.8 GB/s</p>
          <p className="text-sm text-gray-600">Avg throughput</p>
        </div>
      </div>
    </div>
  )
}

export default SystemMonitoring

