import { useState, useEffect, useCallback } from 'react';
import { SERVER_EVENTS, SHORTCUTS } from '../utils/constants';

/**
 * Hook for managing undo/redo functionality
 * @param {Object} socketService - Socket service instance
 * @returns {Object} Undo/redo state and handlers
 */
export const useUndoRedo = (socketService) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Handle undo action
  const undo = useCallback(() => {
    if (!canUndo || !socketService) return;
    socketService.undo();
  }, [canUndo, socketService]);

  // Handle redo action
  const redo = useCallback(() => {
    if (!canRedo || !socketService) return;
    socketService.redo();
  }, [canRedo, socketService]);

  // Listen for history updates from server
  useEffect(() => {
    if (!socketService) return;

    const handleHistoryUpdate = (data) => {
      console.log('History update:', data);
      setCanUndo(data.canUndo);
      setCanRedo(data.canRedo);
    };

    const handleRoomState = (data) => {
      // Update undo/redo state when receiving room state
      setCanUndo(data.canUndo || false);
      setCanRedo(data.canRedo || false);
    };

    socketService.on(SERVER_EVENTS.HISTORY_UPDATE, handleHistoryUpdate);
    socketService.on(SERVER_EVENTS.ROOM_STATE, handleRoomState);

    return () => {
      socketService.off(SERVER_EVENTS.HISTORY_UPDATE, handleHistoryUpdate);
      socketService.off(SERVER_EVENTS.ROOM_STATE, handleRoomState);
    };
  }, [socketService]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+Z (Undo)
      if (
        e.key.toLowerCase() === SHORTCUTS.UNDO.key &&
        e.ctrlKey === SHORTCUTS.UNDO.ctrl &&
        e.shiftKey === SHORTCUTS.UNDO.shift
      ) {
        e.preventDefault();
        undo();
      }

      // Check for Ctrl+Shift+Z (Redo)
      if (
        e.key.toLowerCase() === SHORTCUTS.REDO.key &&
        e.ctrlKey === SHORTCUTS.REDO.ctrl &&
        e.shiftKey === SHORTCUTS.REDO.shift
      ) {
        e.preventDefault();
        redo();
      }

      // Check for Ctrl+Y (Redo alternative)
      if (
        e.key.toLowerCase() === SHORTCUTS.REDO_ALT.key &&
        e.ctrlKey === SHORTCUTS.REDO_ALT.ctrl &&
        e.shiftKey === SHORTCUTS.REDO_ALT.shift
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    canUndo,
    canRedo,
    undo,
    redo
  };
};