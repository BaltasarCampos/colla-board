import drawingEngine from '../../../services/drawingEngine';
import canvasService from '../../../services/canvasService';
import { EVENT_TYPES } from '../../../utils/constants';

// Mock canvasService
jest.mock('../../../services/canvasService');

describe('DrawingEngine', () => {
  let mockCtx;
  let mockCanvas;

  beforeEach(() => {
    // Create mock canvas context
    mockCtx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
    };

    // Create mock canvas element
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: jest.fn(() => mockCtx),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createDrawingEvent', () => {
    test('should create event with type and data', () => {
      const event = drawingEngine.createDrawingEvent(EVENT_TYPES.STROKE_START, {
        x: 10,
        y: 20,
        color: '#000',
      });

      expect(event).toEqual({
        type: EVENT_TYPES.STROKE_START,
        data: { x: 10, y: 20, color: '#000' },
      });
    });

    test('should create event with empty data if not provided', () => {
      const event = drawingEngine.createDrawingEvent(EVENT_TYPES.STROKE_END);

      expect(event).toEqual({
        type: EVENT_TYPES.STROKE_END,
        data: {},
      });
    });
  });

  describe('renderStrokeEvent', () => {
    test('should render STROKE_START event', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
        data: { x: 10, y: 20 },
      };

      drawingEngine.renderStrokeEvent(mockCtx, event);

      expect(canvasService.beginPath).toHaveBeenCalledWith(mockCtx, 10, 20);
    });

    test('should render STROKE_CONTINUE event', () => {
      const event = {
        type: EVENT_TYPES.STROKE_CONTINUE,
        data: { x: 15, y: 25, color: '#ff0000', size: 5, tool: 'pen' },
      };

      drawingEngine.renderStrokeEvent(mockCtx, event);

      expect(canvasService.drawLine).toHaveBeenCalledWith(
        mockCtx,
        15,
        25,
        '#ff0000',
        5,
        'pen'
      );
    });

    test('should render STROKE_END event', () => {
      const event = {
        type: EVENT_TYPES.STROKE_END,
      };

      drawingEngine.renderStrokeEvent(mockCtx, event);

      expect(canvasService.endPath).toHaveBeenCalledWith(mockCtx);
    });

    test('should handle invalid event gracefully', () => {
      const event = {
        type: 'UNKNOWN_TYPE',
        data: {},
      };

      // Should not throw
      expect(() => {
        drawingEngine.renderStrokeEvent(mockCtx, event);
      }).not.toThrow();
    });

    test('should handle event without data', () => {
      const event = {
        type: EVENT_TYPES.STROKE_START,
      };

      // Should not throw
      expect(() => {
        drawingEngine.renderStrokeEvent(mockCtx, event);
      }).not.toThrow();
    });

    test('should handle null event', () => {
      // Should not throw
      expect(() => {
        drawingEngine.renderStrokeEvent(mockCtx, null);
      }).not.toThrow();
    });
  });

  describe('replayStrokes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should clear canvas when replaying empty strokes', () => {
      drawingEngine.replayStrokes(mockCtx, mockCanvas, []);

      expect(canvasService.clearCanvas).toHaveBeenCalledWith(mockCtx, mockCanvas);
    });

    test('should clear canvas before replaying strokes', () => {
      const strokes = [
        { type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } },
      ];

      drawingEngine.replayStrokes(mockCtx, mockCanvas, strokes);

      expect(canvasService.clearCanvas).toHaveBeenCalledWith(mockCtx, mockCanvas);
    });

    test('should replay single stroke', () => {
      const strokes = [
        { type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } },
        { type: EVENT_TYPES.STROKE_CONTINUE, data: { x: 15, y: 15, color: '#000', size: 3, tool: 'pen' } },
        { type: EVENT_TYPES.STROKE_END },
      ];

      drawingEngine.replayStrokes(mockCtx, mockCanvas, strokes);

      // Fast-forward through all timers
      jest.runAllTimers();

      expect(canvasService.beginPath).toHaveBeenCalledWith(mockCtx, 10, 10);
      expect(canvasService.drawLine).toHaveBeenCalled();
      expect(canvasService.endPath).toHaveBeenCalledWith(mockCtx);
    });

    test('should handle null context', () => {
      const strokes = [
        { type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } },
      ];

      expect(() => {
        drawingEngine.replayStrokes(null, mockCanvas, strokes);
      }).not.toThrow();

      expect(canvasService.clearCanvas).not.toHaveBeenCalled();
    });

    test('should handle null canvas', () => {
      const strokes = [
        { type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } },
      ];

      expect(() => {
        drawingEngine.replayStrokes(mockCtx, null, strokes);
      }).not.toThrow();

      expect(canvasService.clearCanvas).not.toHaveBeenCalled();
    });

    test('should replay multiple strokes in batches', () => {
      // Create more strokes than batch size
      const strokes = [];
      for (let i = 0; i < 150; i++) {
        strokes.push({
          type: EVENT_TYPES.STROKE_CONTINUE,
          data: { x: i, y: i, color: '#000', size: 3, tool: 'pen' },
        });
      }

      drawingEngine.replayStrokes(mockCtx, mockCanvas, strokes);

      // Fast-forward through all timers
      jest.runAllTimers();

      expect(canvasService.drawLine).toHaveBeenCalledTimes(150);
    });
  });

  describe('Performance', () => {
    test('should handle large number of strokes efficiently', () => {
      const strokes = [];
      for (let i = 0; i < 1000; i++) {
        strokes.push({
          type: EVENT_TYPES.STROKE_CONTINUE,
          data: { x: i, y: i, color: '#000', size: 3, tool: 'pen' },
        });
      }

      const startTime = performance.now();
      drawingEngine.replayStrokes(mockCtx, mockCanvas, strokes);
      const endTime = performance.now();

      // Should complete quickly (within 100ms for setup)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});