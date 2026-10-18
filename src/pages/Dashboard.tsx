import { Link } from 'react-router-dom'
import { 
  Sprout, ShoppingCart, Truck, Warehouse, 
  TrendingUp, Users, Package, DollarSign 
} from 'lucide-react'

const Dashboard = () => {
  const personas = [
    {
      name: 'Farmer',
      description: 'Optimize crop planning, harvest timing, and market access',
      icon: Sprout,
      href: '/farmer',
      color: 'bg-green-500',
    },
    {
      name: 'Buyer',
      description: 'Procure quality produce with transparent pricing',
      icon: ShoppingCart,
      href: '/buyer',
      color: 'bg-blue-500',
    },
    {
      name: 'Transporter',
      description: 'Optimize routes and maximize fleet efficiency',
      icon: Truck,
      href: '/transporter',
      color: 'bg-orange-500',
    },
    {
      name: 'Storage Provider',
      description: 'Manage capacity and monitor storage conditions',
      icon: Warehouse,
      href: '/storage',
      color: 'bg-purple-500',
    },
  ]

  const stats = [
    { name: 'Active Farmers', value: '12,458', icon: Users, change: '+12%' },
    { name: 'Total Transactions', value: '₹45.2M', icon: DollarSign, change: '+18%' },
    { name: 'Products Listed', value: '3,247', icon: Package, change: '+8%' },
    { name: 'Market Efficiency', value: '94%', icon: TrendingUp, change: '+5%' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Krishi Era AI
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          AI-orchestrated rural resource and market intelligence platform connecting 
          farmers, buyers, transporters, and storage providers for efficient agricultural coordination.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Persona Cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((persona) => {
            const Icon = persona.icon
            return (
              <Link
                key={persona.name}
                to={persona.href}
                className="card hover:shadow-lg transition-shadow group"
              >
                <div className={`${persona.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {persona.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {persona.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="card bg-gradient-to-r from-primary-50 to-green-50">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Optimization</h3>
            <p className="text-sm text-gray-600">
              Smart recommendations for crop planning, pricing, and resource allocation
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-Time Coordination</h3>
            <p className="text-sm text-gray-600">
              Seamless connection between all stakeholders in the agricultural ecosystem
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Fair Price Discovery</h3>
            <p className="text-sm text-gray-600">
              Transparent, data-backed pricing based on real market conditions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

