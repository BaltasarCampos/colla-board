// Canvas settings
export const CANVAS_MARGIN = 100;
export const CANVAS_HEIGHT_OFFSET = 200;

// Drawing settings
export const MIN_DISTANCE = 2; // Minimum distance between points to record
export const DEFAULT_BRUSH_SIZE = 3;
export const DEFAULT_COLOR = '#000000';
export const ERASER_SIZE_MULTIPLIER = 2;

// Performance settings
export const STROKE_REPLAY_BATCH_SIZE = 100;

// Tools
export const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser'
};

// Event types
export const EVENT_TYPES = {
  STROKE_START: 'stroke-start',
  STROKE_CONTINUE: 'stroke-continue',
  STROKE_END: 'stroke-end',
  CANVAS_CLEAR: 'canvas-clear'
};

// Local event types
export const LOCAL_EVENTS = {
  CONNECTION_STATUS: 'local:connection-status',
  ERROR: 'local:error'
};

// Server event types
export const SERVER_EVENTS = {
  ROOM_STATE: 'room-state',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  DRAWING_EVENT: 'drawing-event'
};