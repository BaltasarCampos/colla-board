const roomService = require('../../services/roomService');
const { EVENT_TYPES } = require('../../config/constants');

describe('Socket Integration Tests', () => {
  const testRoomId = 'test-room-123';

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

  test('should create room and manage users', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });
    
    const room = roomService.getRoom(testRoomId);
    expect(room).toBeDefined();
    expect(room.users.size).toBe(1);
  });

  test('should handle strokes from multiple users', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });
    roomService.addUser(testRoomId, 'user2', { userName: 'Bob', socketId: 's2' });

    roomService.addStroke(testRoomId, {
      type: EVENT_TYPES.STROKE_START,
      userId: 'user1',
      timestamp: Date.now(),
      data: { x: 10, y: 10 }
    });

    const room = roomService.getRoom(testRoomId);
    expect(room.strokes.length).toBe(1);
  });

  test('should sync undo/redo state', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });

    roomService.addStroke(testRoomId, {
      type: EVENT_TYPES.STROKE_START,
      userId: 'user1',
      timestamp: Date.now(),
      data: { x: 10, y: 10 }
    });

    roomService.addStroke(testRoomId, {
      type: EVENT_TYPES.STROKE_END,
      userId: 'user1',
      timestamp: Date.now() + 1,
      data: { x: 10, y: 10 }
    });

    let state = roomService.getRoomStateForClient(testRoomId);
    expect(state.canUndo).toBe(true);

    roomService.undo(testRoomId);
    state = roomService.getRoomStateForClient(testRoomId);
    expect(state.strokes.length).toBe(0);
    expect(state.canRedo).toBe(true);
  });

  test('should remove user and delete empty room', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });
    
    const isEmpty = roomService.removeUser(testRoomId, 'user1');
    expect(isEmpty).toBe(true);
    
    // Room still exists after user removal - must explicitly delete
    expect(roomService.roomExists(testRoomId)).toBe(true);
    
    roomService.deleteRoom(testRoomId);
    expect(roomService.roomExists(testRoomId)).toBe(false);
  });

  test('should handle canvas clear', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });

    roomService.addStroke(testRoomId, {
      type: EVENT_TYPES.STROKE_CONTINUE,
      userId: 'user1',
      timestamp: Date.now(),
      data: { x: 10, y: 10 }
    });

    roomService.clearStrokes(testRoomId);
    const room = roomService.getRoom(testRoomId);
    expect(room.strokes.length).toBe(0);
  });

  test('should provide room state for client sync', () => {
    roomService.createRoom(testRoomId);
    roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });

    roomService.addStroke(testRoomId, {
      type: EVENT_TYPES.STROKE_CONTINUE,
      userId: 'user1',
      timestamp: Date.now(),
      data: { x: 10, y: 10 }
    });

    const state = roomService.getRoomStateForClient(testRoomId);
    expect(state.users).toBeDefined();
    expect(state.strokes).toBeDefined();
    expect(state.strokes.length).toBe(1);
  });
});
