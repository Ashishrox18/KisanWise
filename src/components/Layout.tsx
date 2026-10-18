import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Sprout, User, Menu, X, LogOut, UserCircle, Package, Receipt, Leaf, Play } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import NotificationBell from './NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'
import AIAssistant from './AIAssistant'
import PageHelp from './PageHelp'
import AIGovernanceModal from './AIGovernanceModal'
import { useAIGovernance } from '../hooks/useAIGovernance'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { showModal, userId, dismiss } = useAIGovernance()

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const userData = sessionStorage.getItem('user')
    if (!token) {
      navigate('/login')
    } else if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [navigate])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'farmer': return '/farmer'
      case 'buyer':  return '/buyer'
      case 'admin':  return '/admin'
      default:       return '/'
    }
  }

  const navigation = [{ name: 'Dashboard', href: getDashboardPath(), icon: Home }]

  const isActive = (path: string) => {
    const dashboardPath = getDashboardPath()
    if (path === dashboardPath && location.pathname === dashboardPath) return true
    if (path === '/' || path === dashboardPath) return false
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-primary-700 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">

            {/* Logo */}
            <Link to={getDashboardPath()} className="flex items-center gap-2.5 group">
              <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                <Leaf className="h-5 w-5 text-accent-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">KisanWise</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map(({ name, href, icon: Icon }) => (
                <Link
                  key={name}
                  to={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(href)
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <NotificationBell />
              <LanguageSwitcher />

              {/* User dropdown */}
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-400 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white/90 font-medium">{user?.name?.split(' ')[0] || 'User'}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-modal border border-warm-200 py-1.5 z-50 animate-slide-up">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-warm-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{(user?.name || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-warm-900">{user?.name}</p>
                          <p className="text-xs text-warm-500">{user?.email}</p>
                          <span className="badge-green mt-0.5 capitalize">{user?.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick links */}
                    <div className="px-3 py-2 border-b border-warm-100">
                      <p className="px-1 py-1 text-xs font-semibold text-warm-400 uppercase tracking-wider">Quick Access</p>
                      <Link
                        to="/farmer/my-listings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-warm-50 transition-colors group"
                      >
                        <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                          <Package className="h-3.5 w-3.5 text-primary-700" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-warm-900">My Listings</p>
                          <p className="text-xs text-warm-400">View active produce</p>
                        </div>
                      </Link>
                      <Link
                        to="/invoices"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-warm-50 transition-colors group"
                      >
                        <div className="w-7 h-7 bg-accent-100 rounded-lg flex items-center justify-center group-hover:bg-accent-200 transition-colors">
                          <Receipt className="h-3.5 w-3.5 text-accent-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-warm-900">Analytics & Invoices</p>
                          <p className="text-xs text-warm-400">Revenue, invoices & financial insights</p>
                        </div>
                      </Link>
                    </div>

                    {/* Account actions */}
                    <div className="px-2 py-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate('/profile') }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-700 hover:bg-warm-50 rounded-lg transition-colors"
                      >
                        <UserCircle className="h-4 w-4" />
                        Update Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                id="mobile-menu-btn"
                className="md:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-primary-700 animate-fade-in">
            <nav className="px-4 py-3 space-y-1">
              <div className="px-3 py-2.5 bg-white/10 rounded-lg mb-2">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-white/60">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-accent-400 text-white text-xs font-medium rounded-full capitalize">
                  {user?.role}
                </span>
              </div>

              {navigation.map(({ name, href, icon: Icon }) => (
                <Link
                  key={name}
                  to={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </Link>
              ))}

              <div className="pt-2 border-t border-white/10 space-y-1">
                <Link to="/farmer/my-listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <Package className="h-4 w-4" /> My Listings
                </Link>
                <Link to="/invoices" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <Receipt className="h-4 w-4" /> Analytics & Invoices
                </Link>
                <button onClick={() => { setMobileMenuOpen(false); navigate('/profile') }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <UserCircle className="h-4 w-4" /> Profile
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ── Page Help (floating 'i' button, always available) ─── */}
      <PageHelp />

      {/* ── AI Governance modal (one-time, per-account) ── */}
      {showModal && <AIGovernanceModal userId={userId} onDismiss={dismiss} />}

      {/* ── AI Assistant (floating, always-visible) ─── */}
      <AIAssistant />

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-primary-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-accent-400" />
              <span className="text-sm font-semibold text-white">KisanWise</span>
            </div>
            <p className="text-xs text-white/50 text-center">
              © 2026 KisanWise. Empowering farmers through AI-powered cooperative intelligence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
