import io from 'socket.io-client';
import { CONNECTION } from '../utils/constants';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

//Prefix for local events
const LOCAL_EVENT_PREFIX = 'local:';

class SocketService {
  constructor () {
    this.socket = null;
    this.eventHandlers = {}; //server events
    this.localEventHandlers = {} //local events
  }

  isLocalEvent(event) { return event.startsWith(LOCAL_EVENT_PREFIX) }

  getEventName(event) { return event.replace(LOCAL_EVENT_PREFIX, '') }

  // Connect to the server
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to server:', SERVER_URL);
    
    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: CONNECTION.RECONNECTION,
      reconnectionDelay: CONNECTION.RECONNECTION_DELAY,
      reconnectionAttempts: CONNECTION.RECONNECTION_ATTEMPTS
    });

    // Set up default event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.emitLocal('local:connection-status', true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.emitLocal('local:connection-status', false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emitLocal('local:error', error);
    });

    return this.socket;
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emit an event to the server
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.error('Cannot emit - socket not connected');
    }
  }

  // Emit a local event (not sent to server)
  emitLocal(event, data) {
    if (!this.isLocalEvent(event)) {
      console.warn(`Event '${event}' should use '${LOCAL_EVENT_PREFIX}' prefix for local events`);
    }

    if (this.localEventHandlers[event]) {
      this.localEventHandlers[event].forEach(handler => handler(data));
    }
  }

  // Listen for an event from the server OR local event
  on(event, handler) {
    // Check if this is a local event
    if (this.isLocalEvent(event)) {
      if (!this.localEventHandlers[event]) {
        this.localEventHandlers[event] = [];
      }
      this.localEventHandlers[event].push(handler);
      
      // Special case: immediately call with current connection status
      if (event === 'local:connection-status' && this.socket?.connected) {
        handler(true);
      }
      return;
    }

    // Otherwise, it's a server event
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.on(event, handler);

    // Store handler for cleanup
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  // Remove event listener
  off(event, handler) {
    // Check if it's a local event
    if (this.isLocalEvent(event)) {
      if (this.localEventHandlers[event]) {
        this.localEventHandlers[event] = this.localEventHandlers[event].filter(
          h => h !== handler
        );
      }
      return;
    }

    // Otherwise, it's a server event
    if (this.socket) {
      this.socket.off(event, handler);
    }

    // Remove from stored handlers
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        h => h !== handler
      );
    }
  }

  // Join a room
  joinRoom(roomId, userId, userName) {
    console.log(`Joining room: ${roomId} as ${userName}`);
    this.emit('join-room', { roomId, userId, userName });
  }

  // Leave a room
  leaveRoom(roomId) {
    console.log(`Leaving room ${roomId}`);
    this.emit('leave-room', { roomId });
  }

  // Send a drawing event
  sendDrawingEvent(event) {
    this.emit('drawing-event', event);
  }

  // Undo/Redo methods
  undo() {
    console.log('Sending undo request');
    this.emit('undo');
  }

  redo() {
    console.log('Sending redo request');
    this.emit('redo');
  }

  // Get connection status
  isConnected() {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id;
  }
}

const socketService = new SocketService();

export default socketService;