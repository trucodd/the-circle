import { useNavigate } from 'react-router-dom'

const Header = ({ showAuth = false, showProfile = false, onLogin, onRegister, onLogout }) => {
  const navigate = useNavigate()
  
  const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User'
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    if (onLogout) onLogout()
    navigate('/')
  }

  const handleProfileClick = () => {
    navigate('/profile')
  }

  return (
    <header className="glass-effect sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-700 flex items-center justify-center">
              <img src="https://api.iconify.design/mdi:earth.svg?color=white" alt="Earth" className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white">The Circle</span>
          </div>
          
          {showAuth && !isLoggedIn && (
            <div className="flex space-x-3">
              <button 
                onClick={onLogin}
                className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
              >
                Login
              </button>
              <button 
                onClick={onRegister}
                className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300"
              >
                Sign Up
              </button>
            </div>
          )}
          
          {(showProfile || (showAuth && isLoggedIn)) && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={handleProfileClick}>
                <div className="w-10 h-10 rounded-2xl bg-gray-700 flex items-center justify-center font-bold text-white hover:bg-gray-600 transition-colors">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-200 font-medium hover:text-white transition-colors">
                  {userName}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          )}
          

        </div>
      </div>
    </header>
  )
}

export default Header