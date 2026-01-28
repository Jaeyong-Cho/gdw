@echo off
REM @brief Start both server and UI in development mode (Windows)
REM 
REM This script starts the backend server and frontend UI concurrently.
REM Both processes run and can be stopped with Ctrl+C.
REM
REM @pre Node.js and npm must be installed
REM @pre Dependencies must be installed in both server/ and ui/
REM @post Both server and UI are running

echo Starting Development Workflow Tracker...
echo.

REM Check if dependencies are installed
if not exist "server\node_modules" (
  echo Server dependencies not found. Installing...
  cd server
  call npm install
  cd ..
)

if not exist "ui\node_modules" (
  echo UI dependencies not found. Installing...
  cd ui
  call npm install
  cd ..
)

echo.
echo ============================================
echo Starting backend server and UI...
echo ============================================
echo.
echo Server will run at: http://localhost:3001
echo UI will run at: http://localhost:5173
echo.
echo Press Ctrl+C to stop both processes
echo.

REM Start both using npm
npm run dev
