import { useEffect, useRef, useState, useCallback } from 'react';
import './Canvas.css';

function Canvas({ socketService, roomId, userId, userName, initialRoomState }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef(null); // Track last drawn point
  const [context, setContext] = useState(null);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);

  // Performance settings
  const MIN_DISTANCE = 2; // Minimum distance between points to record

  // Initialize canvas
  useEffect(() => {

    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('Initializing canvas...');

    // Set canvas size
    canvas.width = window.innerWidth - 80; // Leave some margin
    canvas.height = window.innerHeight - 200; // Leave space for header and toolbar

    // Get drawing context
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round'; // Smooth line ends
    ctx.lineJoin = 'round'; // Smooth line joins

    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
    
    setContext(ctx); // This triger the next useEffect
  }, []);

  // Handle window resize
  useEffect(() => {
    if (!context) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Store current canvas content
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);

      // Resize canvas
      canvas.width = window.innerWidth - 80;
      canvas.height = window.innerHeight - 200;

      // Restore canvas content
      context.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [context]);

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Calculate distance between two points
  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Start drawing
  const startDrawing = (e) => {
    if (!context) return;

    const pos = getMousePos(e);
    setIsDrawing(true);
    lastPointRef.current = pos; // Store starting point

    // Emit stroke-start event
    const event = {
      type: 'stroke-start',
      data: {
        x: pos.x,
        y: pos.y,
        color: currentColor,
        size: brushSize,
        tool: currentTool
      }
    };

    console.log('Start drawing:', event);
    socketService.sendDrawingEvent(event);

    // Draw locally
    context.beginPath();
    context.moveTo(pos.x, pos.y);
  };

  // Draw a line on the canvas
  const drawLine = (ctx, x, y, color, size, tool) => {
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 2 : size;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Continue drawing
  const draw = (e) => {
    if (!isDrawing || !context) return;

    const pos = getMousePos(e);
    const lastPoint = lastPointRef.current;

    // Only send event if point has moved significantly
    if (lastPoint) {
      const distance = getDistance(lastPoint.x, lastPoint.y, pos.x, pos.y);
      
      if (distance < MIN_DISTANCE) {
        // Point too close to last one, skip sending event but still draw locally
        drawLine(context, pos.x, pos.y, currentColor, brushSize, currentTool);
        return;
      }
    }

    // Point is significant, send event
    const event = {
      type: 'stroke-continue',
      data: {
        x: pos.x,
        y: pos.y,
        color: currentColor,
        size: brushSize,
        tool: currentTool
      }
    };

    socketService.sendDrawingEvent(event);
    lastPointRef.current = pos; // Update last point

    // Draw locally
    drawLine(context, pos.x, pos.y, currentColor, brushSize, currentTool);
  };

  // Stop drawing
  const stopDrawing = () => {
    if (!isDrawing || !context) return;

    setIsDrawing(false);
    lastPointRef.current = null; // Reset last point

    // Emit stroke-end event
    const event = {
      type: 'stroke-end',
      data: {}
    };

    console.log('Stop drawing');
    socketService.sendDrawingEvent(event);

    context.closePath();
  };

  // Clear canvas function
  const clearCanvas = useCallback(() => {
    if (!context) return;

    const canvas = canvasRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log('Canvas cleared locally');
  }, [context]);

  // Handle clear canvas button click
  const handleClearCanvas = () => {
    if (!context) return;

    // Clear locally
    clearCanvas();

    // Emit clear event to other users
    const event = {
      type: 'canvas-clear',
      data: {}
    };

    console.log('Emitting canvas-clear event');
    socketService.sendDrawingEvent(event);
  };

  // Helper function to replay strokes on canvas
  // Memoize replayStrokes so it doesn't change on every render
  // Optimized replay with requestAnimationFrame for smooth rendering
  const replayStrokes = useCallback( (strokes) => {
    if (!context || !strokes || strokes.length === 0) {
      console.log('Cannot replay: context or strokes missing', {
        hasContext: !!context,
        strokeCount: strokes?.length || 0
      });
      return;
    }

    console.log('Replaying', strokes.length, 'strokes');

    const canvas = canvasRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Batch size for processing events per frame
    const BATCH_SIZE = 100;
    let currentIndex = 0;

    const processNextBatch = () => {
      const endIndex = Math.min(currentIndex + BATCH_SIZE, strokes.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        const event = strokes[i];
        const { type, data: strokeData } = event;

        if (type === 'stroke-start') {
          context.beginPath();
          context.moveTo(strokeData.x, strokeData.y);
        } else if (type === 'stroke-continue') {
          drawLine(
            context,
            strokeData.x,
            strokeData.y,
            strokeData.color,
            strokeData.size,
            strokeData.tool
          );
        } else if (type === 'stroke-end') {
          context.closePath();
        }
      }

      currentIndex = endIndex;

      if (currentIndex < strokes.length) {
        // More strokes to process, schedule next batch
        requestAnimationFrame(processNextBatch);
      } else {
        console.log('Replay complete');
      }
    };

    // Start processing
    requestAnimationFrame(processNextBatch);
  }, [context]);

  // Replay initial room state when context becomes ready
  useEffect(() => {
    if (!context || !initialRoomState) return;

    console.log('Context ready and room state available, replaying initial strokes');
    replayStrokes(initialRoomState.strokes);
  }, [context, initialRoomState, replayStrokes]);

  // Register socket event listeners ONLY when context is ready
  useEffect(() => {
    // Guard clause - wait for context. Don't register listeners until context is ready
    if (!context) {
      console.log('Context not ready yet, waiting...');
      return;
    }

    console.log('Context ready, registering socket listeners');

    // Handle subsequent room state updates (if any)
    const handleRoomState = (data) => {
      console.log(`Room state update received:`, data.strokes.length, 'strokes');
      replayStrokes(data.strokes);
    };

    // Handle drawing events from other users
    const handleRemoteDrawing = (event) => {
      // Don't draw our own events (already drawn locally)
      if (event.userId === userId) return;

      console.log('Remote drawing event:', event);

      const { type, data } = event;

      // Handle canvas-clear event
      if (type === 'canvas-clear') {
        console.log('Received canvas-clear from another user');
        clearCanvas();
        return;
      }

      // Handle regular drawing events
      if (type === 'stroke-start') {
        context.beginPath();
        context.moveTo(data.x, data.y);
      } else if (type === 'stroke-continue') {
        drawLine(context, data.x, data.y, data.color, data.size, data.tool);
      } else if (type === 'stroke-end') {
        context.closePath();
      }
    };

    // Register listeners
    socketService.on('room-state', handleRoomState);
    socketService.on('drawing-event', handleRemoteDrawing);

    // Cleanup
    return () => {
      console.log('Cleaning up socket listeners');
      socketService.off('room-state', handleRoomState);
      socketService.off('drawing-event', handleRemoteDrawing);
    };
  }, [context, socketService, userId, replayStrokes, clearCanvas]); // Only runs when context changes from null

  return (
    <div className="canvas-wrapper">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="tool-group">
          <label>Tool:</label>
          <button
            className={currentTool === 'pen' ? 'active' : ''}
            onClick={() => setCurrentTool('pen')}
            title="Pen"
          >
            ✏️ Pen
          </button>
          <button
            className={currentTool === 'eraser' ? 'active' : ''}
            onClick={() => setCurrentTool('eraser')}
            title="Eraser"
          >
            🧹 Eraser
          </button>
        </div>

        <div className="tool-group">
          <label>Color:</label>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            disabled={currentTool === 'eraser'}
          />
        </div>

        <div className="tool-group">
          <label>Size: {brushSize}px</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <div className="tool-group">
          <button
            onClick={handleClearCanvas}
            className="clear-button"
            title="Clear canvas for everyone"
          >
            🗑️ Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="drawing-canvas"
      />
    </div>
  );
}

export default Canvas;