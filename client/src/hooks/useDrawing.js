import { useState, useRef, useCallback } from 'react';
import { getMousePosition, hasMovedSignificantly } from '../utils/drawingUtils';
import { EVENT_TYPES, MIN_DISTANCE, DEFAULT_BRUSH_SIZE, DEFAULT_COLOR, TOOLS } from '../utils/constants';
import canvasService from '../services/canvasService';
import drawingEngine from '../services/drawingEngine';

/**
 * Hook for managing drawing operations
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {RefObject} canvasRef - Canvas reference
 * @param {Function} onDrawingEvent - Callback when drawing event occurs
 * @returns {Object} Drawing state and handlers
 */
export const useDrawing = (context, canvasRef, onDrawingEvent) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState(TOOLS.PEN);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const lastPointRef = useRef(null);

  const startDrawing = useCallback((e) => {
    if (!context) return;

    const canvas = canvasRef.current;
    const pos = getMousePosition(e, canvas);
    
    setIsDrawing(true);
    lastPointRef.current = pos;

    // Create and emit event
    const event = drawingEngine.createDrawingEvent(EVENT_TYPES.STROKE_START, {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      size: brushSize,
      tool: currentTool
    });

    onDrawingEvent(event);

    // Start drawing locally
    canvasService.beginPath(context, pos.x, pos.y);
  }, [context, canvasRef, currentColor, brushSize, currentTool, onDrawingEvent]);

  const draw = useCallback((e) => {
    if (!isDrawing || !context) return;

    const canvas = canvasRef.current;
    const pos = getMousePosition(e, canvas);

    // Always draw locally for smooth rendering
    canvasService.drawLine(context, pos.x, pos.y, currentColor, brushSize, currentTool);

    // Check if point should be sent to server
    if (!hasMovedSignificantly(lastPointRef.current, pos, MIN_DISTANCE)) {
      return;
    }

    // Create and emit event
    const event = drawingEngine.createDrawingEvent(EVENT_TYPES.STROKE_CONTINUE, {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      size: brushSize,
      tool: currentTool
    });

    onDrawingEvent(event);
    lastPointRef.current = pos;
  }, [isDrawing, context, canvasRef, currentColor, brushSize, currentTool, onDrawingEvent]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !context) return;

    setIsDrawing(false);
    lastPointRef.current = null;

    // Create and emit event
    const event = drawingEngine.createDrawingEvent(EVENT_TYPES.STROKE_END);
    onDrawingEvent(event);

    canvasService.endPath(context);
  }, [isDrawing, context, onDrawingEvent]);

  const clearCanvas = useCallback(() => {
    if (!context) return;

    const canvas = canvasRef.current;
    canvasService.clearCanvas(context, canvas);

    // Create and emit event
    const event = drawingEngine.createDrawingEvent(EVENT_TYPES.CANVAS_CLEAR);
    onDrawingEvent(event);
  }, [context, canvasRef, onDrawingEvent]);

  return {
    isDrawing,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    brushSize,
    setBrushSize,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas
  };
};