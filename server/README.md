# GDW Backend Server

Backend server for GDW database file management.

## Features

- Read/write SQLite database files to arbitrary file system paths
- REST API for frontend integration
- No browser security restrictions

## Installation

```bash
cd server
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Server runs on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /api/health
```

### Database Path Management
```
GET /api/db/path          # Get current path
POST /api/db/path         # Set path
DELETE /api/db/path       # Clear path
```

### Database Operations
```
GET /api/db               # Read database file
POST /api/db              # Write database file
GET /api/db/info          # Get file info
```

## Example

```javascript
// Set database path
await fetch('http://localhost:3001/api/db/path', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    path: '/Users/username/Documents/my-database.db' 
  })
});

// Write database
await fetch('http://localhost:3001/api/db', {
  method: 'POST',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: dbBinaryData
});

// Read database
const response = await fetch('http://localhost:3001/api/db');
const dbData = await response.arrayBuffer();
```
