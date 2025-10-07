const express = require('express');
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const EventHandlers = require('./events/eventHandlers.js');
const logger = require('./utils/logger.js');
const requestLogger = require('./middelware/requestLogger.js');
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
app.use(requestLogger);

//Initialize event Hhndlers
const eventHandlers = new EventHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
    logger.http(`Health check from ${req.ip}`);
    res.status(200).json({ 
        status: 'ok',
        connections: io.engine.clientsCount,
        timestamp: new Date().toISOString() 
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    try {
        eventHandlers.registerHandlers(socket);
    } catch (error) {
        logger.error(`Error registering handlers for ${socket.id}: ${error.message}`);
        socket.disconnect();
    }

    socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}: ${error.message}`);
    });
});

// 404 handler
app.use((req, res, next) => {
    logger.warn(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Not Found',
        path: req.url 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Express error: ${err.message}`, {
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
  
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Something went wrong!',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
});

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Socket.io server ready`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Log level: ${process.env.LOG_LEVEL || 'debug'}`);
});

module.exports = { app, server, io };