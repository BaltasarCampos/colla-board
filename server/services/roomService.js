const logger = require('../utils/logger');
const { ROOM_LIMITS, EVENT_TYPES } = require('../config/constants');

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
      strokes: [], // All rendered strokes
      currentStrokes: new Map(), // userId -> currentStroke (for tracking incomplete strokes)
      undoStack: [], // Stack of actions that can be undone
      redoStack: [], // Stack of actions that can be redone
      seenOperationIds: new Set(), // Bounded FIFO dedup seen-set (Principle IV)
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
    // Clean up any incomplete strokes for this user
    room.currentStrokes.delete(userId);
    
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
   * Add stroke event to room
   * @param {string} roomId - Room identifier
   * @param {Object} event - Stroke event
   */
  addStroke(roomId, event) {
    const room = this.getRoom(roomId);
    if (!room) return;

    const { type, userId } = event;

    // Handle stroke lifecycle
    if (type === EVENT_TYPES.STROKE_START) {
      // Start a new stroke for this user
      room.currentStrokes.set(userId, {
        events: [event],
        userId: event.userId,
        timestamp: event.timestamp
      });
      
      // Add to strokes for rendering
      room.strokes.push(event);
      
      logger.debug(`Stroke started by ${userId} in room ${roomId}`);
      
    } else if (type === EVENT_TYPES.STROKE_CONTINUE) {
      // Add to current stroke if it exists
      const currentStroke = room.currentStrokes.get(userId);
      
      if (currentStroke) {
        currentStroke.events.push(event);
        room.strokes.push(event);
      } else {
        // Edge case: CONTINUE without START (shouldn't happen, but handle it)
        logger.warn(`Received STROKE_CONTINUE without STROKE_START from ${userId} in room ${roomId}`);
        room.strokes.push(event);
      }
      
    } else if (type === EVENT_TYPES.STROKE_END) {
      const currentStroke = room.currentStrokes.get(userId);
      
      if (currentStroke) {
        // Complete the stroke
        currentStroke.events.push(event);
        room.strokes.push(event);
        
        // Add completed stroke to undo stack as a single action
        this.addActionToUndoStack(roomId, {
          type: 'draw',
          events: [...currentStroke.events], // Copy the events
          userId: userId
        });

        // Clear redo stack when new action is performed
        room.redoStack = [];
        
        // Remove from current strokes
        room.currentStrokes.delete(userId);
        
        logger.debug(`Stroke completed by ${userId} in room ${roomId} (${currentStroke.events.length} events)`);
      } else {
        // Edge case: END without START
        logger.warn(`Received STROKE_END without STROKE_START from ${userId} in room ${roomId}`);
        room.strokes.push(event);
      }
    }

    // Check if cleanup is needed
    this.cleanupStrokesIfNeeded(roomId);
  }

  /**
   * Clear all strokes in room and save to undo stack
   * @param {string} roomId - Room identifier
   * @param {string} userId - User who cleared
   */
  clearStrokes(roomId, userId = 'system') {
    const room = this.getRoom(roomId);
    if (!room) return;

    // Save current state to undo stack as a clear action
    if (room.strokes.length > 0) {
      this.addActionToUndoStack(roomId, {
        type: 'clear',
        previousStrokes: [...room.strokes],
        userId: userId
      });
    }

    // Clear current state
    room.strokes = [];
    room.currentStrokes.clear();
    room.redoStack = [];

    logger.info(`Canvas cleared in room ${roomId} by ${userId}`);
  }

  /**
   * Add action to undo stack
   * @param {string} roomId - Room identifier
   * @param {Object} action - Action to add
   */
  addActionToUndoStack(roomId, action) {
    const room = this.getRoom(roomId);
    if (!room) return;

    room.undoStack.push(action);

    // Limit undo stack size
    if (room.undoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
      room.undoStack.shift();
      logger.debug(`Undo stack trimmed in room ${roomId}`);
    }
  }

  /**
   * Perform undo operation
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if undo was performed
   */
  undo(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.undoStack.length === 0) {
      logger.debug(`Cannot undo in room ${roomId} - stack empty`);
      return false;
    }

    // Pop action from undo stack
    const action = room.undoStack.pop();

    // Add action to redo stack
    room.redoStack.push(action);

    // Limit redo stack size
    if (room.redoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
      room.redoStack.shift();
    }

    // Apply the undo based on action type
    if (action.type === 'draw') {
      // Remove the stroke events from the END of strokes array
      const eventsToRemove = action.events.length;
      
      // Find and remove these specific events
      const startIndex = room.strokes.length - eventsToRemove;
      
      if (startIndex >= 0) {
        room.strokes.splice(startIndex, eventsToRemove);
        logger.info(`Undo draw action in room ${roomId} (removed ${eventsToRemove} events)`);
      } else {
        logger.error(`Cannot undo - stroke events not found in expected position`);
        // Rollback: put action back on undo stack
        room.undoStack.push(action);
        room.redoStack.pop();
        return false;
      }
      
    } else if (action.type === 'clear') {
      // Restore previous strokes
      room.strokes = [...action.previousStrokes];
      
      logger.info(`Undo clear action in room ${roomId} (restored ${room.strokes.length} events)`);
    }

    return true;
  }

  /**
   * Perform redo operation
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if redo was performed
   */
  redo(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.redoStack.length === 0) {
      logger.debug(`Cannot redo in room ${roomId} - stack empty`);
      return false;
    }

    // Pop action from redo stack
    const action = room.redoStack.pop();

    // Add action back to undo stack
    room.undoStack.push(action);

    // Limit undo stack size
    if (room.undoStack.length > ROOM_LIMITS.MAX_UNDO_HISTORY) {
      room.undoStack.shift();
    }

    // Apply the redo based on action type
    if (action.type === 'draw') {
      // Re-add the stroke events
      room.strokes.push(...action.events);
      
      logger.info(`Redo draw action in room ${roomId} (added ${action.events.length} events)`);
    } else if (action.type === 'clear') {
      // Clear again
      room.strokes = [];
      
      logger.info(`Redo clear action in room ${roomId}`);
    }

    return true;
  }

  /**
   * Check if undo is available
   * @param {string} roomId - Room identifier
   * @returns {boolean}
   */
  canUndo(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.undoStack.length > 0 : false;
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
        const removed = room.strokes.length - keepCount;
        room.strokes = room.strokes.slice(-keepCount);
        
        // Clear undo/redo stacks as history is no longer valid
        room.undoStack = [];
        room.redoStack = [];
        
        logger.info(`Room ${roomId} strokes trimmed to ${room.strokes.length} (removed ${removed})`);
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
      activeStrokes: room.currentStrokes.size,
      undoStackSize: room.undoStack.length,
      redoStackSize: room.redoStack.length,
      canUndo: this.canUndo(roomId),
      canRedo: this.canRedo(roomId),
      createdAt: room.createdAt
    };
  }

  /**
   * Check if an operationId has already been processed in this room
   * @param {string} roomId
   * @param {string} operationId
   * @returns {boolean}
   */
  isDuplicateOperation(roomId, operationId) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    return room.seenOperationIds.has(operationId);
  }

  /**
   * Record an operationId as processed, evicting the oldest entry if the
   * seen-set has reached MAX_OPERATION_IDS (FIFO, Principle IV)
   * @param {string} roomId
   * @param {string} operationId
   */
  recordOperation(roomId, operationId) {
    const room = this.getRoom(roomId);
    if (!room) return;
    if (room.seenOperationIds.size >= ROOM_LIMITS.MAX_OPERATION_IDS) {
      // Evict oldest-inserted entry (Set is insertion-ordered)
      room.seenOperationIds.delete(room.seenOperationIds.values().next().value);
    }
    room.seenOperationIds.add(operationId);
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

// Export a single instance
module.exports = new RoomService();