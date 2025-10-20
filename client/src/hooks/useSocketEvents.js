import { useEffect, useCallback } from 'react';
import { SERVER_EVENTS, EVENT_TYPES } from '../utils/constants';
import canvasService from '../services/canvasService';
import drawingEngine from '../services/drawingEngine';

/**
 * Hook for managing socket event listeners
 * @param {Object} socketService - Socket service instance
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {RefObject} canvasRef - Canvas reference
 * @param {string} userId - Current user ID
 * @param {Function} onRoomStateReceived - Callback when room state is received
 * @returns {Object} Socket event handlers
 */
export const useSocketEvents = (
  socketService,
  context,
  canvasRef,
  userId,
  onRoomStateReceived
) => {
  // Replay strokes from room state
  const replayRoomState = useCallback((strokes) => {
    if (!context) return;
    
    const canvas = canvasRef.current;
    drawingEngine.replayStrokes(context, canvas, strokes);
  }, [context, canvasRef]);

  // Handle remote drawing events
  const handleRemoteDrawing = useCallback((event) => {
    if (!context || event.userId === userId) return;

    const { type } = event;

    if (type === EVENT_TYPES.CANVAS_CLEAR) {
      const canvas = canvasRef.current;
      canvasService.clearCanvas(context, canvas);
      return;
    }

    // Render the stroke event
    drawingEngine.renderStrokeEvent(context, event);
  }, [context, canvasRef, userId]);

  // Register socket listeners
  useEffect(() => {
    if (!context || !socketService) return;

    console.log('Registering socket event listeners');

    // Room state listener
    const handleRoomState = (data) => {
      console.log('Room state received:', data.strokes.length, 'strokes');
      replayRoomState(data.strokes);
      onRoomStateReceived?.(data);
    };

    // Register listeners
    socketService.on(SERVER_EVENTS.ROOM_STATE, handleRoomState);
    socketService.on(SERVER_EVENTS.DRAWING_EVENT, handleRemoteDrawing);

    // Cleanup
    return () => {
      console.log('Cleaning up socket event listeners');
      socketService.off(SERVER_EVENTS.ROOM_STATE, handleRoomState);
      socketService.off(SERVER_EVENTS.DRAWING_EVENT, handleRemoteDrawing);
    };
  }, [context, socketService, userId, replayRoomState, handleRemoteDrawing, onRoomStateReceived]);

  return {
    replayRoomState
  };
};