import { renderHook } from '@testing-library/react';
import { useCanvas } from '../../../hooks/useCanvas';

jest.mock('../../../services/canvasService');

import canvasService from '../../../services/canvasService';

describe('useCanvas Hook', () => {
  let mockCanvas;
  let mockContext;
  let canvasRef;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
    };

    mockCanvas = {
      width: 800,
      height: 600,
      getContext: jest.fn(() => mockContext),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    };

    canvasRef = { current: mockCanvas };

    canvasService.initializeCanvas.mockReturnValue(mockContext);
    canvasService.resizeCanvas.mockImplementation(() => {});
  });

  describe('Canvas Initialization', () => {
    test('should initialize canvas and set context', () => {
      const { result } = renderHook(() => useCanvas(canvasRef));

      expect(result.current.context).toBe(mockContext);
      expect(result.current.isLoading).toBe(false);
      expect(canvasService.initializeCanvas).toHaveBeenCalledWith(mockCanvas);
    });

    test('should set loading to false after initialization', async () => {
      const { result } = renderHook(() => useCanvas(canvasRef));

      expect(result.current.isLoading).toBe(false);
    });

    test('should handle initialization error gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      canvasService.initializeCanvas.mockImplementation(() => {
        throw new Error('Canvas initialization failed');
      });

      const { result } = renderHook(() => useCanvas(canvasRef));

      expect(result.current.context).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should handle missing canvas reference', () => {
      const emptyRef = { current: null };
      const { result } = renderHook(() => useCanvas(emptyRef));

      expect(result.current.context).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Window Resize Handling', () => {
    test('should listen for window resize events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      renderHook(() => useCanvas(canvasRef));

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    test('should call resizeCanvas on window resize', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      renderHook(() => useCanvas(canvasRef));

      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);

      expect(canvasService.resizeCanvas).toHaveBeenCalledWith(mockContext, mockCanvas);

      removeEventListenerSpy.mockRestore();
    });

    test('should clean up resize listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useCanvas(canvasRef));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    test('should not listen to resize if context not initialized', () => {
      canvasService.initializeCanvas.mockReturnValue(null);
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useCanvas(canvasRef));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('resize', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });
});
