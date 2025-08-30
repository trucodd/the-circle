import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import CreateCircle from './pages/CreateCircle'
import ChatRoom from './pages/ChatRoom'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'

function App() {
  return (
    <div className="bg-black min-h-screen text-gray-100 font-sans">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-circle" element={<CreateCircle />} />
        <Route path="/chat/:roomId" element={<ChatRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:username" element={<UserProfile />} />
      </Routes>
    </div>
  )
}

export default App