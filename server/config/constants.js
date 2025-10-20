// Room settings
const ROOM_LIMITS = {
  MAX_STROKES_PER_ROOM: 10000,
  STROKE_CLEANUP_THRESHOLD: 0.8, // Clean up at 80% capacity
  MAX_USERS_PER_ROOM: 50 // Optional limit
};

// Event types (should match client)
const EVENT_TYPES = {
  STROKE_START: 'stroke-start',
  STROKE_CONTINUE: 'stroke-continue',
  STROKE_END: 'stroke-end',
  CANVAS_CLEAR: 'canvas-clear'
};

// Socket event names (should match client)
const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  DRAWING_EVENT: 'drawing-event',
  DISCONNECT: 'disconnect',
  
  // Server → Client
  ROOM_STATE: 'room-state',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
};

// Connection settings
const CONNECTION = {
  PING_TIMEOUT: 60000,
  PING_INTERVAL: 25000,
  RECONNECTION_ATTEMPTS: 5
};

module.exports = {
  ROOM_LIMITS,
  EVENT_TYPES,
  SOCKET_EVENTS,
  CONNECTION
};