import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'

const Dashboard = () => {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [circleIdInput, setCircleIdInput] = useState('')
  const [joinedRooms, setJoinedRooms] = useState([])

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      navigate('/')
      return
    }
    loadRooms()
  }, [navigate])

  const loadRooms = async () => {
    const rooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
    
    // Update circle info for non-owner circles
    const updatedRooms = await Promise.all(rooms.map(async (room) => {
      if (!room.isOwner && !room.isDM && room.id.startsWith('circle-')) {
        try {
          const response = await fetch(`http://localhost:5000/api/circles/${room.id}`)
          const circleInfo = await response.json()
          return {
            ...room,
            name: circleInfo.name,
            description: circleInfo.description,
            image: circleInfo.image,
            color: circleInfo.color,
            emoji: circleInfo.emoji
          }
        } catch (error) {
          console.error('Error fetching circle info:', error)
          return room
        }
      }
      return room
    }))
    
    // Update localStorage with new info
    localStorage.setItem('joinedRooms', JSON.stringify(updatedRooms))
    setJoinedRooms(updatedRooms)
  }

  const handleJoinCircle = async () => {
    if (!circleIdInput.trim()) {
      alert('Please enter a Circle ID')
      return
    }
    
    const userName = localStorage.getItem('userName') || 'User'
    const userLanguage = 'en'
    
    let rooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
    const existingRoom = rooms.find(room => room.id === circleIdInput)
    
    if (!existingRoom) {
      try {
        // Fetch circle info from backend
        const response = await fetch(`http://localhost:5000/api/circles/${circleIdInput}`)
        const circleInfo = await response.json()
        
        const newRoom = {
          id: circleIdInput,
          name: circleInfo.name,
          description: circleInfo.description,
          language: userLanguage,
          image: circleInfo.image,
          color: circleInfo.color,
          emoji: circleInfo.emoji,
          joinedAt: Date.now(),
          isOwner: false
        }
        rooms.push(newRoom)
        localStorage.setItem('joinedRooms', JSON.stringify(rooms))
        setJoinedRooms(rooms)
      } catch (error) {
        console.error('Error fetching circle info:', error)
        // Fallback to default values if API fails
        const newRoom = {
          id: circleIdInput,
          name: `Circle ${circleIdInput.split('-')[1]}`,
          description: '',
          language: userLanguage,
          color: '#64ffda',
          emoji: '🌍',
          joinedAt: Date.now(),
          isOwner: false
        }
        rooms.push(newRoom)
        localStorage.setItem('joinedRooms', JSON.stringify(rooms))
        setJoinedRooms(rooms)
      }
    }
    
    setShowJoinModal(false)
    setCircleIdInput('')
    navigate(`/chat/${circleIdInput}?username=${userName}&language=${userLanguage}`)
  }

  const rejoinRoom = (roomId, language) => {
    const username = localStorage.getItem('userName') || 'User'
    // Fix old 'multi' language data
    const validLanguage = (language === 'multi' || !language) ? 'en' : language
    navigate(`/chat/${roomId}?username=${username}&language=${validLanguage}`)
  }

  const createRoomCard = (room, index) => {
    const date = new Date(room.joinedAt || Date.now())
    const joinedDate = date.toLocaleDateString()
    
    const widgetContent = room.image 
      ? <img src={room.image} alt={room.name} className="w-full h-full object-cover rounded-2xl" />
      : room.isDM 
        ? <img src="https://api.iconify.design/mdi:message.svg?color=white" alt="DM" className="w-6 h-6 md:w-8 md:h-8" />
        : <img src="https://api.iconify.design/mdi:earth.svg?color=white" alt="Circle" className="w-6 h-6 md:w-8 md:h-8" />

    return (
      <div 
        key={room.id}
        className="widget-card rounded-3xl p-3 md:p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group aspect-square md:aspect-auto relative"
        onClick={() => rejoinRoom(room.id, room.language)}
      >
        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          {room.isOwner && (
            <div className="absolute top-2 right-2">
              <img src="https://api.iconify.design/mdi:crown.svg?color=gold" alt="Owner" className="w-4 h-4" />
            </div>
          )}
          {room.isDM && (
            <div className="absolute top-2 left-2">
              <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">DM</span>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl circle-widget flex items-center justify-center mb-3 mx-auto">
            {widgetContent}
          </div>
          <div className="flex-1 text-center">
            <h3 className="text-sm font-bold text-white mb-1 leading-tight">{room.name}</h3>
            {room.description && !room.isDM && (
              <p className="text-xs text-gray-400 line-clamp-2 leading-tight">{room.description}</p>
            )}
          </div>
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 rounded-2xl circle-widget flex items-center justify-center flex-shrink-0">
              {widgetContent}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{room.name}</h3>
              {!room.isDM && <p className="text-sm text-gray-400 font-mono">{room.id}</p>}
            </div>
          </div>
          
          {room.description && !room.isDM && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">{room.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {room.isDM ? (
              <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">Direct Message</span>
            ) : (
              <span className="px-2 py-1 rounded-lg bg-white/10 text-gray-300">{room.language.toUpperCase()}</span>
            )}
            <span className="px-2 py-1 rounded-lg bg-white/10 text-gray-300">{joinedDate}</span>
            {room.isOwner && (
              <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400">Owner</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const circles = joinedRooms.filter(room => !room.isDM)
  const dms = joinedRooms.filter(room => room.isDM)

  return (
    <div className="min-h-screen">
      <Header showProfile={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Your Dashboard
          </h1>
          <p className="text-lg text-gray-400 font-normal">Manage your circles and connections</p>
        </div>

        {/* Direct Messages Section */}
        {dms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Direct Messages</h2>
            <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-8">
              {dms.map((room, index) => createRoomCard(room, index))}
            </div>
          </div>
        )}

        {/* Bot Chat Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Chat with Bot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div 
              className="widget-card rounded-3xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              onClick={() => {
                const username = localStorage.getItem('userName') || 'User'
                navigate(`/chat/translationbot-${Date.now()}?username=${username}&language=en&botlang=es&bot=echo`)
              }}
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center flex-shrink-0">
                  <img src="https://api.iconify.design/mdi:robot.svg?color=white" alt="Bot" className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1">Translation Bot</h3>
                  <p className="text-sm text-gray-400">Chat with Translation Bot</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">Chat with Translation Bot and experience translation features. It translates your messages and provides voice dubbing.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-accent-cyan/20 text-cyan-400">Translation</span>
                <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">Voice Dubbing</span>
                <span className="px-2 py-1 rounded-lg bg-gray-500/20 text-gray-400">TTS & Dubbing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circles Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Your Circles</h2>
            <div className="flex space-x-3">
              <button 
                onClick={() => navigate('/create-circle')}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Create Circle
              </button>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-2 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200 font-bold"
              >
                Join Circle
              </button>
            </div>
          </div>

          {circles.length === 0 ? (
            <div className="text-center py-16">
              <div className="widget-card rounded-3xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mx-auto mb-6">
                  <img src="https://api.iconify.design/mdi:earth.svg?color=white" alt="Earth" className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-4">No circles joined yet</h3>
                <p className="text-gray-400 mb-6">Start by joining or creating your first circle!</p>
                <button 
                  onClick={() => setShowJoinModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Join Circle
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {circles.map((room, index) => createRoomCard(room, index))}
            </div>
          )}
        </div>
      </main>



      {/* Join Circle Modal */}
      <Modal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Circle"
        titleColor="text-accent-cyan"
      >
        <input 
          type="text" 
          value={circleIdInput}
          onChange={(e) => setCircleIdInput(e.target.value)}
          placeholder="Enter Circle ID (e.g., circle-abc123)" 
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300 mb-6"
          onKeyPress={(e) => e.key === 'Enter' && handleJoinCircle()}
        />
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowJoinModal(false)}
            className="flex-1 py-3 rounded-xl border border-gray-500 text-gray-300 hover:bg-gray-500/20 transition-all duration-300"
          >
            Cancel
          </button>
          <button 
            onClick={handleJoinCircle}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Join
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default Dashboard