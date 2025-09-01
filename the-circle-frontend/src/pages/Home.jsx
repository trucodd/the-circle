import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'

const Home = () => {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  
  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      navigate('/dashboard')
    }
  }, [])
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
          <div className="widget-card rounded-3xl p-12 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 to-blue-500/5"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center mx-auto mb-6">
                <img src="https://api.iconify.design/mdi:earth.svg?color=white" alt="Earth" className="w-10 h-10" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
                Join a Circle
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-normal">
                People from anywhere. Thoughts in every language. One circle.
              </p>
            </div>
          </div>
        </div>

        {/* Main Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Quick Join Card */}
          <div className="widget-card rounded-3xl p-8 h-fit">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center mx-auto mb-4">
                <img src="https://api.iconify.design/mdi:lightning-bolt.svg?color=white" alt="Lightning" className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Quick Join</h2>
              <p className="text-gray-400 text-sm">Jump into a circle instantly</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your name" 
                  required 
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:bg-white/10 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:bg-white/10 transition-all duration-300"
                >
                  <option value="en" className="bg-gray-800 text-white">🇺🇸 English</option>
                  <option value="es" className="bg-gray-800 text-white">🇪🇸 Spanish</option>
                  <option value="fr" className="bg-gray-800 text-white">🇫🇷 French</option>
                  <option value="ja" className="bg-gray-800 text-white">🇯🇵 Japanese</option>
                  <option value="hi" className="bg-gray-800 text-white">🇮🇳 Hindi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Circle ID</label>
                <input 
                  type="text" 
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleInputChange}
                  placeholder="circle-abc123" 
                  required 
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:bg-white/10 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-3 pt-6">
                <button 
                  onClick={handleJoinCircle}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-bold hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg"
                >
                  Join Circle
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-900 text-gray-400">or</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleStartCircle}
                  className="w-full py-3 rounded-xl border border-gray-600 text-gray-300 font-semibold hover:bg-gray-800 hover:border-gray-500 transition-all duration-300"
                >
                  Start New Circle
                </button>
                <button 
                  onClick={() => {
                    const username = formData.username || 'Guest'
                    const language = formData.language || 'en'
                    navigate(`/chat/translationbot-${Date.now()}?username=${username}&language=${language}&botlang=es&bot=echo`)
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-cyan/20 to-blue-500/20 border border-accent-cyan/30 text-white font-semibold hover:from-accent-cyan/30 hover:to-blue-500/30 hover:border-accent-cyan/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <img src="https://api.iconify.design/mdi:robot.svg?color=white" alt="Bot" className="w-5 h-5" />
                  Chat with Translation Bot
                </button>
              </div>
            </div>
          </div>

          {/* Features Card */}
          <div className="widget-card rounded-3xl p-8 h-fit">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center mx-auto mb-4">
                <img src="https://api.iconify.design/mdi:star-outline.svg?color=white" alt="Star" className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Features</h2>
              <p className="text-gray-400 text-sm">Everything you need to connect</p>
            </div>
            
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-accent-cyan/20 to-blue-500/20 border border-accent-cyan/30">
              <div className="flex items-center gap-2 mb-2">
                <img src="https://api.iconify.design/mdi:robot.svg?color=white" alt="Bot" className="w-6 h-6" />
                <span className="text-white font-semibold">Try Translation Bot!</span>
              </div>
              <p className="text-sm text-gray-300">Chat with our translation bot that translates your messages, provides text-to-speech, and voice dubbing. No account needed!</p>
            </div>
            
            <div className="space-y-4">
              {[
                { icon: 'mdi:chat', text: 'Instant text chat' },
                { icon: 'mdi:microphone', text: 'Voice messaging' },
                { icon: 'mdi:robot', text: 'Translation bot with TTS & dubbing' },
                { icon: 'mdi:translate', text: 'Multi-language support' },
                { icon: 'mdi:volume-high', text: 'Voice dubbing & translation' },
                { icon: 'mdi:devices', text: 'Works on any device' }
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
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