import { EVENT_TYPES, STROKE_REPLAY_BATCH_SIZE } from '../utils/constants';
import canvasService from './canvasService';

/**
 * Core drawing engine for handling stroke replay and rendering
 */
class DrawingEngine {
  /**
   * Replay a list of strokes on the canvas with batched rendering
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Array} strokes - Array of stroke events
   */
  replayStrokes(ctx, canvas, strokes) {
    // Always check ctx and canvas first
    if (!ctx || !canvas) {
      console.error('Canvas context or element not available');
      return;
    }

    console.log(`Replaying ${strokes ? strokes.length : 0} strokes`);

    // ALWAYS clear canvas first, even if strokes is empty
    canvasService.clearCanvas(ctx, canvas);

    // If no strokes to replay, we're done (canvas is now clear)
    if (!strokes || strokes.length === 0) {
      console.log('Replay complete (empty canvas)');
      return;
    }

    // Batch rendering for performance
    let currentIndex = 0;

    const processNextBatch = () => {
      const endIndex = Math.min(
        currentIndex + STROKE_REPLAY_BATCH_SIZE,
        strokes.length
      );

      // Process batch
      for (let i = currentIndex; i < endIndex; i++) {
        this.renderStrokeEvent(ctx, strokes[i]);
      }

      currentIndex = endIndex;

      // Schedule next batch if needed
      if (currentIndex < strokes.length) {
        requestAnimationFrame(processNextBatch);
      } else {
        console.log('Replay complete');
      }
    };

    // Start processing
    requestAnimationFrame(processNextBatch);
  }

  /**
   * Render a single stroke event
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} event - Stroke event
   */
  renderStrokeEvent(ctx, event) {
    if (!event || !event.type) {
      console.warn('Invalid stroke event:', event);
      return;
    }

    const { type, data } = event;

    switch (type) {
      case EVENT_TYPES.STROKE_START:
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          canvasService.beginPath(ctx, data.x, data.y);
        }
        break;

      case EVENT_TYPES.STROKE_CONTINUE:
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          canvasService.drawLine(
            ctx,
            data.x,
            data.y,
            data.color,
            data.size,
            data.tool
          );
        }
        break;

      case EVENT_TYPES.STROKE_END:
        canvasService.endPath(ctx);
        break;

      default:
        console.warn(`Unknown stroke type: ${type}`);
    }
  }

  /**
   * Create a drawing event object
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @returns {Object} Drawing event
   */
  createDrawingEvent(type, data = {}) {
    return {
      type,
      data
    };
  }
}

// Export singleton instance
const drawingEngine = new DrawingEngine();
export default drawingEngine;