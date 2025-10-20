import { TOOLS, ERASER_SIZE_MULTIPLIER, CANVAS_MARGIN, CANVAS_HEIGHT_OFFSET } from '../utils/constants';

/**
 * Service for managing canvas operations
 */
class CanvasService {
  /**
   * Initialize canvas with proper dimensions and settings
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @returns {CanvasRenderingContext2D} Canvas context
   */
  initializeCanvas(canvas) {
    if (!canvas) {
      throw new Error('Canvas element is required');
    }

    canvas.width = window.innerWidth - CANVAS_MARGIN;
    canvas.height = window.innerHeight - CANVAS_HEIGHT_OFFSET;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);

    return ctx;
  }

  /**
   * Draw a line on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - Stroke color
   * @param {number} size - Stroke size
   * @param {string} tool - Tool type (pen or eraser)
   */
  drawLine(ctx, x, y, color, size, tool) {
    if (tool === TOOLS.ERASER) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = size * ERASER_SIZE_MULTIPLIER;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  /**
   * Clear the entire canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  clearCanvas(ctx, canvas) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('Canvas cleared');
  }

  /**
   * Start a new path
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Starting X coordinate
   * @param {number} y - Starting Y coordinate
   */
  beginPath(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  /**
   * End the current path
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  endPath(ctx) {
    ctx.closePath();
  }

  /**
   * Resize canvas while preserving content
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  resizeCanvas(ctx, canvas) {
    if (!ctx || !canvas) return;

    // Save current content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Resize
    canvas.width = window.innerWidth - CANVAS_MARGIN;
    canvas.height = window.innerHeight - CANVAS_HEIGHT_OFFSET;

    // Restore content
    ctx.putImageData(imageData, 0, 0);
  }
}

// Export singleton instance
const canvasService = new CanvasService();
export default canvasService;