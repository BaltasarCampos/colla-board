const express = require('express');
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const EventHandlers = require('./events/eventHandlers.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

//Initialize event Hhndlers
const eventHandlers = new EventHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString() 
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    eventHandlers.registerHandlers(socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io server ready`);
});

module.exports = { app, server, io };