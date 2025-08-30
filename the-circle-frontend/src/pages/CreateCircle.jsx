import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

const CreateCircle = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    circleName: '',
    circleDescription: '',
    circleId: `circle-${Math.random().toString(36).substr(2, 9)}`
  })
  const [selectedColor, setSelectedColor] = useState('#374151')
  const [selectedEmoji, setSelectedEmoji] = useState('https://api.iconify.design/mdi:earth.svg?color=white')
  const [uploadedImage, setUploadedImage] = useState(null)

  const colorOptions = [
    { color: '#4b5563', icon: 'https://api.iconify.design/mdi:heart.svg?color=white' },
    { color: '#374151', icon: 'https://api.iconify.design/mdi:waves.svg?color=white' },
    { color: '#1f2937', icon: 'https://api.iconify.design/mdi:crystal-ball.svg?color=white' },
    { color: '#475569', icon: 'https://api.iconify.design/mdi:fire.svg?color=white' },
    { color: '#52525b', icon: 'https://api.iconify.design/mdi:leaf.svg?color=white' }
  ]

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const selectColor = (color, iconUrl) => {
    setSelectedColor(color)
    setSelectedEmoji(iconUrl)
    setUploadedImage(null)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = function(e) {
        setUploadedImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateNewCircleId = () => {
    const newId = `circle-${Math.random().toString(36).substr(2, 9)}`
    setFormData({ ...formData, circleId: newId })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.circleName) {
      alert('Please enter a circle name')
      return
    }
    
    const circleData = {
      id: formData.circleId,
      name: formData.circleName,
      description: formData.circleDescription,
      language: 'multi',
      image: uploadedImage,
      color: uploadedImage ? null : selectedColor,
      emoji: uploadedImage ? null : selectedEmoji,
      createdAt: new Date().toISOString(),
      isOwner: true
    }
    
    let joinedRooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
    joinedRooms.push(circleData)
    localStorage.setItem('joinedRooms', JSON.stringify(joinedRooms))
    
    const userName = localStorage.getItem('userName') || 'User'
    navigate(`/chat/${formData.circleId}?username=${userName}&language=en`)
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Create Your Circle
          </h1>
          <p className="text-xl text-gray-300">Design your unique space for conversations</p>
        </div>

        <div className="widget-card rounded-3xl p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Circle Name */}
            <div>
              <label className="block text-white font-semibold mb-3">Circle Name</label>
              <input 
                type="text" 
                name="circleName"
                value={formData.circleName}
                onChange={handleInputChange}
                placeholder="Enter circle name" 
                required 
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-white font-semibold mb-3">Description</label>
              <textarea 
                name="circleDescription"
                value={formData.circleDescription}
                onChange={handleInputChange}
                placeholder="What's your circle about?" 
                rows="4" 
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-300 resize-none"
              />
            </div>

            {/* Circle Image/Color */}
            <div>
              <label className="block text-white font-semibold mb-6">Circle Image or Color</label>
              <div className="flex flex-col items-center space-y-6">
                {/* Image Preview */}
                <div 
                  onClick={() => document.getElementById('imageInput').click()}
                  className="w-32 h-32 rounded-3xl bg-gray-700 flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-300 border-4 border-gray-600 overflow-hidden"
                  style={{ backgroundColor: uploadedImage ? 'transparent' : selectedColor }}
                >
                  {uploadedImage ? (
                    <img src={uploadedImage} alt="Circle" className="w-full h-full object-cover" />
                  ) : (
                    <img src={selectedEmoji} alt="Circle" className="w-12 h-12" />
                  )}
                </div>
                
                <input 
                  type="file" 
                  id="imageInput" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
                
                <button 
                  type="button" 
                  onClick={() => document.getElementById('imageInput').click()}
                  className="px-6 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
                >
                  Upload Image
                </button>
                
                <p className="text-gray-400 text-center">Or choose a color below</p>
                
                {/* Color Picker */}
                <div className="grid grid-cols-5 gap-4">
                  {colorOptions.map((option, index) => (
                    <div 
                      key={index}
                      className={`color-option w-12 h-12 rounded-2xl cursor-pointer ${selectedColor === option.color && !uploadedImage ? 'selected' : ''}`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => selectColor(option.color, option.icon)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Circle ID */}
            <div>
              <label className="block text-white font-semibold mb-3">Circle ID (Auto-generated)</label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-gray-300 font-mono text-center text-lg">
                  {formData.circleId}
                </div>
                <button 
                  type="button"
                  onClick={generateNewCircleId}
                  className="px-4 py-3 rounded-xl bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300"
                  title="Generate new ID"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold text-lg hover:bg-gray-600 transition-all duration-300"
            >
              Create Circle
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default CreateCircle