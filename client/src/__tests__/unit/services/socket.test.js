import socketService from '../../../services/socket';
import io from 'socket.io-client';

jest.mock('socket.io-client');

describe('SocketService', () => {
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      connected: false,
      id: 'test-socket-id',
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(),
    };

    io.mockReturnValue(mockSocket);

    // Reset socketService state
    socketService.socket = null;
    socketService.eventHandlers = {};
    socketService.localEventHandlers = {};

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  describe('Connection Management', () => {
    test('should connect to server', () => {
      socketService.connect();

      expect(io).toHaveBeenCalled();
      expect(socketService.socket).toBe(mockSocket);
    });

    test('should not reconnect if already connected', () => {
      socketService.connect();
      const firstSocket = socketService.socket;

      socketService.connect();

      expect(socketService.socket).toBe(firstSocket);
    });

    test('should set up connection event listeners', () => {
      socketService.connect();

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    test('should disconnect from server', () => {
      socketService.connect();
      socketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(socketService.socket).toBeNull();
    });

    test('should handle disconnect gracefully when not connected', () => {
      socketService.disconnect();

      expect(socketService.socket).toBeNull();
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      socketService.connect();
      mockSocket.connected = true;
    });

    test('should emit event to server', () => {
      socketService.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    test('should not emit if socket not connected', () => {
      mockSocket.connected = false;

      socketService.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should emit local event without sending to server', () => {
      socketService.on('local:test', jest.fn());
      socketService.emitLocal('local:test', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Room Operations', () => {
    beforeEach(() => {
      socketService.connect();
      mockSocket.connected = true;
    });

    test('should join room', () => {
      socketService.joinRoom('room-123', 'user-123', 'John');

      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'room-123',
        userId: 'user-123',
        userName: 'John',
      });
    });

    test('should leave room', () => {
      socketService.leaveRoom('room-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-room', {
        roomId: 'room-123',
      });
    });
  });

  describe('Drawing Operations', () => {
    beforeEach(() => {
      socketService.connect();
      mockSocket.connected = true;
    });

    test('should send drawing event', () => {
      const event = { type: 'stroke-start', data: { x: 10, y: 20 } };

      socketService.sendDrawingEvent(event);

      expect(mockSocket.emit).toHaveBeenCalledWith('drawing-event', event);
    });

    test('should undo', () => {
      socketService.undo();

      expect(mockSocket.emit).toHaveBeenCalledWith('undo', undefined);
    });

    test('should redo', () => {
      socketService.redo();

      expect(mockSocket.emit).toHaveBeenCalledWith('redo', undefined);
    });
  });

  describe('Event Listeners', () => {
    beforeEach(() => {
      socketService.connect();
    });

    test('should register server event listener', () => {
      const handler = jest.fn();

      socketService.on('room-state', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('room-state', handler);
    });

    test('should register local event listener', () => {
      const handler = jest.fn();

      socketService.on('local:connection-status', handler);

      expect(mockSocket.on).not.toHaveBeenCalledWith('local:connection-status', handler);
    });

    test('should handle local event emission', () => {
      const handler = jest.fn();

      socketService.on('local:test-event', handler);
      socketService.emitLocal('local:test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should remove server event listener', () => {
      const handler = jest.fn();

      socketService.on('room-state', handler);
      socketService.off('room-state', handler);

      expect(mockSocket.off).toHaveBeenCalledWith('room-state', handler);
    });

    test('should remove local event listener', () => {
      const handler = jest.fn();

      socketService.on('local:test-event', handler);
      socketService.off('local:test-event', handler);

      socketService.emitLocal('local:test-event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    test('should return connection status', () => {
      expect(socketService.isConnected()).toBe(false);

      socketService.connect();
      mockSocket.connected = true;

      expect(socketService.isConnected()).toBe(true);
    });

    test('should return socket ID', () => {
      socketService.connect();

      expect(socketService.getSocketId()).toBe('test-socket-id');
    });

    test('should return null socket ID if not connected', () => {
      expect(socketService.getSocketId()).toBeUndefined();
    });
  });

  describe('Local Events', () => {
    test('should emit connection-status on successful connection', () => {
      const handler = jest.fn();

      socketService.on('local:connection-status', handler);
      socketService.connect();

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )[1];

      mockSocket.connected = true;
      connectHandler();

      expect(handler).toHaveBeenCalledWith(true);
    });

    test('should emit disconnection status', () => {
      socketService.connect();
      mockSocket.connected = true;

      const handler = jest.fn();
      socketService.on('local:connection-status', handler);

      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )[1];

      mockSocket.connected = false;
      disconnectHandler('io client namespace disconnect');

      expect(handler).toHaveBeenCalledWith(false);
    });

    test('should emit error event on connection error', () => {
      socketService.connect();

      const handler = jest.fn();
      socketService.on('local:error', handler);

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )[1];

      const error = new Error('Connection failed');
      errorHandler(error);

      expect(handler).toHaveBeenCalledWith(error);
    });
  });

  describe('Event Handlers Storage', () => {
    beforeEach(() => {
      socketService.connect();
    });

    test('should store server event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      socketService.on('event1', handler1);
      socketService.on('event1', handler2);

      expect(socketService.eventHandlers['event1']).toContain(handler1);
      expect(socketService.eventHandlers['event1']).toContain(handler2);
    });

    test('should store local event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      socketService.on('local:event1', handler1);
      socketService.on('local:event1', handler2);

      expect(socketService.localEventHandlers['local:event1']).toContain(handler1);
      expect(socketService.localEventHandlers['local:event1']).toContain(handler2);
    });
  });
});
