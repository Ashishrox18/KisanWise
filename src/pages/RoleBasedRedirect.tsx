import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const RoleBasedRedirect = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const userStr = sessionStorage.getItem('user')
    if (!userStr) {
      navigate('/login')
      return
    }

    try {
      const user = JSON.parse(userStr)
      const role = user.role

      // Redirect based on user role
      switch (role) {
        case 'farmer':
          navigate('/farmer')
          break
        case 'buyer':
          navigate('/buyer')
          break
        case 'admin':
          navigate('/admin')
          break
        default:
          navigate('/login')
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      navigate('/login')
    }
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}

export default RoleBasedRedirect

