const EventHandlers = require('../../events/eventHandlers');
const roomService = require('../../services/roomService');
const logger = require('../../utils/logger');
const { EVENT_TYPES, SOCKET_EVENTS } = require('../../config/constants');

jest.mock('../../services/roomService');
jest.mock('../../utils/logger');

describe('EventHandlers', () => {
  let eventHandlers;
  let mockIo;
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockToEmit = jest.fn();
    const mockToObj = {
      emit: mockToEmit,
    };

    mockSocket = {
      id: 'socket-123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => mockToObj),
      roomId: null,
      userId: null,
      userName: null,
      _toEmit: mockToEmit, // Expose for testing
    };

    const mockIoToEmit = jest.fn();
    mockIo = {
      to: jest.fn(() => ({
        emit: mockIoToEmit,
      })),
      _toEmit: mockIoToEmit, // Expose for testing
    };

    eventHandlers = new EventHandlers(mockIo);

    // Setup roomService mocks
    roomService.roomExists.mockReturnValue(false);
    roomService.createRoom.mockImplementation();
    roomService.addUser.mockImplementation();
    roomService.getRoomStateForClient.mockReturnValue({
      users: [],
      strokes: [],
      canUndo: false,
      canRedo: false,
    });
    roomService.getRoomStats.mockReturnValue({
      userCount: 1,
      strokeCount: 0,
      undoStackSize: 0,
      redoStackSize: 0,
    });
    roomService.addStroke.mockImplementation();
    roomService.clearStrokes.mockImplementation();
    roomService.canUndo.mockReturnValue(false);
    roomService.canRedo.mockReturnValue(false);
    roomService.undo.mockReturnValue(true);
    roomService.redo.mockReturnValue(true);
    roomService.removeUser.mockReturnValue(false);
    roomService.deleteRoom.mockImplementation();
    // Dedup mocks (default: not a duplicate, record is no-op)
    roomService.isDuplicateOperation.mockReturnValue(false);
    roomService.recordOperation.mockImplementation();
  });

  describe('Handler Registration', () => {
    test('should register all event handlers', () => {
      eventHandlers.registerHandlers(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.JOIN_ROOM, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.LEAVE_ROOM, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.DRAWING_EVENT, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.UNDO, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.REDO, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.DISCONNECT, expect.any(Function));
    });
  });

  describe('Join Room', () => {
    test('should join room successfully', () => {
      const joinHandler = eventHandlers.handleJoinRoom.bind(eventHandlers);

      joinHandler(mockSocket, {
        roomId: 'room-123',
        userId: 'user-123',
        userName: 'John',
      });

      expect(mockSocket.join).toHaveBeenCalledWith('room-123');
      expect(roomService.createRoom).toHaveBeenCalledWith('room-123');
      expect(roomService.addUser).toHaveBeenCalledWith('room-123', 'user-123', {
        userName: 'John',
        socketId: 'socket-123',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ROOM_STATE, expect.any(Object));
    });

    test('should not create room if it already exists', () => {
      roomService.roomExists.mockReturnValue(true);

      const joinHandler = eventHandlers.handleJoinRoom.bind(eventHandlers);

      joinHandler(mockSocket, {
        roomId: 'room-123',
        userId: 'user-123',
        userName: 'John',
      });

      expect(roomService.createRoom).not.toHaveBeenCalled();
    });

    test('should notify other users when someone joins', () => {
      const joinHandler = eventHandlers.handleJoinRoom.bind(eventHandlers);

      joinHandler(mockSocket, {
        roomId: 'room-123',
        userId: 'user-123',
        userName: 'John',
      });

      expect(mockSocket._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.USER_JOINED, expect.any(Object));
    });

    test('should send room state to joining user', () => {
      const mockRoomState = {
        users: [],
        strokes: [],
        canUndo: false,
        canRedo: false,
      };
      roomService.getRoomStateForClient.mockReturnValue(mockRoomState);

      const joinHandler = eventHandlers.handleJoinRoom.bind(eventHandlers);

      joinHandler(mockSocket, {
        roomId: 'room-123',
        userId: 'user-123',
        userName: 'John',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ROOM_STATE, mockRoomState);
    });
  });

  describe('Leave Room', () => {
    test('should leave room successfully', () => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
      mockSocket.userName = 'John';

      const leaveHandler = eventHandlers.handleLeaveRoom.bind(eventHandlers);

      leaveHandler(mockSocket, { roomId: 'room-123' });

      expect(roomService.removeUser).toHaveBeenCalledWith('room-123', 'user-123');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
    });

    test('should delete room if empty after user leaves', () => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
      mockSocket.userName = 'John';

      roomService.removeUser.mockReturnValue(true); // Room is empty

      const leaveHandler = eventHandlers.handleLeaveRoom.bind(eventHandlers);

      leaveHandler(mockSocket, { roomId: 'room-123' });

      expect(roomService.deleteRoom).toHaveBeenCalledWith('room-123');
    });

    test('should notify other users when someone leaves', () => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
      mockSocket.userName = 'John';

      const leaveHandler = eventHandlers.handleLeaveRoom.bind(eventHandlers);

      leaveHandler(mockSocket, { roomId: 'room-123' });

      expect(mockSocket._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.USER_LEFT, expect.any(Object));
    });
  });

  describe('Drawing Events', () => {
    beforeEach(() => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
    });

    test('should handle drawing event', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
        operationId: 'op-fresh-001',
        data: { x: 10, y: 20 },
      };

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(roomService.addStroke).toHaveBeenCalledWith('room-123', expect.objectContaining({
        type: EVENT_TYPES.STROKE_START,
        userId: 'user-123',
        timestamp: expect.any(Number),
      }));
    });

    test('should broadcast drawing event to other users', () => {
      const event = {
        type: EVENT_TYPES.STROKE_CONTINUE,
        operationId: 'op-fresh-002',
        data: { x: 10, y: 20 },
      };

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(mockSocket._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.DRAWING_EVENT, expect.any(Object));
    });

    test('should update history state after drawing', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
        operationId: 'op-fresh-003',
        data: { x: 10, y: 20 },
      };

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(mockIo._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.HISTORY_UPDATE, {
        canUndo: false,
        canRedo: false,
      });
    });

    test('should handle canvas clear event', () => {
      const event = {
        type: EVENT_TYPES.CANVAS_CLEAR,
        operationId: 'op-fresh-004',
      };

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(roomService.clearStrokes).toHaveBeenCalledWith('room-123', 'user-123');
    });

    test('should reject drawing event if user not in room', () => {
      mockSocket.roomId = null;

      const event = {
        type: EVENT_TYPES.STROKE_START,
        operationId: 'op-fresh-005',
        data: { x: 10, y: 20 },
      };

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(roomService.addStroke).not.toHaveBeenCalled();
    });

    test('should reject invalid drawing event', () => {
      const event = null;

      const drawHandler = eventHandlers.handleDrawingEvent.bind(eventHandlers);
      drawHandler(mockSocket, event);

      expect(roomService.addStroke).not.toHaveBeenCalled();
    });
  });

  describe('Undo/Redo', () => {
    beforeEach(() => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
      mockSocket.userName = 'John';
    });

    test('should handle undo action', () => {
      const undoHandler = eventHandlers.handleUndo.bind(eventHandlers);
      undoHandler(mockSocket);

      expect(roomService.undo).toHaveBeenCalledWith('room-123');
    });

    test('should broadcast room state after undo', () => {
      const mockRoomState = {
        users: [],
        strokes: [],
        canUndo: false,
        canRedo: true,
      };
      roomService.getRoomStateForClient.mockReturnValue(mockRoomState);

      const undoHandler = eventHandlers.handleUndo.bind(eventHandlers);
      undoHandler(mockSocket);

      expect(mockIo._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.ROOM_STATE, mockRoomState);
    });

    test('should handle redo action', () => {
      const redoHandler = eventHandlers.handleRedo.bind(eventHandlers);
      redoHandler(mockSocket);

      expect(roomService.redo).toHaveBeenCalledWith('room-123');
    });

    test('should broadcast room state after redo', () => {
      const mockRoomState = {
        users: [],
        strokes: [],
        canUndo: true,
        canRedo: false,
      };
      roomService.getRoomStateForClient.mockReturnValue(mockRoomState);

      const redoHandler = eventHandlers.handleRedo.bind(eventHandlers);
      redoHandler(mockSocket);

      expect(mockIo._toEmit).toHaveBeenCalledWith(SOCKET_EVENTS.ROOM_STATE, mockRoomState);
    });

    test('should reject undo if user not in room', () => {
      mockSocket.roomId = null;

      const undoHandler = eventHandlers.handleUndo.bind(eventHandlers);
      undoHandler(mockSocket);

      expect(roomService.undo).not.toHaveBeenCalled();
    });

    test('should reject redo if user not in room', () => {
      mockSocket.roomId = null;

      const redoHandler = eventHandlers.handleRedo.bind(eventHandlers);
      redoHandler(mockSocket);

      expect(roomService.redo).not.toHaveBeenCalled();
    });
  });

  describe('Disconnect', () => {
    test('should handle disconnect', () => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
      mockSocket.userName = 'John';

      const disconnectHandler = eventHandlers.handleDisconnect.bind(eventHandlers);
      disconnectHandler(mockSocket);

      expect(roomService.removeUser).toHaveBeenCalledWith('room-123', 'user-123');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
    });

    test('should handle disconnect gracefully if not in room', () => {
      mockSocket.roomId = null;

      const disconnectHandler = eventHandlers.handleDisconnect.bind(eventHandlers);

      expect(() => disconnectHandler(mockSocket)).not.toThrow();
    });
  });

  describe('Get Room Stats', () => {
    test('should retrieve room stats', () => {
      const mockStats = {
        userCount: 2,
        strokeCount: 10,
        undoStackSize: 3,
        redoStackSize: 1,
      };
      roomService.getRoomStats.mockReturnValue(mockStats);

      const stats = eventHandlers.getRoomStats('room-123');

      expect(stats).toEqual(mockStats);
      expect(roomService.getRoomStats).toHaveBeenCalledWith('room-123');
    });
  });

  // T006 — OperationId dedup-guard tests (MUST FAIL before T011 — Principle I)
  describe('OperationId Deduplication Guard', () => {
    beforeEach(() => {
      mockSocket.roomId = 'room-123';
      mockSocket.userId = 'user-123';
    });

    test('fresh operationId: addStroke called once, event broadcast once', () => {
      roomService.isDuplicateOperation.mockReturnValue(false);

      const event = { type: EVENT_TYPES.STROKE_START, operationId: 'op-new-001', data: { x: 1, y: 1 } };
      eventHandlers.handleDrawingEvent(mockSocket, event);

      expect(roomService.recordOperation).toHaveBeenCalledWith('room-123', 'op-new-001');
      expect(roomService.addStroke).toHaveBeenCalledTimes(1);
      expect(mockSocket._toEmit).toHaveBeenCalledTimes(1);
    });

    test('duplicate operationId: addStroke NOT called, no broadcast, logger.warn called', () => {
      roomService.isDuplicateOperation.mockReturnValue(true);

      const event = { type: EVENT_TYPES.STROKE_CONTINUE, operationId: 'op-dup-001', data: { x: 2, y: 2 } };
      eventHandlers.handleDrawingEvent(mockSocket, event);

      expect(roomService.addStroke).not.toHaveBeenCalled();
      expect(mockSocket._toEmit).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate'),
        expect.objectContaining({ roomId: 'room-123', userId: 'user-123', operationId: 'op-dup-001' })
      );
    });

    test('missing operationId: addStroke NOT called, logger.error called', () => {
      const event = { type: EVENT_TYPES.STROKE_START, data: { x: 3, y: 3 } }; // no operationId
      eventHandlers.handleDrawingEvent(mockSocket, event);

      expect(roomService.addStroke).not.toHaveBeenCalled();
      expect(mockSocket._toEmit).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('duplicate CANVAS_CLEAR: clearStrokes NOT called, logger.warn called once', () => {
      roomService.isDuplicateOperation.mockReturnValue(true);

      const event = { type: EVENT_TYPES.CANVAS_CLEAR, operationId: 'op-dup-clear' };
      eventHandlers.handleDrawingEvent(mockSocket, event);

      expect(roomService.clearStrokes).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
