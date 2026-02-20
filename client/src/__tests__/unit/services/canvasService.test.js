import canvasService from '../../../services/canvasService';
import { TOOLS, ERASER_SIZE_MULTIPLIER } from '../../../utils/constants';

describe('CanvasService', () => {
  let mockContext;
  let mockCanvas;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      lineCap: '',
      lineJoin: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(),
        width: 100,
        height: 100,
      })),
      putImageData: jest.fn(),
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockContext),
    };

    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('Initialize Canvas', () => {
    test('should initialize canvas with correct dimensions', () => {
      canvasService.initializeCanvas(mockCanvas);

      expect(mockCanvas.width).toBeGreaterThan(0);
      expect(mockCanvas.height).toBeGreaterThan(0);
    });

    test('should set canvas context properties', () => {
      canvasService.initializeCanvas(mockCanvas);

      expect(mockContext.lineCap).toBe('round');
      expect(mockContext.lineJoin).toBe('round');
    });

    test('should return canvas context', () => {
      const context = canvasService.initializeCanvas(mockCanvas);

      expect(context).toBe(mockContext);
    });

    test('should throw error if canvas is null', () => {
      expect(() => canvasService.initializeCanvas(null)).toThrow(
        'Canvas element is required'
      );
    });

    test('should log initialization message', () => {
      canvasService.initializeCanvas(mockCanvas);

      expect(console.log).toHaveBeenCalled();
      expect(console.log.mock.calls[0][0]).toContain('Canvas initialized');
    });
  });

  describe('Draw Line', () => {
    beforeEach(() => {
      canvasService.initializeCanvas(mockCanvas);
    });

    test('should set strokeStyle and lineWidth for pen tool', () => {
      const color = '#FF0000';
      const size = 5;

      canvasService.drawLine(mockContext, 100, 100, color, size, TOOLS.PEN);

      expect(mockContext.strokeStyle).toBe(color);
      expect(mockContext.lineWidth).toBe(size);
    });

    test('should draw line to coordinates', () => {
      canvasService.drawLine(mockContext, 100, 100, '#000', 3, TOOLS.PEN);

      expect(mockContext.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    test('should apply eraser tool styling', () => {
      const size = 5;

      canvasService.drawLine(mockContext, 100, 100, '#000', size, TOOLS.ERASER);

      expect(mockContext.strokeStyle).toBe('#FFFFFF');
      expect(mockContext.lineWidth).toBe(size * ERASER_SIZE_MULTIPLIER);
    });

    test('should handle different colors', () => {
      const testColors = ['#FF0000', '#00FF00', '#0000FF'];

      testColors.forEach((color) => {
        canvasService.drawLine(mockContext, 100, 100, color, 3, TOOLS.PEN);
        expect(mockContext.strokeStyle).toBe(color);
      });
    });
  });

  describe('Clear Canvas', () => {
    test('should clear rect with canvas dimensions', () => {
      mockCanvas.width = 800;
      mockCanvas.height = 600;

      canvasService.clearCanvas(mockContext, mockCanvas);

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    test('should log clear message', () => {
      canvasService.clearCanvas(mockContext, mockCanvas);

      expect(console.log).toHaveBeenCalledWith('Canvas cleared');
    });

    test('should handle null context gracefully', () => {
      canvasService.clearCanvas(null, mockCanvas);

      expect(mockContext.clearRect).not.toHaveBeenCalled();
    });

    test('should handle null canvas gracefully', () => {
      canvasService.clearCanvas(mockContext, null);

      expect(mockContext.clearRect).not.toHaveBeenCalled();
    });
  });

  describe('Begin Path', () => {
    test('should start new path and move to coordinates', () => {
      canvasService.beginPath(mockContext, 100, 100);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(100, 100);
    });

    test('should handle multiple beginning paths', () => {
      canvasService.beginPath(mockContext, 50, 50);
      canvasService.beginPath(mockContext, 100, 100);

      expect(mockContext.beginPath).toHaveBeenCalledTimes(2);
      expect(mockContext.moveTo).toHaveBeenNthCalledWith(1, 50, 50);
      expect(mockContext.moveTo).toHaveBeenNthCalledWith(2, 100, 100);
    });
  });

  describe('End Path', () => {
    test('should close current path', () => {
      canvasService.endPath(mockContext);

      expect(mockContext.closePath).toHaveBeenCalled();
    });
  });

  describe('Resize Canvas', () => {
    test('should resize canvas to new dimensions', () => {
      mockCanvas.width = 800;
      mockCanvas.height = 600;

      canvasService.resizeCanvas(mockContext, mockCanvas);

      expect(mockCanvas.width).toBeGreaterThan(0);
      expect(mockCanvas.height).toBeGreaterThan(0);
    });

    test('should preserve canvas content', () => {
      mockCanvas.width = 800;
      mockCanvas.height = 600;

      canvasService.resizeCanvas(mockContext, mockCanvas);

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    test('should handle null context gracefully', () => {
      canvasService.resizeCanvas(null, mockCanvas);

      expect(mockContext.getImageData).not.toHaveBeenCalled();
    });

    test('should handle null canvas gracefully', () => {
      canvasService.resizeCanvas(mockContext, null);

      expect(mockContext.getImageData).not.toHaveBeenCalled();
    });
  });
});
