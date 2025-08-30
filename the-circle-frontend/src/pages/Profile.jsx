import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

const Profile = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    language: 'en'
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    const username = localStorage.getItem('userName') || ''
    const email = localStorage.getItem('userEmail') || ''
    const bio = localStorage.getItem('userBio') || ''
    const language = localStorage.getItem('userLanguage') || 'en'
    
    setFormData({ username, email, bio, language })
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.username) {
      alert('Username is required')
      return
    }
    
    localStorage.setItem('userName', formData.username)
    localStorage.setItem('userEmail', formData.email)
    localStorage.setItem('userBio', formData.bio)
    localStorage.setItem('userLanguage', formData.language)
    
    alert('Profile updated successfully!')
  }

  const editProfilePic = () => {
    alert('Profile picture editing will be available soon!')
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all duration-300"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Your Profile
          </h1>
          <p className="text-lg text-gray-400 font-normal">Manage your account information</p>
        </div>

        <div className="widget-card rounded-3xl p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gray-700 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4">
                {formData.username ? formData.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <button 
                type="button" 
                onClick={editProfilePic}
                className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
              >
                Change Picture
              </button>
            </div>

            {/* Username */}
            <div>
              <label className="block text-white font-semibold mb-3">Username</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username" 
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-white font-semibold mb-3">Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email" 
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-white font-semibold mb-3">Bio</label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell others about yourself..." 
                rows="4" 
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300 resize-none"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-white font-semibold mb-3">Preferred Language</label>
              <select 
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300"
              >
                <option value="en" className="bg-gray-800">English</option>
                <option value="es" className="bg-gray-800">Spanish</option>
                <option value="fr" className="bg-gray-800">French</option>
                <option value="ja" className="bg-gray-800">Japanese</option>
                <option value="hi" className="bg-gray-800">Hindi</option>
              </select>
            </div>

            {/* Save Button */}
            <button 
              type="submit"
              className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold text-lg hover:bg-gray-600 transition-all duration-300"
            >
              Save Changes
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default Profile