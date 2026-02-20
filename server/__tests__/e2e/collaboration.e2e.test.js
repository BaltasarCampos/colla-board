const roomService = require('../../services/roomService');
const { EVENT_TYPES } = require('../../config/constants');

describe('Collaboration E2E Tests', () => {
  const testRoomId = 'collaboration-test-room';

  beforeEach(() => {
    if (roomService.roomExists(testRoomId)) {
      roomService.deleteRoom(testRoomId);
    }
  });

  afterEach(() => {
    if (roomService.roomExists(testRoomId)) {
      roomService.deleteRoom(testRoomId);
    }
  });

  describe('Multi-User Collaboration', () => {
    test('should handle complex multi-user drawing scenario', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, 'alice-id', { userName: 'Alice', socketId: 'alice-socket' });
      roomService.addUser(testRoomId, 'bob-id', { userName: 'Bob', socketId: 'bob-socket' });

      let room = roomService.getRoom(testRoomId);
      expect(room.users.size).toBe(2);

      roomService.addStroke(testRoomId, {
        type: EVENT_TYPES.STROKE_START,
        userId: 'alice-id',
        timestamp: Date.now(),
        data: { x: 10, y: 10 },
      });

      roomService.addStroke(testRoomId, {
        type: EVENT_TYPES.STROKE_END,
        userId: 'alice-id',
        timestamp: Date.now(),
      });

      room = roomService.getRoom(testRoomId);
      expect(room.strokes.length).toBe(2);
    });

    test('should handle undo/redo with multiple users', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, 'user1', { userName: 'User1', socketId: 'socket1' });

      roomService.addStroke(testRoomId, {
        type: EVENT_TYPES.STROKE_START,
        userId: 'user1',
        timestamp: Date.now(),
        data: { x: 10, y: 10 },
      });

      roomService.addStroke(testRoomId, {
        type: EVENT_TYPES.STROKE_END,
        userId: 'user1',
        timestamp: Date.now(),
      });

      let room = roomService.getRoom(testRoomId);
      expect(room.strokes.length).toBe(2);

      roomService.undo(testRoomId);
      room = roomService.getRoom(testRoomId);
      expect(room.strokes.length).toBe(0);

      roomService.redo(testRoomId);
      room = roomService.getRoom(testRoomId);
      expect(room.strokes.length).toBe(2);
    });

    test('should handle large number of strokes', () => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, 'user1', { userName: 'User1', socketId: 'socket1' });

      for (let i = 0; i < 50; i++) {
        roomService.addStroke(testRoomId, {
          type: EVENT_TYPES.STROKE_CONTINUE,
          userId: 'user1',
          timestamp: Date.now(),
          data: { x: i * 10, y: i * 10 },
        });
      }

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes.length).toBe(50);
    });
  });
});
