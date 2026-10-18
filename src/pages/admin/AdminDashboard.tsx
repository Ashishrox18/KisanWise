import { Users, TrendingUp, Activity, Globe } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const AdminDashboard = () => {
  const userGrowth = [
    { month: 'Jan', farmers: 8500, buyers: 450, transporters: 120, storage: 45 },
    { month: 'Feb', farmers: 9200, buyers: 480, transporters: 135, storage: 48 },
    { month: 'Mar', farmers: 10100, buyers: 520, transporters: 145, storage: 52 },
    { month: 'Apr', farmers: 11000, buyers: 560, transporters: 158, storage: 55 },
    { month: 'May', farmers: 11800, buyers: 590, transporters: 165, storage: 58 },
    { month: 'Jun', farmers: 12458, buyers: 625, transporters: 178, storage: 62 },
  ]

  const transactionVolume = [
    { month: 'Jan', volume: 28 },
    { month: 'Feb', volume: 32 },
    { month: 'Mar', volume: 35 },
    { month: 'Apr', volume: 38 },
    { month: 'May', volume: 42 },
    { month: 'Jun', volume: 45 },
  ]

  const userDistribution = [
    { name: 'Farmers', value: 12458, color: '#22c55e' },
    { name: 'Buyers', value: 625, color: '#3b82f6' },
    { name: 'Transporters', value: 178, color: '#f97316' },
    { name: 'Storage', value: 62, color: '#a855f7' },
  ]

  const regionalStats = [
    { region: 'Punjab', users: 3200, transactions: '₹12.5M', growth: '+15%' },
    { region: 'Haryana', users: 2800, transactions: '₹10.2M', growth: '+12%' },
    { region: 'Gujarat', users: 2100, transactions: '₹8.5M', growth: '+18%' },
    { region: 'Maharashtra', users: 1900, transactions: '₹7.8M', growth: '+10%' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">13,323</p>
              <p className="text-sm text-green-600 mt-1">+12% this month</p>
            </div>
            <Users className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transaction Volume</p>
              <p className="text-2xl font-bold text-gray-900">₹45.2M</p>
              <p className="text-sm text-green-600 mt-1">+18% this month</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Regions</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-sm text-blue-600 mt-1">2 new this quarter</p>
            </div>
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-2xl font-bold text-gray-900">99.8%</p>
              <p className="text-sm text-green-600 mt-1">Uptime</p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="farmers" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="buyers" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="transporters" stroke="#f97316" strokeWidth={2} />
                <Line type="monotone" dataKey="storage" stroke="#a855f7" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction Volume (₹M)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transactionVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Regional Performance</h2>
          <div className="space-y-3">
            {regionalStats.map((region) => (
              <div key={region.region} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{region.region}</p>
                    <p className="text-sm text-gray-600">{region.users} users</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{region.transactions}</p>
                    <p className="text-sm text-green-600">{region.growth}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

