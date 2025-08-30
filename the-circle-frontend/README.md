# The Circle - React Frontend

A modern React frontend for The Circle chat application, built with Vite and Tailwind CSS.

## Features

- **Real-time Chat**: Text and voice messaging with Socket.IO
- **Multi-language Support**: Translation and voice dubbing
- **Responsive Design**: Works on desktop and mobile
- **Dark Theme**: Modern dark UI with glass effects
- **Voice Recording**: WebRTC-based voice messages
- **Circle Management**: Create and join chat circles

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Router** - Navigation

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- The Circle Flask backend running on port 5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_API_URL=http://localhost:5000
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx      # Navigation header
│   └── Modal.jsx       # Modal dialog
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Dashboard.jsx   # User dashboard
│   ├── CreateCircle.jsx # Circle creation
│   ├── ChatRoom.jsx    # Chat interface
│   ├── Profile.jsx     # User profile
│   └── UserProfile.jsx # Public profile
├── utils/              # Utilities
│   ├── api.js          # API client
│   └── socket.js       # Socket.IO client
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## API Integration

The frontend connects to the Flask backend through:

- **REST API**: User management, circle data
- **Socket.IO**: Real-time messaging, voice chat
- **WebRTC**: Voice recording and playback

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Features Overview

### Authentication
- Login/Register modals
- Local storage session management
- Protected routes

### Chat Interface
- Real-time text messaging
- Voice message recording
- Message translation
- Voice dubbing
- Typing indicators
- User presence

### Circle Management
- Create custom circles
- Join existing circles
- Circle customization (colors, images)
- Participant management

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive layouts
- Glass morphism effects

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

WebRTC features require HTTPS in production.