const logger = require('../utils/logger');
const roomService = require('../services/roomService');
const { EVENT_TYPES, SOCKET_EVENTS } = require('../config/constants');

class EventHandlers {
    constructor(io) {
        this.io = io;
        this.roomService = roomService;

        logger.info('EventHandlers initialized');
    }

    registerHandlers(socket) {
        socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => this.handleJoinRoom(socket, data));
        socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => this.handleLeaveRoom(socket, data));
        socket.on(SOCKET_EVENTS.DRAWING_EVENT, (data) => this.handleDrawingEvent(socket, data));
        socket.on(SOCKET_EVENTS.UNDO, () => this.handleUndo(socket));
        socket.on(SOCKET_EVENTS.REDO, () => this.handleRedo(socket));
        socket.on(SOCKET_EVENTS.DISCONNECT, () => this.handleDisconnect(socket));
    
        logger.debug(`Handlers registered for socket ${socket.id}`);
    }

    handleJoinRoom(socket, { roomId, userId, userName }) {
        logger.info(`User ${userName} (${userId}) joining room ${roomId}`);

        socket.join(roomId);

        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;

        // Create room if it doesn't exist
        if (!this.roomService.roomExists(roomId)) {
            this.roomService.createRoom(roomId);
        }

        // Add user to room
        this.roomService.addUser(roomId, userId, { userName, socketId: socket.id });
        
        // Notify others
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
            userId,
            userName,
            timestamp: Date.now()
        });
    
        // Send room state to new user
        const roomState = this.roomService.getRoomStateForClient(roomId);
        socket.emit(SOCKET_EVENTS.ROOM_STATE, roomState);
    
        const stats = this.roomService.getRoomStats(roomId);
        logger.info(`Room ${roomId} now has ${stats.userCount} users, ${stats.strokeCount} strokes`);
    }

    handleLeaveRoom(socket, { roomId }) {
        logger.info(`User ${socket.userName} leaving room ${roomId}`);
        this.leaveRoom(socket);
    }

    handleDrawingEvent(socket, event) {
        const { roomId, userId } = socket;

        if (!roomId) {
            logger.error(`Drawing event from socket ${socket.id} not in a room`);
            return;
        }

        if (!event || !event.type) {
            logger.error(`Invalid drawing event structure from ${socket.id}`);
            return;
        }

        // Add metadata
        event.userId = userId;
        event.timestamp = Date.now();

        // Handle event based on type
        if (event.type === EVENT_TYPES.CANVAS_CLEAR) {
            logger.info(`Canvas cleared by ${socket.userName} in room ${roomId}`);
            this.roomService.clearStrokes(roomId, userId);
        } else {
            this.roomService.addStroke(roomId, event);
        }

        // Broadcast to others in room (not to sender)
        socket.to(roomId).emit(SOCKET_EVENTS.DRAWING_EVENT, event);

        // Broadcast history state to ALL users (including sender)
        this.io.to(roomId).emit(SOCKET_EVENTS.HISTORY_UPDATE, {
            canUndo: this.roomService.canUndo(roomId),
            canRedo: this.roomService.canRedo(roomId)
        });
    }

    handleUndo(socket) {
        const { roomId, userName } = socket;
    
        if (!roomId) {
            logger.error(`Undo request from socket ${socket.id} not in a room`);
            return;
        }
    
        logger.info(`Undo requested by ${userName} in room ${roomId}`);
    
        // Perform undo
        const success = this.roomService.undo(roomId);
    
        if (success) {
            // Broadcast new state to all users in room
            const roomState = this.roomService.getRoomStateForClient(roomId);
            this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, roomState);
      
            const stats = this.roomService.getRoomStats(roomId);
            logger.info(`Undo complete in room ${roomId}. Strokes: ${stats.strokeCount}, Undo: ${stats.undoStackSize}, Redo: ${stats.redoStackSize}`);
        } else {
            logger.warn(`Undo failed in room ${roomId}`);
        }
    }

    handleRedo(socket) {
        const { roomId, userName } = socket;
    
        if (!roomId) {
            logger.error(`Redo request from socket ${socket.id} not in a room`);
            return;
        }
    
        logger.info(`Redo requested by ${userName} in room ${roomId}`);
    
        // Perform redo
        const success = this.roomService.redo(roomId);
    
        if (success) {
            // Broadcast new state to all users in room
            const roomState = this.roomService.getRoomStateForClient(roomId);
            this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, roomState);
      
            const stats = this.roomService.getRoomStats(roomId);
            logger.info(`Redo complete in room ${roomId}. Strokes: ${stats.strokeCount}, Undo: ${stats.undoStackSize}, Redo: ${stats.redoStackSize}`);
        } else {
            logger.warn(`Redo failed in room ${roomId}`);
        }
    }

    handleDisconnect(socket) {
        logger.info(`Socket ${socket.id} (${socket.userName || 'unknown'}) disconnecting`);
        this.leaveRoom(socket);
    }

    leaveRoom(socket) {
        const { roomId, userId, userName } = socket;
        
        if (!roomId) return;

        // Remove user from room
        const isEmpty = this.roomService.removeUser(roomId, userId);

        // Notify others
        socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
            userId,
            userName,
            timestamp: Date.now()
        });
    
        // Delete room if empty
        if (isEmpty) {
            this.roomService.deleteRoom(roomId);
        }
    
        socket.leave(roomId);
    }

    getRoomStats(roomId) {
        return this.roomService.getRoomStats(roomId);
    }
}

module.exports = EventHandlers;