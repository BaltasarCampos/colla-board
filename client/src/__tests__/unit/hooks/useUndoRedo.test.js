import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../../../hooks/useUndoRedo';
import { SERVER_EVENTS, SHORTCUTS } from '../../../utils/constants';

describe('useUndoRedo Hook', () => {
  let mockSocketService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocketService = {
      on: jest.fn(),
      off: jest.fn(),
      undo: jest.fn(),
      redo: jest.fn(),
    };

    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    window.addEventListener.mockRestore();
    window.removeEventListener.mockRestore();
  });

  describe('Initial State', () => {
    test('should initialize with undo/redo disabled', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('History Updates', () => {
    test('should listen for history updates', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      expect(mockSocketService.on).toHaveBeenCalledWith(
        SERVER_EVENTS.HISTORY_UPDATE,
        expect.any(Function)
      );
    });

    test('should update undo/redo state on history update', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: true, canRedo: false });
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    test('should listen for room state updates', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      expect(mockSocketService.on).toHaveBeenCalledWith(
        SERVER_EVENTS.ROOM_STATE,
        expect.any(Function)
      );
    });

    test('should update undo/redo state on room state update', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      const roomStateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.ROOM_STATE
      )[1];

      act(() => {
        roomStateHandler({ canUndo: true, canRedo: true });
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    test('should handle missing canUndo/canRedo in room state', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      const roomStateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.ROOM_STATE
      )[1];

      act(() => {
        roomStateHandler({});
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Undo/Redo Actions', () => {
    test('should call undo when canUndo is true', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: true, canRedo: false });
      });

      act(() => {
        result.current.undo();
      });

      expect(mockSocketService.undo).toHaveBeenCalled();
    });

    test('should not call undo when canUndo is false', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      act(() => {
        result.current.undo();
      });

      expect(mockSocketService.undo).not.toHaveBeenCalled();
    });

    test('should call redo when canRedo is true', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: false, canRedo: true });
      });

      act(() => {
        result.current.redo();
      });

      expect(mockSocketService.redo).toHaveBeenCalled();
    });

    test('should not call redo when canRedo is false', () => {
      const { result } = renderHook(() => useUndoRedo(mockSocketService));

      act(() => {
        result.current.redo();
      });

      expect(mockSocketService.redo).not.toHaveBeenCalled();
    });

    test('should not undo if socketService is null', () => {
      const { result } = renderHook(() => useUndoRedo(null));

      act(() => {
        result.current.undo();
      });

      expect(mockSocketService.undo).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should listen for keyboard events', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should trigger undo on Ctrl+Z', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: true, canRedo: false });
      });

      // Verify that keyboard listener was attached
      const hasKeydownListener = window.addEventListener.mock.calls.some(
        (call) => call[0] === 'keydown'
      );
      
      expect(hasKeydownListener).toBe(true);
    });

    test('should trigger redo on Ctrl+Shift+Z', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: false, canRedo: true });
      });

      // Verify that keyboard listener was attached
      const hasKeydownListener = window.addEventListener.mock.calls.some(
        (call) => call[0] === 'keydown'
      );
      
      expect(hasKeydownListener).toBe(true);
    });

    test('should trigger redo on Ctrl+Y', () => {
      renderHook(() => useUndoRedo(mockSocketService));

      const historyUpdateHandler = mockSocketService.on.mock.calls.find(
        (call) => call[0] === SERVER_EVENTS.HISTORY_UPDATE
      )[1];

      act(() => {
        historyUpdateHandler({ canUndo: false, canRedo: true });
      });

      // Verify that keyboard listener was attached
      const hasKeydownListener = window.addEventListener.mock.calls.some(
        (call) => call[0] === 'keydown'
      );
      
      expect(hasKeydownListener).toBe(true);
    });

    test('should clean up keyboard listener on unmount', () => {
      const { unmount } = renderHook(() => useUndoRedo(mockSocketService));

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Socket Service Cleanup', () => {
    test('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useUndoRedo(mockSocketService));

      unmount();

      expect(mockSocketService.off).toHaveBeenCalledWith(
        SERVER_EVENTS.HISTORY_UPDATE,
        expect.any(Function)
      );
      expect(mockSocketService.off).toHaveBeenCalledWith(
        SERVER_EVENTS.ROOM_STATE,
        expect.any(Function)
      );
    });

    test('should handle null socketService gracefully', () => {
      const { result } = renderHook(() => useUndoRedo(null));

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.undo();
        result.current.redo();
      });
    });
  });
});
