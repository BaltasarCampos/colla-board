const logger = require('../utils/logger');
const { ROOM_LIMITS } = require('../config/constants');

/**
 * Service for managing room state and operations
 */
class RoomService {
    constructor() {
        this.rooms = new Map();
    }

    /**
    * Create a new room
    * @param {string} roomId - Room identifier
    */
    createRoom(roomId) {
        if (this.rooms.has(roomId)) {
            logger.warn(`Attempted to create existing room ${roomId}`);
            return;
        }

        this.rooms.set(roomId, {
            users: new Map(),
            strokes: [],
            undoStack: [],
            redoStack: [],
            createdAt: new Date()
        });

        logger.info(`Room ${roomId} created`);
    }

    /**
    * Get room data
    * @param {string} roomId - Room identifier
    * @returns {Object|null} Room data or null if not found
    */
    getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

    /**
    * Check if room exists
    * @param {string} roomId - Room identifier
    * @returns {boolean}
    */
    roomExists(roomId) {
        return this.rooms.has(roomId);
    }

    /**
    * Add user to room
    * @param {string} roomId - Room identifier
    * @param {string} userId - User identifier
    * @param {Object} userData - User data
    */
    addUser(roomId, userId, userData) {
        const room = this.getRoom(roomId);
        if (!room) {
            logger.error(`Cannot add user to non-existent room ${roomId}`);
            return;
        }

        room.users.set(userId, userData);
        logger.info(`User ${userData.userName} added to room ${roomId}`);
    }

    /**
    * Remove user from room
    * @param {string} roomId - Room identifier
    * @param {string} userId - User identifier
    * @returns {boolean} True if room is now empty
    */
    removeUser(roomId, userId) {
        const room = this.getRoom(roomId);
        if (!room) return false;

        room.users.delete(userId);
        logger.info(`User ${userId} removed from room ${roomId}`);

        return room.users.size === 0;
    }

    /**
    * Delete a room
    * @param {string} roomId - Room identifier
    */
    deleteRoom(roomId) {
        const room = this.getRoom(roomId);
        if (room) {
            logger.info(`Room ${roomId} deleted (had ${room.strokes.length} strokes)`);
            this.rooms.delete(roomId);
        }
    }

    /**
    * Add stroke to room
    * @param {string} roomId - Room identifier
    * @param {Object} stroke - Stroke event
    */
    addStroke(roomId, stroke) {
        const room = this.getRoom(roomId);
        if (!room) return;

        room.strokes.push(stroke);

        // Check if cleanup is needed
        this.cleanupStrokesIfNeeded(roomId);
    }

    /**
    * Clear all strokes in room and save to undo stack
    * @param {string} roomId - Room identifier
    */
    clearStrokes(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return;

        // Save current state to undo stack
        if (room.strokes.length > 0) {
            this.addToUndoStack(roomId, [...room.strokes]);
        }

        room.strokes = [];
        room.redoStack = [];

        logger.info(`Canvas cleared in room ${roomId}`);
    }

    /**
    * Add state to undo stack
    * @param {string} roomId - Room identifier
    * @param {Array} strokes - Array of strokes
    */
    addToUndoStack(roomId, strokes) {
        const room = this.getRoom(roomId);
        if (!room) return;

        room.undoStack.push(strokes);

        // Limit undo stack size
        if (room.undoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
            room.undoStack.shift();
        }
    }

    /**
    * Perform undo operation
    * @param {string} roomId - Room identifier
    * @returns {boolean} True if undo was performed
    */
    undo(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return false;

        // Save current state to redo stack
        room.redoStack.push([...room.strokes]);

        // Restore previous state from undo stack
        if (room.undoStack.length > 0) {
            room.strokes = room.undoStack.pop();
        } else {
            room.strokes = [];
        }

        // Limit redo stack size
        if (room.redoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
            room.redoStack.shift();
        }

        logger.info(`Undo performed in room ${roomId}`);
        return true;
    }

    /**
    * Perform redo operation
    * @param {string} roomId - Room identifier
    * @returns {boolean} True if redo was performed
    */
    redo(roomId) {
        const room = this.getRoom(roomId);
        if (!room || room.redoStack.length === 0) return false;

        // Save current state to undo stack
        room.undoStack.push([...room.strokes]);

        // Restore state from redo stack
        room.strokes = room.redoStack.pop();

        // Limit undo stack size
        if (room.undoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
            room.undoStack.shift();
        }

        logger.info(`Redo performed in room ${roomId}`);
        return true;
    }

    /**
    * Check if undo is available
    * @param {string} roomId - Room identifier
    * @returns {boolean}
    */
    canUndo(roomId) {
        const room = this.getRoom(roomId);
        return room ? (room.undoStack.length > 0 || room.strokes.length > 0) : false;
    }
    
    /**
    * Check if redo is available
    * @param {string} roomId - Room identifier
    * @returns {boolean}
    */
    canRedo(roomId) {
        const room = this.getRoom(roomId);
        return room ? room.redoStack.length > 0 : false;
    }

    /**
    * Clean up strokes if limit is reached
    * @param {string} roomId - Room identifier
    */
    cleanupStrokesIfNeeded(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return;

        const threshold = ROOM_LIMITS.MAX_STROKES_PER_ROOM * ROOM_LIMITS.STROKE_CLEANUP_THRESHOLD;

        if (room.strokes.length > threshold) {
            logger.warn(`Room ${roomId} approaching stroke limit (${room.strokes.length}/${ROOM_LIMITS.MAX_STROKES_PER_ROOM})`);

            if (room.strokes.length >= ROOM_LIMITS.MAX_STROKES_PER_ROOM) {
                const keepCount = Math.floor(ROOM_LIMITS.MAX_STROKES_PER_ROOM * 0.5);
                room.strokes = room.strokes.slice(-keepCount);
                logger.info(`Room ${roomId} strokes trimmed to ${room.strokes.length}`);
            }
        }
    }

    /**
    * Get room statistics
    * @param {string} roomId - Room identifier
    * @returns {Object|null}
    */
    getRoomStats(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return null;

        return {
            userCount: room.users.size,
            strokeCount: room.strokes.length,
            undoStackSize: room.undoStack.length,
            redoStackSize: room.redoStack.length,
            canUndo: this.canUndo(roomId),
            canRedo: this.canRedo(roomId),
            createdAt: room.createdAt
        };
    }

    /**
    * Get room state for client
    * @param {string} roomId - Room identifier
    * @returns {Object}
    */
    getRoomStateForClient(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return null;

        return {
            users: Array.from(room.users.entries()).map(([id, data]) => ({
            userId: id,
            userName: data.userName
            })),
            strokes: room.strokes,
            canUndo: this.canUndo(roomId),
            canRedo: this.canRedo(roomId)
        };
    }
}

// Export a single instance - Node.js will cache this
module.exports = new RoomService();