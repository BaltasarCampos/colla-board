class EventHandlers {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
    }

    registerHandlers(socket) {
        socket.on('join-room', (data)=> this.handleJoinRoom(socket, data));
        socket.on('leave-room', (data)=> this.handleLeaveRoom(socket, data));
        socket.on('drawing-event', (data)=> this.handleDrawingEvent(socket, data));
        socket.on('disconect', ()=> this.handleDisconect(socket));
    }

    handleJoinRoom(socket, { roomId, userId, userName }) {
        console.log(`User ${userName} (${userId}) joining room ${roomId}`);

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
                username: data.username
            })),
            strokes: room.strokes
        });

        console.log(`Room ${roomId} now has ${room.users.size} users`);
    }

    handleLeaveRoom(socket, { roomId }) {
        this.leaveRoom(socket);
    }

    handleDrawingEvent(socket, event) {
        const { roomId } = socket;
        const room = this.rooms.get(roomId);

        if (!roomId) {
            console.error('Drawong event from socket not in a room');
            return;
        }

        if (!event || !event.type) {
            console.error('Invalid drawing event structure');
            return;
        }

        event.userId = socket.userId;
        event.timestamp = Date.now();

        if (room) {
            room.strokes.push(event);
        }

        socket.to(roomId).emit('drawing-event', event);
    }

    handleDisconnect(socket) {
        console.log(`Socket ${socket.id} disconnecting`);
        this.leaveRoom(socket);
    }

    leaveRoom(socket) {
        const { roomId, userId, username } = socket;
        
        if (!roomId) return;
    
        const room = this.rooms.get(roomId);

        if (room) {
            room.users.delete(userId);

            // Notify others
            socket.to(roomId).emit('user-left', {
                userId,
                username,
                timestamp: Date.now()
            });

            // Clean up empty rooms
            if (room.users.size === 0) {
                console.log(`Room ${roomId} is empty, cleaning up`);
                this.rooms.delete(roomId);
            }
        }
    
        socket.leave(roomId);
    }
};

module.exports = EventHandlers;