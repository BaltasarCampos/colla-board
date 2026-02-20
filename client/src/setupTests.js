import '@testing-library/jest-dom';

// Mock canvas context with all required methods
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(),
    width: 0,
    height: 0,
  })),
  putImageData: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return mockContext;
  }
  return null;
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);