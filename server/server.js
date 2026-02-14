// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { handleGameEvents } = require('./gameHandler');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow React to connect
    methods: ["GET", "POST"]
  }
});

// GLOBAL STATE STORE (The "Database")
// rooms = { "ROOM_CODE": { ...gameState } }
const rooms = {}; 

io.on('connection', (socket) => {
  console.log(`🔌 New Connection: ${socket.id}`);

  // Delegate logic to the game handler
  handleGameEvents(io, socket, rooms);

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    // Optional: Add logic to clean up empty rooms later
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ SERVER RUNNING on http://localhost:${PORT}`);
});