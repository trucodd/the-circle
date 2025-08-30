import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from '../components/Header'

const UserProfile = () => {
  const { username } = useParams()
  const [userBio, setUserBio] = useState('')
  const [userEmail, setUserEmail] = useState('')
  
  useEffect(() => {
    // Get user bio from localStorage (set in profile settings)
    const savedBio = localStorage.getItem(`userBio_${username}`) || ''
    setUserBio(savedBio)
    
    // Get email from registered users
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    const userInfo = registeredUsers.find(u => u.name === username)
    if (userInfo) {
      setUserEmail(userInfo.email)
    }
  }, [username])

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            {username}'s Profile
          </h1>
          <p className="text-lg text-gray-400 font-normal">User information</p>
        </div>

        <div className="widget-card rounded-3xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gray-700 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4">
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-2xl font-bold text-white">{username}</h2>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <button 
                onClick={() => alert('Direct messaging feature coming soon!')}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-300 mb-6"
              >
                💬 Send Message
              </button>
            </div>
            
            {userBio && (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                <p className="text-gray-300 leading-relaxed">{userBio}</p>
              </div>
            )}
            
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Profile Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white">{username}</span>
                </div>
                {userEmail && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{userEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400">• Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UserProfile