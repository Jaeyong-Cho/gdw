#!/bin/bash

###
# @brief Start both server and UI in development mode
#
# This script starts the backend server and frontend UI concurrently.
# Both processes run in the foreground and can be stopped with Ctrl+C.
#
# @pre Node.js and npm must be installed
# @pre Dependencies must be installed in both server/ and ui/
# @post Both server and UI are running
###

set -e

echo "Starting Development Workflow Tracker..."
echo ""

# Check if dependencies are installed
if [ ! -d "server/node_modules" ]; then
  echo "Server dependencies not found. Installing..."
  cd server && npm install && cd ..
fi

if [ ! -d "ui/node_modules" ]; then
  echo "UI dependencies not found. Installing..."
  cd ui && npm install && cd ..
fi

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down server and UI..."
  kill 0
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start server in background
echo "Starting backend server on port 3001..."
cd server
npm start &
SERVER_PID=$!
cd ..

# Wait a bit for server to start
sleep 2

# Start UI in background
echo "Starting UI on port 5173..."
cd ui
npm run dev &
UI_PID=$!
cd ..

echo ""
echo "============================================"
echo "  Server running at: http://localhost:3001"
echo "  UI running at: http://localhost:5173"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both processes"
echo ""

# Wait for both processes
wait
