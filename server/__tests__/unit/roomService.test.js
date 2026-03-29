const roomService = require('../../services/roomService');
const { EVENT_TYPES, ROOM_LIMITS } = require('../../config/constants');

describe('RoomService', () => {
  const testRoomId = 'test-room-123';
  const testUserId = 'user-123';
  const testUserData = { userName: 'Alice', socketId: 'socket-123' };

  beforeEach(() => {
    // Clean up any existing test rooms
    if (roomService.roomExists(testRoomId)) {
      roomService.deleteRoom(testRoomId);
    }
  });

  describe('Room Management', () => {
    test('should create a new room', () => {
      roomService.createRoom(testRoomId);
      
      expect(roomService.roomExists(testRoomId)).toBe(true);
      
      const room = roomService.getRoom(testRoomId);
      expect(room).toHaveProperty('users');
      expect(room).toHaveProperty('strokes');
      expect(room).toHaveProperty('undoStack');
      expect(room).toHaveProperty('redoStack');
      expect(room.strokes).toEqual([]);
      expect(room.undoStack).toEqual([]);
      expect(room.redoStack).toEqual([]);
    });

    test('should not create duplicate rooms', () => {
      roomService.createRoom(testRoomId);
      roomService.createRoom(testRoomId);
      
      const room = roomService.getRoom(testRoomId);
      expect(room).toBeDefined();
    });

    test('should delete a room', () => {
      roomService.createRoom(testRoomId);
      roomService.deleteRoom(testRoomId);
      
      expect(roomService.roomExists(testRoomId)).toBe(false);
    });

    test('should add user to room', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, testUserId, testUserData);
      
      const room = roomService.getRoom(testRoomId);
      expect(room.users.has(testUserId)).toBe(true);
      expect(room.users.get(testUserId)).toEqual(testUserData);
    });

    test('should remove user from room', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, testUserId, testUserData);
      
      const isEmpty = roomService.removeUser(testRoomId, testUserId);
      
      const room = roomService.getRoom(testRoomId);
      expect(room.users.has(testUserId)).toBe(false);
      expect(isEmpty).toBe(true);
    });

    test('should return false when removing user from non-empty room', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, 'user-1', testUserData);
      roomService.addUser(testRoomId, 'user-2', testUserData);
      
      const isEmpty = roomService.removeUser(testRoomId, 'user-1');
      
      expect(isEmpty).toBe(false);
    });
  });

  describe('Stroke Management', () => {
    beforeEach(() => {
      roomService.createRoom(testRoomId);
    });

    test('should add STROKE_START event', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
        userId: testUserId,
        timestamp: Date.now(),
        data: { x: 10, y: 10, color: '#000', size: 3 }
      };

      roomService.addStroke(testRoomId, event);

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(1);
      expect(room.strokes[0]).toEqual(event);
      expect(room.currentStrokes.has(testUserId)).toBe(true);
    });

    test('should add STROKE_CONTINUE events', () => {
      const startEvent = {
        type: EVENT_TYPES.STROKE_START,
        userId: testUserId,
        timestamp: Date.now(),
        data: { x: 10, y: 10, color: '#000', size: 3 }
      };

      const continueEvent = {
        type: EVENT_TYPES.STROKE_CONTINUE,
        userId: testUserId,
        timestamp: Date.now(),
        data: { x: 15, y: 15, color: '#000', size: 3 }
      };

      roomService.addStroke(testRoomId, startEvent);
      roomService.addStroke(testRoomId, continueEvent);

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(2);
    });

    test('should complete stroke on STROKE_END', () => {
      const events = [
        { type: EVENT_TYPES.STROKE_START, userId: testUserId, timestamp: Date.now(), data: { x: 10, y: 10 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, userId: testUserId, timestamp: Date.now(), data: { x: 15, y: 15 } },
        { type: EVENT_TYPES.STROKE_END, userId: testUserId, timestamp: Date.now() }
      ];

      events.forEach(event => roomService.addStroke(testRoomId, event));

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(3);
      expect(room.undoStack).toHaveLength(1);
      expect(room.undoStack[0].type).toBe('draw');
      expect(room.undoStack[0].events).toHaveLength(3);
      expect(room.currentStrokes.has(testUserId)).toBe(false);
    });

    test('should handle multiple users drawing simultaneously', () => {
      const user1Events = [
        { type: EVENT_TYPES.STROKE_START, userId: 'user-1', timestamp: Date.now(), data: { x: 10, y: 10 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, userId: 'user-1', timestamp: Date.now(), data: { x: 15, y: 15 } }
      ];

      const user2Events = [
        { type: EVENT_TYPES.STROKE_START, userId: 'user-2', timestamp: Date.now(), data: { x: 20, y: 20 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, userId: 'user-2', timestamp: Date.now(), data: { x: 25, y: 25 } }
      ];

      // Interleave events
      roomService.addStroke(testRoomId, user1Events[0]);
      roomService.addStroke(testRoomId, user2Events[0]);
      roomService.addStroke(testRoomId, user1Events[1]);
      roomService.addStroke(testRoomId, user2Events[1]);

      const room = roomService.getRoom(testRoomId);
      expect(room.currentStrokes.has('user-1')).toBe(true);
      expect(room.currentStrokes.has('user-2')).toBe(true);
      expect(room.strokes).toHaveLength(4);
    });

    test('should clear all strokes', () => {
      const events = [
        { type: EVENT_TYPES.STROKE_START, userId: testUserId, timestamp: Date.now(), data: { x: 10, y: 10 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, userId: testUserId, timestamp: Date.now(), data: { x: 15, y: 15 } },
        { type: EVENT_TYPES.STROKE_END, userId: testUserId, timestamp: Date.now() }
      ];

      events.forEach(event => roomService.addStroke(testRoomId, event));
      roomService.clearStrokes(testRoomId, testUserId);

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(0);
      expect(room.undoStack).toHaveLength(2); // draw + clear
      expect(room.undoStack[1].type).toBe('clear');
    });
  });

  describe('Undo/Redo Functionality', () => {
    beforeEach(() => {
      roomService.createRoom(testRoomId);
    });

    const drawStroke = (userId = testUserId) => {
      const events = [
        { type: EVENT_TYPES.STROKE_START, userId, timestamp: Date.now(), data: { x: 10, y: 10 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, userId, timestamp: Date.now(), data: { x: 15, y: 15 } },
        { type: EVENT_TYPES.STROKE_END, userId, timestamp: Date.now() }
      ];
      events.forEach(event => roomService.addStroke(testRoomId, event));
    };

    test('should undo a single stroke', () => {
      drawStroke();

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(3);

      const success = roomService.undo(testRoomId);

      expect(success).toBe(true);
      expect(room.strokes).toHaveLength(0);
      expect(room.undoStack).toHaveLength(0);
      expect(room.redoStack).toHaveLength(1);
    });

    test('should undo multiple strokes', () => {
      drawStroke('user-1');
      drawStroke('user-2');
      drawStroke('user-3');

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(9);
      expect(room.undoStack).toHaveLength(3);

      roomService.undo(testRoomId);
      expect(room.strokes).toHaveLength(6);

      roomService.undo(testRoomId);
      expect(room.strokes).toHaveLength(3);

      roomService.undo(testRoomId);
      expect(room.strokes).toHaveLength(0);
    });

    test('should redo a stroke', () => {
      drawStroke();
      roomService.undo(testRoomId);

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(0);

      const success = roomService.redo(testRoomId);

      expect(success).toBe(true);
      expect(room.strokes).toHaveLength(3);
      expect(room.undoStack).toHaveLength(1);
      expect(room.redoStack).toHaveLength(0);
    });

    test('should handle undo/redo cycle', () => {
      drawStroke('user-1');
      drawStroke('user-2');

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(6);

      // Undo twice
      roomService.undo(testRoomId);
      roomService.undo(testRoomId);
      expect(room.strokes).toHaveLength(0);

      // Redo twice
      roomService.redo(testRoomId);
      roomService.redo(testRoomId);
      expect(room.strokes).toHaveLength(6);
    });

    test('should clear redo stack on new stroke after undo', () => {
      drawStroke('user-1');
      roomService.undo(testRoomId);

      const room = roomService.getRoom(testRoomId);
      expect(room.redoStack).toHaveLength(1);

      drawStroke('user-2');
      expect(room.redoStack).toHaveLength(0);
    });

    test('should undo clear canvas', () => {
      drawStroke('user-1');
      drawStroke('user-2');

      const room = roomService.getRoom(testRoomId);
      const strokeCountBefore = room.strokes.length;

      roomService.clearStrokes(testRoomId, testUserId);
      expect(room.strokes).toHaveLength(0);

      roomService.undo(testRoomId);
      expect(room.strokes).toHaveLength(strokeCountBefore);
    });

    test('should return false when undoing empty stack', () => {
      const success = roomService.undo(testRoomId);
      expect(success).toBe(false);
    });

    test('should return false when redoing empty stack', () => {
      const success = roomService.redo(testRoomId);
      expect(success).toBe(false);
    });

    test('canUndo should return correct state', () => {
      expect(roomService.canUndo(testRoomId)).toBe(false);

      drawStroke();
      expect(roomService.canUndo(testRoomId)).toBe(true);

      roomService.undo(testRoomId);
      expect(roomService.canUndo(testRoomId)).toBe(false);
    });

    test('canRedo should return correct state', () => {
      expect(roomService.canRedo(testRoomId)).toBe(false);

      drawStroke();
      expect(roomService.canRedo(testRoomId)).toBe(false);

      roomService.undo(testRoomId);
      expect(roomService.canRedo(testRoomId)).toBe(true);

      roomService.redo(testRoomId);
      expect(roomService.canRedo(testRoomId)).toBe(false);
    });
  });

  describe('Room Statistics', () => {
    beforeEach(() => {
      roomService.createRoom(testRoomId);
    });

    test('should get room stats', () => {
      roomService.addUser(testRoomId, 'user-1', testUserData);
      roomService.addUser(testRoomId, 'user-2', testUserData);

      const stats = roomService.getRoomStats(testRoomId);

      expect(stats).toHaveProperty('userCount', 2);
      expect(stats).toHaveProperty('strokeCount');
      expect(stats).toHaveProperty('undoStackSize');
      expect(stats).toHaveProperty('redoStackSize');
      expect(stats).toHaveProperty('canUndo');
      expect(stats).toHaveProperty('canRedo');
      expect(stats).toHaveProperty('createdAt');
    });

    test('should return null for non-existent room', () => {
      const stats = roomService.getRoomStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Room State for Client', () => {
    beforeEach(() => {
      roomService.createRoom(testRoomId);
    });

    test('should get room state for client', () => {
      roomService.addUser(testRoomId, 'user-1', { userName: 'Alice', socketId: 'socket-1' });

      const state = roomService.getRoomStateForClient(testRoomId);

      expect(state).toHaveProperty('users');
      expect(state).toHaveProperty('strokes');
      expect(state).toHaveProperty('canUndo');
      expect(state).toHaveProperty('canRedo');
      expect(state.users).toHaveLength(1);
      expect(state.users[0]).toEqual({ userId: 'user-1', userName: 'Alice' });
    });

    test('should return null for non-existent room', () => {
      const state = roomService.getRoomStateForClient('non-existent');
      expect(state).toBeNull();
    });
  });

  // T005 — OperationId Deduplication tests (MUST FAIL before T008-T010 — Principle I)
  describe('OperationId Deduplication', () => {
    beforeEach(() => {
      roomService.createRoom(testRoomId);
    });

    test('createRoom initialises seenOperationIds as an empty Set', () => {
      const room = roomService.getRoom(testRoomId);
      expect(room.seenOperationIds).toBeDefined();
      expect(room.seenOperationIds).toBeInstanceOf(Set);
      expect(room.seenOperationIds.size).toBe(0);
    });

    test('isDuplicateOperation returns false for a new operationId', () => {
      const result = roomService.isDuplicateOperation(testRoomId, 'op-id-001');
      expect(result).toBe(false);
    });

    test('isDuplicateOperation returns true after recordOperation records the same id', () => {
      roomService.recordOperation(testRoomId, 'op-id-001');
      const result = roomService.isDuplicateOperation(testRoomId, 'op-id-001');
      expect(result).toBe(true);
    });

    test('recordOperation grows the seen-set by one per unique id', () => {
      const room = roomService.getRoom(testRoomId);
      roomService.recordOperation(testRoomId, 'op-id-001');
      expect(room.seenOperationIds.size).toBe(1);
      roomService.recordOperation(testRoomId, 'op-id-002');
      expect(room.seenOperationIds.size).toBe(2);
    });

    test('different rooms do not share seenOperationIds (scoped per room)', () => {
      const otherRoomId = 'other-room-456';
      roomService.createRoom(otherRoomId);
      roomService.recordOperation(testRoomId, 'op-id-001');

      expect(roomService.isDuplicateOperation(testRoomId, 'op-id-001')).toBe(true);
      expect(roomService.isDuplicateOperation(otherRoomId, 'op-id-001')).toBe(false);

      roomService.deleteRoom(otherRoomId);
    });

    test('FIFO eviction: size never exceeds MAX_OPERATION_IDS', () => {
      const limit = ROOM_LIMITS.MAX_OPERATION_IDS;

      for (let i = 0; i < limit; i++) {
        roomService.recordOperation(testRoomId, `op-${i}`);
      }

      const room = roomService.getRoom(testRoomId);
      expect(room.seenOperationIds.size).toBe(limit);

      // Record one more — oldest should be evicted
      roomService.recordOperation(testRoomId, 'op-overflow');
      expect(room.seenOperationIds.size).toBe(limit);

      // Oldest entry (op-0) should have been evicted
      expect(roomService.isDuplicateOperation(testRoomId, 'op-0')).toBe(false);
      // Newest entry should be present
      expect(roomService.isDuplicateOperation(testRoomId, 'op-overflow')).toBe(true);
    });
  });
});