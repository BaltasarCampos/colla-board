const roomService = require('../../services/roomService');
const EventHandlers = require('../../events/eventHandlers');
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

  // T007 — Deduplication integration test (MUST FAIL before T011 — Principle I)
  describe('OperationId Deduplication (integration)', () => {
    let eventHandlers;
    let mockIoEmit;
    let mockSocket;

    beforeEach(() => {
      roomService.createRoom(testRoomId);
      roomService.addUser(testRoomId, 'user1', { userName: 'Alice', socketId: 's1' });

      mockIoEmit = jest.fn();
      const mockIo = { to: jest.fn(() => ({ emit: mockIoEmit })) };
      eventHandlers = new EventHandlers(mockIo);

      const mockToEmit = jest.fn();
      mockSocket = {
        id: 's1',
        roomId: testRoomId,
        userId: 'user1',
        userName: 'Alice',
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        to: jest.fn(() => ({ emit: mockToEmit })),
        _toEmit: mockToEmit,
      };
    });

    test('emitting same drawing-event twice results in addStroke called once', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
        operationId: 'int-op-dup-001',
        data: { x: 5, y: 5, color: '#000', size: 3, tool: 'pen' },
      };

      // First emission
      eventHandlers.handleDrawingEvent(mockSocket, { ...event });
      // Second emission — same operationId
      eventHandlers.handleDrawingEvent(mockSocket, { ...event });

      const room = roomService.getRoom(testRoomId);
      expect(room.strokes).toHaveLength(1);
    });

    test('emitting same drawing-event twice results in broadcast emitted exactly once', () => {
      const event = {
        type: EVENT_TYPES.STROKE_CONTINUE,
        operationId: 'int-op-dup-002',
        data: { x: 10, y: 10, color: '#000', size: 3, tool: 'pen' },
      };

      eventHandlers.handleDrawingEvent(mockSocket, { ...event });
      eventHandlers.handleDrawingEvent(mockSocket, { ...event });

      // Only one socket.to(roomId).emit(drawing-event) should have occurred
      expect(mockSocket._toEmit).toHaveBeenCalledTimes(1);
    });
  });
});
