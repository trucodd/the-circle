#!/bin/bash

echo "🚀 Starting The Circle React Frontend..."
echo "📍 Frontend will run on: http://localhost:3000"
echo "🔗 Backend should be running on: http://localhost:5000"
echo ""

# Check if backend is running
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend not detected on port 5000"
    echo "   Make sure to start the Flask backend first:"
    echo "   cd .. && python app.py"
    echo ""
fi

# Start the React development server
npm run dev