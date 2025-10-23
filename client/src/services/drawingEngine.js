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
      return;
    }

    // ALWAYS clear canvas, regardless of stroke count
    canvasService.clearCanvas(ctx, canvas);

    // NOW check if strokes is empty
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
    const { type, data } = event;

    switch (type) {
      case EVENT_TYPES.STROKE_START:
        canvasService.beginPath(ctx, data.x, data.y);
        break;

      case EVENT_TYPES.STROKE_CONTINUE:
        canvasService.drawLine(
          ctx,
          data.x,
          data.y,
          data.color,
          data.size,
          data.tool
        );
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