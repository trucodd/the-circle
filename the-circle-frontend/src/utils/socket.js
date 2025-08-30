import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const createSocket = () => {
  return io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    timeout: 20000,
    forceNew: false
  })
}

export default createSocket