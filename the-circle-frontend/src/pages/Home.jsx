import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'

const Home = () => {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    language: 'en',
    roomId: '',
    loginEmail: '',
    loginPassword: '',
    registerName: '',
    registerEmail: '',
    registerPassword: ''
  })

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleLogin = () => {
    const { loginEmail, loginPassword } = formData
    
    if (!loginEmail || !loginPassword) {
      alert('Please fill in all fields')
      return
    }
    
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    const user = registeredUsers.find(u => u.email === loginEmail && u.password === loginPassword)
    
    if (!user) {
      alert('Invalid email or password')
      return
    }
    
    localStorage.setItem('userName', user.name)
    localStorage.setItem('userEmail', loginEmail)
    localStorage.setItem('isLoggedIn', 'true')
    
    setShowLoginModal(false)
    navigate('/dashboard')
  }

  const handleRegister = () => {
    const { registerName, registerEmail, registerPassword } = formData
    
    if (!registerName || !registerEmail || !registerPassword) {
      alert('Please fill in all fields')
      return
    }
    
    let registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
    if (registeredUsers.find(u => u.email === registerEmail)) {
      alert('User with this email already exists')
      return
    }
    
    registeredUsers.push({ name: registerName, email: registerEmail, password: registerPassword })
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers))
    
    localStorage.setItem('userName', registerName)
    localStorage.setItem('userEmail', registerEmail)
    localStorage.setItem('isLoggedIn', 'true')
    
    setShowRegisterModal(false)
    navigate('/dashboard')
  }

  const handleStartCircle = () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      navigate('/create-circle')
    } else {
      alert('Please login to create a circle. You can join existing circles without an account.')
    }
  }

  const handleJoinCircle = () => {
    const { username, language, roomId } = formData
    
    if (!username || !roomId) {
      alert('Please fill in all fields')
      return
    }
    
    if (localStorage.getItem('isLoggedIn') === 'true') {
      let joinedRooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
      const roomData = {
        id: roomId,
        name: `Circle ${roomId.split('-')[1]}`,
        language: language,
        joinedAt: new Date().toISOString(),
        color: ['#ff6b9d', '#64ffda', '#c471ed', '#ff8a80', '#81c784'][Math.floor(Math.random() * 5)]
      }
      
      if (!joinedRooms.find(room => room.id === roomId)) {
        joinedRooms.push(roomData)
        localStorage.setItem('joinedRooms', JSON.stringify(joinedRooms))
      }
    }
    
    navigate(`/chat/${roomId}?username=${username}&language=${language}`)
  }

  return (
    <div className="min-h-screen">
      <Header 
        showAuth={true}
        onLogin={() => setShowLoginModal(true)}
        onRegister={() => setShowRegisterModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="widget-card rounded-3xl p-12 mb-8">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Join a Circle
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-normal">
              People from anywhere. Thoughts in every language. One circle.
            </p>
          </div>
        </div>

        {/* Main Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Quick Join Card */}
          <div className="widget-card rounded-3xl p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-700 flex items-center justify-center">
                <img src="https://api.iconify.design/mdi:lightning-bolt.svg?color=white" alt="Lightning" className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Quick Join</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Your Name" 
                  required 
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
                />
              </div>
              <div>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
                >
                  <option value="en" className="bg-dark-card">English</option>
                  <option value="es" className="bg-dark-card">Spanish</option>
                  <option value="fr" className="bg-dark-card">French</option>
                  <option value="ja" className="bg-dark-card">Japanese</option>
                  <option value="hi" className="bg-dark-card">Hindi</option>
                </select>
              </div>
              <div>
                <input 
                  type="text" 
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleInputChange}
                  placeholder="Circle ID" 
                  required 
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-3 pt-4">
                <button 
                  onClick={handleJoinCircle}
                  className="w-full py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-all duration-300"
                >
                  Join Circle
                </button>
                <button 
                  onClick={handleStartCircle}
                  className="w-full py-3 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-500 transition-all duration-300"
                >
                  Start New Circle
                </button>
              </div>
            </div>
          </div>

          {/* Features Card */}
          <div className="widget-card rounded-3xl p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-700 flex items-center justify-center">
                <img src="https://api.iconify.design/mdi:star-outline.svg?color=white" alt="Star" className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Why The Circle?</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { icon: 'mdi:chat', text: 'Instant text chat' },
                { icon: 'mdi:microphone', text: 'Voice messaging' },
                { icon: 'mdi:lock', text: 'Secure & private conversations' },
                { icon: 'mdi:devices', text: 'Works on any device' },
                { icon: 'mdi:translate', text: 'Multi-language support' }
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-300">
                  <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center">
                    <img src={`https://api.iconify.design/${feature.icon}.svg?color=white`} alt={feature.text} className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <Modal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Login"
        titleColor="text-accent-cyan"
      >
        <div className="space-y-6">
          <input 
            type="email" 
            name="loginEmail"
            value={formData.loginEmail}
            onChange={handleInputChange}
            placeholder="Email" 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
          />
          <input 
            type="password" 
            name="loginPassword"
            value={formData.loginPassword}
            onChange={handleInputChange}
            placeholder="Password" 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
          />
          
          <button 
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Login
          </button>
          
          <p className="text-center text-gray-400">
            Don't have an account? 
            <button 
              onClick={() => {
                setShowLoginModal(false)
                setShowRegisterModal(true)
              }}
              className="text-accent-cyan hover:underline ml-1"
            >
              Sign up
            </button>
          </p>
        </div>
      </Modal>

      {/* Register Modal */}
      <Modal 
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Sign Up"
        titleColor="text-accent-pink"
      >
        <div className="space-y-6">
          <input 
            type="text" 
            name="registerName"
            value={formData.registerName}
            onChange={handleInputChange}
            placeholder="Full Name" 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-pink focus:ring-2 focus:ring-accent-pink/20 transition-all duration-300"
          />
          <input 
            type="email" 
            name="registerEmail"
            value={formData.registerEmail}
            onChange={handleInputChange}
            placeholder="Email" 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-pink focus:ring-2 focus:ring-accent-pink/20 transition-all duration-300"
          />
          <input 
            type="password" 
            name="registerPassword"
            value={formData.registerPassword}
            onChange={handleInputChange}
            placeholder="Password" 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-pink focus:ring-2 focus:ring-accent-pink/20 transition-all duration-300"
          />
          
          <button 
            onClick={handleRegister}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-pink to-accent-purple text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Sign Up
          </button>
          
          <p className="text-center text-gray-400">
            Already have an account? 
            <button 
              onClick={() => {
                setShowRegisterModal(false)
                setShowLoginModal(true)
              }}
              className="text-accent-cyan hover:underline ml-1"
            >
              Login
            </button>
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default Home