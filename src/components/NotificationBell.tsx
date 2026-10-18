import { Bell, X, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiService } from '../services/api'

interface Notification {
  id: string
  type: 'procurement_created' | 'listing_created' | 'quote_received' | 'quote_updated' | 'awarded'
  title: string
  message: string
  link: string
  read: boolean
  createdAt: string
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 10 seconds (more frequent for testing)
    const interval = setInterval(loadNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      console.log('🔔 Loading notifications...');
      const response = await apiService.getNotifications()
      console.log('📊 Notifications loaded:', response.notifications?.length || 0);
      setNotifications(response.notifications || [])
    } catch (error: any) {
      // Silently fail if notifications endpoint doesn't exist yet (404)
      if (error?.response?.status !== 404) {
        console.error('Failed to load notifications:', error)
      } else {
        console.log('📭 Notifications endpoint not available (404)');
      }
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await apiService.markNotificationAsRead(id)
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      await apiService.markAllNotificationsAsRead()
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    try {
      await apiService.deleteNotification(id)
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await apiService.clearAllNotifications()
      setNotifications([])
    } catch (error) {
      console.error('Failed to clear all notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveNotificationLink = (link?: string) => {
    if (!link) return '/';
    const userStr = sessionStorage.getItem('user');
    let role = '';
    if (userStr) {
      try {
        role = JSON.parse(userStr).role;
      } catch (e) {
        // ignore
      }
    }

    let resolved = link;
    // Normalize any plural/singular mismatches
    resolved = resolved.replace('/procurement-requests/', '/procurement-request/');

    if (role === 'buyer') {
      if (resolved.startsWith('/farmer/listing/')) {
        resolved = resolved.replace('/farmer/listing/', '/buyer/farmer-listing/');
      } else if (resolved.startsWith('/farmer/procurement-request/')) {
        resolved = resolved.replace('/farmer/procurement-request/', '/buyer/procurement-request/');
      }
    } else if (role === 'farmer') {
      if (resolved.startsWith('/buyer/farmer-listing/')) {
        resolved = resolved.replace('/buyer/farmer-listing/', '/farmer/listing/');
      } else if (resolved.startsWith('/buyer/procurement-request/')) {
        resolved = resolved.replace('/buyer/procurement-request/', '/farmer/procurement-request/');
      }
    }

    return resolved;
  };

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-20 border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  disabled={loading}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative group ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Link
                        to={resolveNotificationLink(notification.link)}
                        onClick={() => {
                          markAsRead(notification.id)
                          setShowDropdown(false)
                        }}
                        className="block p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start pr-8">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition"
                        title="Delete notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell

