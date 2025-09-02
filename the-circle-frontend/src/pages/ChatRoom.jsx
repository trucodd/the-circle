import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { createSocket } from '../utils/socket'
import Modal from '../components/Modal'

const ChatRoom = () => {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const username = searchParams.get('username') || 'Anonymous'
  const [userLanguage, setUserLanguage] = useState(searchParams.get('language') || 'en')
  const [botLanguage, setBotLanguage] = useState(searchParams.get('botlang') || 'es')
  const isBot = searchParams.get('bot') === 'echo'
  const circleColor = '#64ffda'
  const [showBotLangModal, setShowBotLangModal] = useState(false)
  
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [voiceMessages, setVoiceMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [participantCount, setParticipantCount] = useState(1)
  const [circleLanguage, setCircleLanguage] = useState(() => {
    const saved = localStorage.getItem(`circleLanguage_${roomId}`)
    return saved || userLanguage
  })
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [typingIndicator, setTypingIndicator] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [circleIdText, setCircleIdText] = useState('')
  const [circleName, setCircleName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [showCircleEditModal, setShowCircleEditModal] = useState(false)
  const [circleEditData, setCircleEditData] = useState({
    name: '',
    description: '',
    image: null,
    color: '#64ffda',
    emoji: '🌍'
  })
  
  const messagesAreaRef = useRef(null)
  const typingTimerRef = useRef(null)

  useEffect(() => {
    // Get circle info from localStorage
    if (!isBot) {
      const joinedRooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
      const currentRoom = joinedRooms.find(room => room.id === roomId)
      if (currentRoom) {
        setCircleName(currentRoom.name || `Circle ${roomId.split('-')[1] || roomId}`)
        setIsOwner(currentRoom.isOwner || false)
        setCircleEditData({
          name: currentRoom.name || '',
          description: currentRoom.description || '',
          image: currentRoom.image || null,
          color: currentRoom.color || '#64ffda',
          emoji: currentRoom.emoji || '🌍'
        })
      } else {
        setCircleName(`Circle ${roomId.split('-')[1] || roomId}`)
      }
    }
    
    const newSocket = createSocket()
    
    newSocket.on('connect', () => {
      console.log('Connected to server')
    })
    
    newSocket.on('connect_error', (error) => {
      console.error('Connection failed:', error)
      addStatusMessage('❌ Failed to connect to server')
    })
    
    setSocket(newSocket)

    // Join circle
    newSocket.emit('join_circle', {
      room_id: roomId,
      username: username,
      language: userLanguage,
      bot_language: isBot ? botLanguage : undefined
    })

    // Socket event handlers
    newSocket.on('user_joined', (data) => {
      setParticipantCount(data.users.length)
      addStatusMessage(`${data.username} joined the circle`)
    })

    newSocket.on('user_left', (data) => {
      setParticipantCount(data.users.length)
    })

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('voice_message', (data) => {
      setVoiceMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.message_id === data.message_id)
        if (exists) {
          return prev
        }
        return [...prev, data]
      })
    })

    newSocket.on('translated_audio', (data) => {
      updateVoiceMessageWithDub(data)
    })

    newSocket.on('user_typing', (data) => {
      if (data.typing) {
        setTypingIndicator(`${data.username} is typing...`)
      } else {
        setTypingIndicator('')
      }
    })

    newSocket.on('chat_history', (data) => {
      setMessages(data.messages)
    })

    newSocket.on('translated_text', (data) => {
      updateMessageWithTranslation(data)
    })

    newSocket.on('dubbing_error', (data) => {
      addStatusMessage(`❌ Translation failed: ${data.error}`)
      // Reset dub button on error
      const dubBtns = document.querySelectorAll('.dub-btn')
      dubBtns.forEach(btn => {
        if (btn.textContent.includes('Dubbing')) {
          // Reset based on speaker type
          const messageDiv = btn.closest('[data-message-id]')
          const isTranslationBotMessage = messageDiv && messageDiv.querySelector('.text-xs.font-semibold')?.textContent === 'Translation Bot'
          
          if (isTranslationBotMessage) {
            btn.innerHTML = '<img src="https://api.iconify.design/mdi:robot.svg?color=white" alt="Dub" class="w-3 h-3 inline"> Dub'
          } else {
            btn.innerHTML = '<img src="https://api.iconify.design/mdi:translate.svg?color=white" alt="Translate" class="w-3 h-3 inline"> Dub'
          }
          btn.disabled = false
          btn.classList.remove('opacity-50', 'cursor-not-allowed')
        }
      })
    })

    newSocket.on('dubbing_status', (data) => {
      if (data.speaker === 'EchoBot') {
        addStatusMessage(`🤖 ${data.message}`)
      }
    })

      return () => {
        newSocket.disconnect()
      }
    
    if (isBot) {
      setParticipantCount(2) // User + Bot
      addStatusMessage('🤖 Translation Bot joined the chat')
    }
  }, [roomId, username, userLanguage, isBot])

  useEffect(() => {
    scrollToBottom()
  }, [messages, voiceMessages])

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight
    }
  }

  const addStatusMessage = (text) => {
    const statusMessage = {
      id: `status_${Date.now()}`,
      type: 'status',
      message: text,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, statusMessage])
  }

  const sendMessage = () => {
    if (!messageInput.trim()) return
    
    const message = messageInput.trim()
    setMessageInput('')
    
    if (!socket) return
    
    socket.emit('send_message', { 
      message: message,
      language: circleLanguage
    })
    
    if (isTyping) {
      socket.emit('typing', { typing: false })
      setIsTyping(false)
    }
  }

  const handleTyping = () => {
    if (isBot) return // No typing indicator in bot mode
    if (!socket) return
    
    if (!isTyping) {
      setIsTyping(true)
      socket.emit('typing', { typing: true })
    }
    
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (isTyping) {
        socket.emit('typing', { typing: false })
        setIsTyping(false)
      }
    }, 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleVoiceRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        setMediaRecorder(recorder)
        
        const audioChunks = []
        recorder.ondataavailable = event => {
          audioChunks.push(event.data)
        }

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          
          const reader = new FileReader()
          reader.onload = function() {
            const audioData = reader.result.split(',')[1]
            const messageId = `voice_${Date.now()}`
            
            if (socket) {
              socket.emit('audio_data', {
                room_id: roomId,
                username: username,
                audio: audioData,
                source_language: circleLanguage
              })
            }
          }
          reader.readAsDataURL(audioBlob)
          
          stream.getTracks().forEach(track => track.stop())
        }

        recorder.start()
        setIsRecording(true)
        
      } catch (err) {
        alert('Microphone access required for voice messages')
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop()
        setIsRecording(false)
      }
    }
  }

  const playAudio = (audioId) => {
    const audio = document.getElementById(audioId)
    if (audio) {
      audio.volume = 0.8
      audio.play().catch(e => console.log('Audio play failed:', e))
    }
  }

  const requestDub = (messageId, audioData, speakerName, sourceLanguage) => {
    let targetLanguage
    
    if (isBot) {
      // EchoBot room: always dub to bot's language
      targetLanguage = botLanguage
    } else {
      // Regular circle: dub to user's language
      targetLanguage = userLanguage
    }
    
    if (targetLanguage === sourceLanguage) {
      alert('This message is already in the target language')
      return
    }
    
    // Show loading state on button
    const dubBtn = document.querySelector(`[data-message-id="${messageId}"] .dub-btn`)
    if (dubBtn) {
      dubBtn.innerHTML = '⏳ Dubbing...'
      dubBtn.disabled = true
      dubBtn.classList.add('opacity-50', 'cursor-not-allowed')
    }
    
    if (socket) {
      socket.emit('request_dub', {
        message_id: messageId,
        audio_data: audioData,
        speaker_name: speakerName,
        source_language: sourceLanguage,
        target_language: targetLanguage
      })
    } else {
      addStatusMessage('Dubbing not available in demo mode')
      if (dubBtn) {
        dubBtn.innerHTML = '<img src="https://api.iconify.design/mdi:translate.svg?color=white" alt="Translate" class="w-3 h-3 inline"> Dub'
        dubBtn.disabled = false
        dubBtn.classList.remove('opacity-50', 'cursor-not-allowed')
      }
    }
  }

  const speakText = (text, language) => {
    if ('speechSynthesis' in window) {
      try {
        // Stop any ongoing speech
        speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : language === 'de' ? 'de-DE' : language === 'ja' ? 'ja-JP' : language === 'hi' ? 'hi-IN' : 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 0.8
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event)
        }
        
        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Text-to-speech failed:', error)
        alert('Text-to-speech is not available in your browser')
      }
    } else {
      alert('Text-to-speech is not supported in your browser')
    }
  }

  const translateMessage = async (messageId, text, sourceLanguage) => {
    if (isBot) {
      // Bot mode - translate to user's preferred language
      try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${userLanguage}`)
        const data = await response.json()
        
        const translatedText = data.responseData?.translatedText || `[Translation unavailable] ${text}`
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, translated_text: translatedText }
              : msg
          )
        )
      } catch (error) {
        console.error('Translation failed:', error)
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, translated_text: `[Translation failed] ${text}` }
              : msg
          )
        )
      }
    } else {
      if (socket) {
        socket.emit('translate_text', {
          message_id: messageId,
          text: text,
          source_language: sourceLanguage
        })
      }
    }
  }

  const updateVoiceMessageWithDub = (data) => {
    // Store dubbed audio with language key for persistence
    const dubKey = `${data.message_id}_${data.target_language}`
    
    // Update voice message with dubbed audio
    setVoiceMessages(prev => 
      prev.map(msg => {
        if (msg.message_id === data.message_id) {
          const updatedMsg = { ...msg }
          if (!updatedMsg.dubbed_versions) updatedMsg.dubbed_versions = {}
          updatedMsg.dubbed_versions[data.target_language] = data.audio_data
          return updatedMsg
        }
        return msg
      })
    )
    
    // Update button based on speaker and target language
    const dubBtn = document.querySelector(`[data-message-id="${data.message_id}"] .dub-btn`)
    if (dubBtn) {
      // Check if this is the expected target language for this user/context
      const expectedTargetLang = isBot ? botLanguage : userLanguage
      
      if (data.target_language === expectedTargetLang) {
        // For Translation Bot messages, show "Dubbed" when complete
        const buttonText = data.speaker_name === 'Translation Bot' ? 'Dubbed' : 'Play'
        const iconName = data.speaker_name === 'Translation Bot' ? 'robot' : 'play'
        
        dubBtn.innerHTML = `<img src="https://api.iconify.design/mdi:${iconName}.svg?color=white" alt="${buttonText}" class="w-3 h-3 inline"> ${buttonText}`
        dubBtn.disabled = false
        dubBtn.classList.remove('opacity-50', 'cursor-not-allowed')
        dubBtn.onclick = () => playAudio(`dubbed_${dubKey}`)
      }
    }
    
    // Add dubbed audio element with language-specific ID
    const messageDiv = document.querySelector(`[data-message-id="${data.message_id}"]`)
    if (messageDiv && !document.getElementById(`dubbed_${dubKey}`)) {
      const dubbedAudio = document.createElement('audio')
      dubbedAudio.id = `dubbed_${dubKey}`
      dubbedAudio.style.display = 'none'
      dubbedAudio.innerHTML = `<source src="data:audio/wav;base64,${data.audio_data}" type="audio/wav">`
      messageDiv.appendChild(dubbedAudio)
    }
  }

  const updateMessageWithTranslation = (data) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.message_id 
          ? { ...msg, translated_text: data.translated_text }
          : msg
      )
    )
  }

  const handleCircleLanguageChange = (e) => {
    const language = e.target.value
    setCircleLanguage(language)
    
    // Save to localStorage for this specific circle
    localStorage.setItem(`circleLanguage_${roomId}`, language)
    
    if (socket) {
      socket.emit('set_circle_language', { language })
    }
  }

  const leaveCircle = () => {
    if (confirm('Are you sure you want to leave this circle?')) {
      if (socket) {
        socket.emit('leave_circle')
      }
      
      let joinedRooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
      joinedRooms = joinedRooms.filter(room => room.id !== roomId)
      localStorage.setItem('joinedRooms', JSON.stringify(joinedRooms))
      
      navigate('/dashboard')
    }
  }

  const copyCircleId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCircleIdText('Copied!')
      setTimeout(() => {
        setCircleIdText('')
      }, 1000)
    }).catch(() => {
      alert('Circle ID: ' + roomId)
    })
  }

  const renderTextMessage = (message) => {
    const isOwn = message.username === username
    const needsTranslation = !isOwn && message.language && message.language !== userLanguage
    const isBotMessage = isBot && message.username === 'Translation Bot'
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {!isOwn && (
            <div 
              onClick={() => {
                if (isBot && message.username === 'Translation Bot') {
                  setShowBotLangModal(true)
                } else {
                  navigate(`/user/${message.username}`)
                }
              }}
              className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-pointer hover:bg-gray-500 transition-colors"
              title={isBot && message.username === 'Translation Bot' ? 'Change bot language' : `View ${message.username}'s profile`}
            >
              {message.username === 'Translation Bot' ? '🤖' : message.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`message-bubble rounded-2xl px-4 py-2 ${isOwn ? 'own' : ''}`}>
            {!isOwn && (
              <div className="text-xs font-semibold text-gray-300 mb-1">{message.username}</div>
            )}
            <div className="text-white">{message.message}</div>

            {message.translated_text && (
              <div className="text-blue-200 mt-2 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="text-xs text-blue-300 mb-1">🌍 Translated:</div>
                <div>{message.translated_text}</div>
              </div>
            )}
            {needsTranslation && !message.translated_text && !isBotMessage && (
              <div className="mt-2 flex items-center gap-2">
                <button 
                  onClick={() => translateMessage(message.id, message.message, message.language)}
                  className="text-xs px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 flex items-center gap-1"
                >
                  <img src="https://api.iconify.design/mdi:translate.svg?color=white" alt="Translate" className="w-3 h-3" />
                  Translate
                </button>
              </div>
            )}
            {isBotMessage && (
              <div className="mt-2 flex items-center gap-2">
                <button 
                  onClick={() => speakText(message.message, message.language)}
                  className="text-xs px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all duration-300 flex items-center gap-1"
                >
                  <img src="https://api.iconify.design/mdi:volume-high.svg?color=white" alt="Speak" className="w-3 h-3" />
                  Listen
                </button>
              </div>
            )}

            <div className="text-xs text-gray-400 mt-1">{time}</div>
          </div>
          {isOwn && (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderVoiceMessage = (data) => {
    const isOwn = data.speaker === username
    const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    const audioId = `audio_${data.message_id}`
    const dubbedAudioId = `dubbed_${data.message_id}`
    
    const langName = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 
      'ja': 'Japanese', 'hi': 'Hindi'
    }[data.language] || data.language.toUpperCase()
    
    return (
      <div key={data.message_id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`} data-message-id={data.message_id}>
        <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {!isOwn && (
            <div 
              onClick={() => {
                if (isBot && data.speaker === 'Translation Bot') {
                  setShowBotLangModal(true)
                } else {
                  navigate(`/user/${data.speaker}`)
                }
              }}
              className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-pointer hover:bg-gray-500 transition-colors"
              title={isBot && data.speaker === 'Translation Bot' ? 'Change bot language' : `View ${data.speaker}'s profile`}
            >
              {data.speaker === 'Translation Bot' ? '🤖' : data.speaker.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`message-bubble voice rounded-2xl px-4 py-3 ${isOwn ? 'own' : ''}`}>
            {!isOwn && (
              <div className="text-xs font-semibold text-gray-300 mb-2">{data.speaker}</div>
            )}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => playAudio(audioId)}
                className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center text-white transition-all duration-300"
              >
                <img src="https://api.iconify.design/mdi:play.svg?color=white" alt="Play" className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 flex items-center gap-1">
                    🎤 {langName}
                  </span>
                  {!isOwn && (() => {
                    if (data.speaker === 'Translation Bot') {
                      // Translation Bot message - dub user's voice to bot's language
                      const targetLang = botLanguage
                      const hasCurrentLanguageDub = data.dubbed_versions && data.dubbed_versions[targetLang]
                      const dubKey = `${data.message_id}_${targetLang}`
                      
                      return (
                        <button 
                          onClick={() => {
                            if (hasCurrentLanguageDub) {
                              playAudio(`dubbed_${dubKey}`)
                            } else {
                              // For Translation Bot, use its audio data (which is the user's voice) and user's language as source
                              requestDub(data.message_id, data.audio_data, data.speaker, userLanguage)
                            }
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-purple-900/20 border border-purple-500/30 text-purple-200 hover:text-purple-100 transition-all duration-300 flex items-center gap-1 dub-btn"
                        >
                          <img src={`https://api.iconify.design/mdi:${hasCurrentLanguageDub ? 'play' : 'robot'}.svg?color=white`} alt={hasCurrentLanguageDub ? 'Play' : 'Dub'} className="w-3 h-3" />
                          {hasCurrentLanguageDub ? 'Dubbed' : 'Dub'}
                        </button>
                      )
                    } else {
                      // Regular user message - dub to user's language
                      const targetLang = isBot ? botLanguage : userLanguage
                      const hasCurrentLanguageDub = data.dubbed_versions && data.dubbed_versions[targetLang]
                      const dubKey = `${data.message_id}_${targetLang}`
                      
                      return (
                        <button 
                          onClick={() => {
                            if (hasCurrentLanguageDub) {
                              playAudio(`dubbed_${dubKey}`)
                            } else {
                              requestDub(data.message_id, data.audio_data, data.speaker, data.language)
                            }
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-900/20 border border-blue-500/30 text-blue-200 hover:text-blue-100 transition-all duration-300 flex items-center gap-1 dub-btn"
                        >
                          <img src={`https://api.iconify.design/mdi:${hasCurrentLanguageDub ? 'play' : 'translate'}.svg?color=white`} alt={hasCurrentLanguageDub ? 'Play' : 'Translate'} className="w-3 h-3" />
                          {hasCurrentLanguageDub ? 'Play' : 'Dub'}
                        </button>
                      )
                    }
                  })()}
                  
                  {/* Add dubbed audio elements for all languages */}
                  {data.dubbed_versions && Object.entries(data.dubbed_versions).map(([lang, audioData]) => {
                    const dubKey = `${data.message_id}_${lang}`
                    return (
                      <audio key={dubKey} id={`dubbed_${dubKey}`} style={{ display: 'none' }}>
                        <source src={`data:audio/wav;base64,${audioData}`} type="audio/wav" />
                      </audio>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400">{time}</div>
            <audio id={audioId} style={{ display: 'none' }}>
              <source src={`data:audio/webm;base64,${data.audio_data}`} type="audio/webm" />
              <source src={`data:audio/wav;base64,${data.audio_data}`} type="audio/wav" />
            </audio>
            {data.dubbed_audio && (
              <audio id={dubbedAudioId} style={{ display: 'none' }}>
                <source src={`data:audio/wav;base64,${data.dubbed_audio}`} type="audio/wav" />
              </audio>
            )}
          </div>
          {isOwn && (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStatusMessage = (message) => (
    <div key={message.id} className="text-center py-2">
      <div className="inline-block px-4 py-2 rounded-2xl bg-white/10 text-gray-400 text-sm">
        {message.message}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="glass-effect px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className={`w-12 h-12 rounded-2xl bg-gray-700 flex items-center justify-center text-xl overflow-hidden ${isBot || isOwner ? 'cursor-pointer hover:bg-gray-600 transition-colors' : ''}`}
              onClick={() => {
                if (isBot) {
                  setShowBotLangModal(true)
                } else if (isOwner) {
                  setShowCircleEditModal(true)
                }
              }}
              title={isBot ? 'Change bot language' : isOwner ? 'Edit circle details' : undefined}
            >
              {isBot ? '🤖' : (circleEditData.image ? (
                <img src={circleEditData.image} alt="Circle" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <img src={circleEditData.emoji} alt="Circle" className="w-6 h-6" />
              ))}
            </div>
            <div>
              <h2 
                className={`text-lg font-bold text-white ${isOwner && !isBot ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''}`}
                onClick={() => {
                  if (isOwner && !isBot) {
                    setShowCircleEditModal(true)
                  }
                }}
                title={isOwner && !isBot ? 'Click to edit circle details' : undefined}
              >
                {isBot ? 'Translation Bot' : circleName}
              </h2>
              <p className="text-sm text-gray-400 font-medium">
                {isBot ? 'Translation Assistant' : (
                  <>
                    <span 
                      onClick={copyCircleId}
                      className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors"
                      title="Tap to copy Circle ID"
                    >
                      {circleIdText || roomId}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{participantCount} participants</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              value={userLanguage}
              onChange={(e) => {
                const newLang = e.target.value
                setUserLanguage(newLang)
                setCircleLanguage(newLang)
                // Update URL
                const newUrl = new URL(window.location)
                newUrl.searchParams.set('language', newLang)
                window.history.replaceState({}, '', newUrl)
              }}
              className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:border-gray-500 transition-all"
              title="Your Language Preference"
            >
              <option value="en" className="bg-gray-800 text-white">🇺🇸 English</option>
              <option value="es" className="bg-gray-800 text-white">🇪🇸 Spanish</option>
              <option value="fr" className="bg-gray-800 text-white">🇫🇷 French</option>
              <option value="de" className="bg-gray-800 text-white">🇩🇪 German</option>
              <option value="ja" className="bg-gray-800 text-white">🇯🇵 Japanese</option>
              <option value="hi" className="bg-gray-800 text-white">🇮🇳 Hindi</option>
            </select>
            
            <button 
              onClick={leaveCircle}
              className="sm:hidden w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600/30 flex items-center justify-center text-red-400 transition-all duration-300"
              title="Leave Circle"
            >
              <img src="https://api.iconify.design/mdi:exit-to-app.svg?color=red" alt="Leave" className="w-4 h-4" />
            </button>
            <button 
              onClick={leaveCircle}
              className="hidden sm:block px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all duration-300"
            >
              Leave
            </button>
            <button 
              onClick={() => {
                if (localStorage.getItem('isLoggedIn') === 'true') {
                  navigate('/dashboard')
                } else {
                  navigate('/')
                }
              }}
              className="hidden sm:block px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all duration-300"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>
      
      {/* Messages Area */}
      <div ref={messagesAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center py-4">
          <div className="inline-block px-6 py-3 rounded-2xl bg-white/10 text-gray-300 text-sm">
            {isBot ? (
              <>
                🤖 Chat with Translation Bot! It translates your messages and provides voice dubbing.
                <br />
                <span className="text-xs text-gray-400 mt-1 inline-block">
                  Bot Language: {{
                    'en': '🇺🇸 English',
                    'es': '🇪🇸 Spanish', 
                    'fr': '🇫🇷 French',
                    'de': '🇩🇪 German',
                    'ja': '🇯🇵 Japanese',
                    'hi': '🇮🇳 Hindi'
                  }[botLanguage] || botLanguage.toUpperCase()}
                </span>
              </>
            ) : 'Welcome to the circle! Start chatting with voice or text.'}
          </div>
        </div>
        
        {[...messages, ...voiceMessages]
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map(message => {
            if (message.type === 'status') return renderStatusMessage(message)
            if (message.message_id) return renderVoiceMessage(message)
            return renderTextMessage(message)
          })}
      </div>

      {/* Typing Indicator */}
      {!isBot && (
        <div className="px-4 py-2 text-sm text-gray-400 italic min-h-[2rem]">
          {typingIndicator}
        </div>
      )}

      {/* Input Area */}
      <div className="glass-effect p-4 border-t border-white/10">
        <div className="flex items-end space-x-3 bg-white/10 rounded-3xl p-2">
          <textarea 
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows="1"
            className="flex-1 bg-transparent border-none text-white placeholder-gray-400 resize-none outline-none px-4 py-2 max-h-32"
          />
          
          <div className="flex space-x-2">
            <button 
              onClick={toggleVoiceRecording}
              className={`w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-all duration-300 ${isRecording ? 'pulse' : ''}`}
            >
              <img 
                src={`https://api.iconify.design/mdi:${isRecording ? 'stop' : 'microphone'}.svg?color=white`} 
                alt={isRecording ? 'Stop' : 'Microphone'} 
                className="w-5 h-5" 
              />
            </button>
            <button 
              onClick={sendMessage}
              className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-all duration-300"
            >
              ➤
            </button>
            <button 
              onClick={() => {
                if (localStorage.getItem('isLoggedIn') === 'true') {
                  navigate('/dashboard')
                } else {
                  navigate('/')
                }
              }}
              className="sm:hidden w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-all duration-300"
              title="Back to Dashboard"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Bot Language Modal */}
      {isBot && (
        <Modal 
          isOpen={showBotLangModal}
          onClose={() => setShowBotLangModal(false)}
          title="Change Bot Language"
          titleColor="text-accent-cyan"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bot's Language</label>
              <select 
                value={botLanguage}
                onChange={(e) => setBotLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
              >
                <option value="en" className="bg-gray-800 text-white">🇺🇸 English</option>
                <option value="es" className="bg-gray-800 text-white">🇪🇸 Spanish</option>
                <option value="fr" className="bg-gray-800 text-white">🇫🇷 French</option>
                <option value="de" className="bg-gray-800 text-white">🇩🇪 German</option>
                <option value="ja" className="bg-gray-800 text-white">🇯🇵 Japanese</option>
                <option value="hi" className="bg-gray-800 text-white">🇮🇳 Hindi</option>
              </select>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowBotLangModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-500 text-gray-300 hover:bg-gray-500/20 transition-all duration-300"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowBotLangModal(false)
                  addStatusMessage(`🤖 Bot language changed to ${botLanguage.toUpperCase()}`)
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Update
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Circle Edit Modal */}
      {isOwner && (
        <Modal 
          isOpen={showCircleEditModal}
          onClose={() => setShowCircleEditModal(false)}
          title="Edit Circle"
          titleColor="text-accent-cyan"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Circle Name</label>
              <input 
                type="text" 
                value={circleEditData.name}
                onChange={(e) => setCircleEditData({...circleEditData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300"
                placeholder="Enter circle name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea 
                value={circleEditData.description}
                onChange={(e) => setCircleEditData({...circleEditData, description: e.target.value})}
                rows="3"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all duration-300 resize-none"
                placeholder="What's your circle about?"
              />
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowCircleEditModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-500 text-gray-300 hover:bg-gray-500/20 transition-all duration-300"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    // Update backend
                    await fetch(`http://localhost:5000/api/circles/${roomId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: circleEditData.name,
                        description: circleEditData.description,
                        image: circleEditData.image,
                        color: circleEditData.color,
                        emoji: circleEditData.emoji
                      })
                    })
                    
                    // Update localStorage
                    let joinedRooms = JSON.parse(localStorage.getItem('joinedRooms') || '[]')
                    joinedRooms = joinedRooms.map(room => 
                      room.id === roomId 
                        ? { ...room, name: circleEditData.name, description: circleEditData.description }
                        : room
                    )
                    localStorage.setItem('joinedRooms', JSON.stringify(joinedRooms))
                    
                    // Update UI
                    setCircleName(circleEditData.name)
                    setShowCircleEditModal(false)
                    addStatusMessage('✅ Circle updated successfully')
                  } catch (error) {
                    console.error('Error updating circle:', error)
                    addStatusMessage('❌ Failed to update circle')
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Update
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ChatRoom