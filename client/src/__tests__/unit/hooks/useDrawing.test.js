import { renderHook, act } from '@testing-library/react';
import { useDrawing } from '../../../hooks/useDrawing';
import { EVENT_TYPES, DEFAULT_BRUSH_SIZE, DEFAULT_COLOR, TOOLS } from '../../../utils/constants';
import * as drawingUtils from '../../../utils/drawingUtils';

jest.mock('../../../utils/drawingUtils');
jest.mock('../../../services/canvasService');
jest.mock('../../../services/drawingEngine');

import canvasService from '../../../services/canvasService';
import drawingEngine from '../../../services/drawingEngine';

describe('useDrawing Hook', () => {
  let mockContext;
  let mockCanvas;
  let mockOnDrawingEvent;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
    };

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    };

    mockOnDrawingEvent = jest.fn();

    drawingUtils.getMousePosition.mockReturnValue({ x: 100, y: 100 });
    drawingUtils.hasMovedSignificantly.mockReturnValue(true);

    drawingEngine.createDrawingEvent.mockReturnValue({
      type: EVENT_TYPES.STROKE_START,
      data: { x: 100, y: 100 },
    });

    canvasService.beginPath = jest.fn();
    canvasService.drawLine = jest.fn();
    canvasService.endPath = jest.fn();
    canvasService.clearCanvas = jest.fn();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      expect(result.current.isDrawing).toBe(false);
      expect(result.current.currentTool).toBe(TOOLS.PEN);
      expect(result.current.currentColor).toBe(DEFAULT_COLOR);
      expect(result.current.brushSize).toBe(DEFAULT_BRUSH_SIZE);
    });
  });

  describe('Tool Management', () => {
    test('should change current tool', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      act(() => {
        result.current.setCurrentTool(TOOLS.ERASER);
      });

      expect(result.current.currentTool).toBe(TOOLS.ERASER);
    });

    test('should change brush color', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const newColor = '#FF0000';
      act(() => {
        result.current.setCurrentColor(newColor);
      });

      expect(result.current.currentColor).toBe(newColor);
    });

    test('should change brush size', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const newSize = 10;
      act(() => {
        result.current.setBrushSize(newSize);
      });

      expect(result.current.brushSize).toBe(newSize);
    });
  });

  describe('Drawing Lifecycle', () => {
    test('should start drawing and emit STROKE_START event', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const mockEvent = { clientX: 100, clientY: 100, buttons: 1 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      expect(result.current.isDrawing).toBe(true);
      expect(drawingEngine.createDrawingEvent).toHaveBeenCalledWith(
        EVENT_TYPES.STROKE_START,
        expect.objectContaining({
          x: 100,
          y: 100,
          color: DEFAULT_COLOR,
          size: DEFAULT_BRUSH_SIZE,
          tool: TOOLS.PEN,
        })
      );
      expect(mockOnDrawingEvent).toHaveBeenCalled();
      expect(canvasService.beginPath).toHaveBeenCalled();
    });

    test('should draw and emit STROKE_CONTINUE event', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const mockEvent = { clientX: 100, clientY: 100 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      act(() => {
        result.current.draw(mockEvent);
      });

      expect(canvasService.drawLine).toHaveBeenCalled();
      expect(drawingEngine.createDrawingEvent).toHaveBeenCalledWith(
        EVENT_TYPES.STROKE_CONTINUE,
        expect.any(Object)
      );
    });

    test('should stop drawing and emit STROKE_END event', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const mockEvent = { clientX: 100, clientY: 100 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      act(() => {
        result.current.stopDrawing();
      });

      expect(result.current.isDrawing).toBe(false);
      expect(drawingEngine.createDrawingEvent).toHaveBeenCalledWith(EVENT_TYPES.STROKE_END);
      expect(mockOnDrawingEvent).toHaveBeenCalled();
      expect(canvasService.endPath).toHaveBeenCalled();
    });

    test('should not draw when context is null', () => {
      const { result } = renderHook(() =>
        useDrawing(null, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const mockEvent = { clientX: 100, clientY: 100 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      expect(result.current.isDrawing).toBe(false);
      expect(mockOnDrawingEvent).not.toHaveBeenCalled();
    });

    test('should not draw when already drawing', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      const mockEvent = { clientX: 100, clientY: 100 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      act(() => {
        result.current.draw(mockEvent);
      });

      expect(result.current.isDrawing).toBe(true);
    });
  });

  describe('Canvas Clearing', () => {
    test('should clear canvas and emit CANVAS_CLEAR event', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      act(() => {
        result.current.clearCanvas();
      });

      expect(canvasService.clearCanvas).toHaveBeenCalledWith(mockContext, mockCanvas);
      expect(drawingEngine.createDrawingEvent).toHaveBeenCalledWith(EVENT_TYPES.CANVAS_CLEAR);
      expect(mockOnDrawingEvent).toHaveBeenCalled();
    });

    test('should not clear canvas when context is null', () => {
      const { result } = renderHook(() =>
        useDrawing(null, { current: mockCanvas }, mockOnDrawingEvent)
      );

      act(() => {
        result.current.clearCanvas();
      });

      expect(canvasService.clearCanvas).not.toHaveBeenCalled();
      expect(mockOnDrawingEvent).not.toHaveBeenCalled();
    });
  });

  describe('Minimum Distance Throttling', () => {
    test('should not emit event if minimum distance not reached', () => {
      const { result } = renderHook(() =>
        useDrawing(mockContext, { current: mockCanvas }, mockOnDrawingEvent)
      );

      drawingUtils.hasMovedSignificantly.mockReturnValue(false);

      const mockEvent = { clientX: 100, clientY: 100 };

      act(() => {
        result.current.startDrawing(mockEvent);
      });

      const callCountBeforeDraw = mockOnDrawingEvent.mock.calls.length;

      act(() => {
        result.current.draw(mockEvent);
      });

      expect(mockOnDrawingEvent.mock.calls.length).toBe(callCountBeforeDraw);
    });
  });
});
