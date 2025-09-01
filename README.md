# The Circle 🌍

A real-time multilingual chat application that breaks language barriers through voice and text translation.

## Features

- **Real-time Chat**: Instant text and voice messaging
- **Voice Translation**: AI-powered voice dubbing using Murf API
- **Text Translation**: Google Translate integration for text messages
- **Multi-language Support**: English, Spanish, French, German, Japanese, Hindi
- **User Authentication**: Login/signup system with profile management
- **Circle Management**: Create and join chat circles
- **Translation Bot**: Translates text, provides text-to-speech, and voice dubbing in any supported language
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Python Flask, Socket.IO
- **Database**: SQLite
- **APIs**: Murf Dubbing API, Google Translate
- **Real-time**: WebSocket connections

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Murf API key (for voice dubbing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd the-circle
   ```

2. **Backend Setup**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   Create `.env` file:
   ```
   MURFDUB_API_KEY=your_murf_api_key_here
   ```

4. **Frontend Setup**
   ```bash
   cd the-circle-frontend
   npm install
   ```

### Running the Application

1. **Start Backend**
   ```bash
   python app.py
   ```

2. **Start Frontend** (in new terminal)
   ```bash
   cd the-circle-frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## Usage

1. **Sign up** or **Login** to create circles
2. **Join circles** without account (guest mode)
3. **Send voice messages** and get them dubbed in other languages
4. **Translate text messages** to your preferred language
5. **Chat with Translation Bot** - it translates your messages, speaks them aloud, and dubs your voice in any language you set

## API Integration

This application uses the **Murf Dubbing API** for high-quality voice translation and dubbing capabilities. The API provides natural-sounding voice synthesis in multiple languages.

---

🚀 **More features coming soon!**

*Built with ❤️ for global communication*