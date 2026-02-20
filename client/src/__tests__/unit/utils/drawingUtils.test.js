import { getDistance, getMousePosition, hasMovedSignificantly } from '../../../utils/drawingUtils';

describe('DrawingUtils', () => {
  describe('getDistance', () => {
    test('should calculate distance between two points', () => {
      const distance = getDistance(0, 0, 3, 4);

      expect(distance).toBe(5);
    });

    test('should calculate distance with same points as zero', () => {
      const distance = getDistance(10, 10, 10, 10);

      expect(distance).toBe(0);
    });

    test('should calculate distance with negative coordinates', () => {
      const distance = getDistance(-1, -1, 2, 3);

      expect(distance).toBeCloseTo(5, 1);
    });

    test('should calculate distance with decimal coordinates', () => {
      const distance = getDistance(0.5, 0.5, 3.5, 4.5);

      expect(distance).toBeCloseTo(5, 1);
    });

    test('should handle large coordinate values', () => {
      const distance = getDistance(0, 0, 1000, 1000);

      expect(distance).toBeCloseTo(1414.21, 1);
    });

    test('should be symmetric (distance from A to B equals distance from B to A)', () => {
      const dist1 = getDistance(0, 0, 5, 5);
      const dist2 = getDistance(5, 5, 0, 0);

      expect(dist1).toBe(dist2);
    });
  });

  describe('getMousePosition', () => {
    let mockCanvas;
    let mockEvent;

    beforeEach(() => {
      mockCanvas = {
        getBoundingClientRect: jest.fn(() => ({
          left: 10,
          top: 20,
          width: 800,
          height: 600,
          right: 810,
          bottom: 620,
        })),
      };

      mockEvent = {
        clientX: 110,
        clientY: 120,
      };
    });

    test('should calculate mouse position relative to canvas', () => {
      const position = getMousePosition(mockEvent, mockCanvas);

      expect(position).toEqual({ x: 100, y: 100 });
    });

    test('should handle negative positions (cursor to left/top of canvas)', () => {
      mockEvent.clientX = 5;
      mockEvent.clientY = 15;

      const position = getMousePosition(mockEvent, mockCanvas);

      expect(position).toEqual({ x: -5, y: -5 });
    });

    test('should handle position at canvas origin', () => {
      mockEvent.clientX = 10;
      mockEvent.clientY = 20;

      const position = getMousePosition(mockEvent, mockCanvas);

      expect(position).toEqual({ x: 0, y: 0 });
    });

    test('should handle position outside canvas bounds', () => {
      mockEvent.clientX = 1000;
      mockEvent.clientY = 1000;

      const position = getMousePosition(mockEvent, mockCanvas);

      expect(position).toEqual({ x: 990, y: 980 });
    });

    test('should call getBoundingClientRect', () => {
      getMousePosition(mockEvent, mockCanvas);

      expect(mockCanvas.getBoundingClientRect).toHaveBeenCalled();
    });
  });

  describe('hasMovedSignificantly', () => {
    test('should return true if no previous point', () => {
      const result = hasMovedSignificantly(null, { x: 50, y: 50 }, 10);

      expect(result).toBe(true);
    });

    test('should return true if distance exceeds minimum', () => {
      const lastPoint = { x: 0, y: 0 };
      const currentPoint = { x: 5, y: 5 };
      const minDistance = 5;

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(true);
    });

    test('should return false if distance less than minimum', () => {
      const lastPoint = { x: 0, y: 0 };
      const currentPoint = { x: 2, y: 2 };
      const minDistance = 5;

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(false);
    });

    test('should return true if distance equals minimum', () => {
      const lastPoint = { x: 0, y: 0 };
      const currentPoint = { x: 5, y: 5 };
      const minDistance = Math.sqrt(50);

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(true);
    });

    test('should handle decimal distances', () => {
      const lastPoint = { x: 0, y: 0 };
      const currentPoint = { x: 2.5, y: 2.5 };
      const minDistance = 4;

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(false);
    });

    test('should handle minimum distance of zero', () => {
      const lastPoint = { x: 10, y: 10 };
      const currentPoint = { x: 10, y: 10 };
      const minDistance = 0;

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(true);
    });

    test('should work with negative coordinates', () => {
      const lastPoint = { x: -10, y: -10 };
      const currentPoint = { x: -5, y: -5 };
      const minDistance = 5;

      const result = hasMovedSignificantly(lastPoint, currentPoint, minDistance);

      expect(result).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should work together: get mouse position and check if moved significantly', () => {
      const mockCanvas = {
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
        })),
      };

      const firstEvent = { clientX: 10, clientY: 10 };
      const secondEvent = { clientX: 20, clientY: 20 };

      const firstPos = getMousePosition(firstEvent, mockCanvas);
      const secondPos = getMousePosition(secondEvent, mockCanvas);

      const moved = hasMovedSignificantly(firstPos, secondPos, 10);

      expect(moved).toBe(true);
    });
  });
});
