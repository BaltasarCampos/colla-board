const logger = require('../utils/logger');

class EventHandlers {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        logger.info('EventHandlers initialized');
    }

    registerHandlers(socket) {
        socket.on('join-room', (data)=> this.handleJoinRoom(socket, data));
        socket.on('leave-room', (data)=> this.handleLeaveRoom(socket, data));
        socket.on('drawing-event', (data)=> this.handleDrawingEvent(socket, data));
        socket.on('disconect', ()=> this.handleDisconect(socket));

        logger.debug(`Handlers registered for socket ${socket.id}`);
    }

    handleJoinRoom(socket, { roomId, userId, userName }) {
        logger.info(`User ${userName} (${userId}) joining room ${roomId}`);

        socket.join(roomId);

        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;

        //Initialize room if it doen't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                users: new Map(),
                strokes: [],
                createdAt: new Date()
            });
            logger.info(`Room ${roomId} created`);
        }

        const room = this.rooms.get(roomId);
        room.users.set(userId, { userName, socketId: socket.id });

        socket.to(roomId).emit('user-joined', {
            userId,
            userName,
            timestamp: Date.now()
        });

        // Send current room state to the new user
        socket.emit('room-state', {
            users: Array.from(room.users.entries()).map(([id, data]) => ({
                userId: id,
                userName: data.userName
            })),
            strokes: room.strokes
        });

        logger.info(`Room ${roomId} now has ${room.users.size} users`);
    }

    handleLeaveRoom(socket) {
        logger.info(`User ${socket.userName} leaving room ${roomId}`);
        this.leaveRoom(socket);
    }

    handleDrawingEvent(socket, event) {
        const { roomId } = socket;
        const room = this.rooms.get(roomId);

        if (!roomId) {
            logger.error(`Drawing event from socket ${socket.id} not in a room`);
            return;
        }

        if (!event || !event.type) {
            logger.error(`Invalid drawing event structure from ${socket.id}`);
            return;
        }

        event.userId = socket.userId;
        event.timestamp = Date.now();

        if (room) {
            if (event.type === 'canvas-clear') {
                room.strokes = [];
                logger.info(`Canvas cleared by ${socket.userName} in room ${roomId}`);
            } else {
                room.strokes.push(event);
                logger.debug(`Drawing event ${event.type} from ${socket.userName} in room ${roomId}`);
            }
        }

        socket.to(roomId).emit('drawing-event', event);
    }

    handleDisconnect(socket) {
        logger.info(`Socket ${socket.id} (${socket.userName || 'unknown'}) disconnecting`);
        this.leaveRoom(socket);
    }

    leaveRoom(socket) {
        const { roomId, userId, userName } = socket;
        
        if (!roomId) return;
    
        const room = this.rooms.get(roomId);

        if (room) {
            room.users.delete(userId);

            // Notify others
            socket.to(roomId).emit('user-left', {
                userId,
                userName,
                timestamp: Date.now()
            });

            // Clean up empty rooms
            if (room.users.size === 0) {
                logger.info(`Room ${roomId} is empty, cleaning up`);
                this.rooms.delete(roomId);
            } else {
                logger.info(`Room ${roomId} now has ${room.users.size} users`);
            }
        }
    
        socket.leave(roomId);
    }

    getRoomStats(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            logger.warn(`Room stats requested for non-existent room ${roomId}`);
            return null;
        }
    
        return {
            userCount: room.users.size,
            strokeCount: room.strokes.length,
            createdAt: room.createdAt
        };
    }
};

module.exports = EventHandlers;