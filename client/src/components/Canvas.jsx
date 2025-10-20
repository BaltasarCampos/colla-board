import { useRef, useEffect } from "react";
import { useCanvas } from "../hooks/useCanvas";
import { useDrawing } from "../hooks/useDrawing";
import { useSocketEvents } from "../hooks/useSocketEvents";
import drawingEngine from "../services/drawingEngine";
import Toolbar from "./Toolbar/Toolbar";
import './Canvas.css';

function Canvas ({ socketService, roomId, userId, userName, initialRoomState }) {
  const canvasRef = useRef(null);
  const { context, isLoading } = useCanvas(canvasRef);

  //Handle drawing events (send to server)
  const handleDrawingEvent = (event) => {
    socketService.sendDrawingEvent(event);
  };

  // Drawing operations
  const {
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
  } = useDrawing(context, canvasRef, handleDrawingEvent);

  // Socket event handlers
  useSocketEvents(socketService, context, canvasRef, userId);

  // Replay initial room state when context is ready
  useEffect(() => {
    if (!context || !initialRoomState) return;

    drawingEngine.replayStrokes(
      context,
      canvasRef.current,
      initialRoomState.strokes
    );
  }, [context, initialRoomState]);

  return (
    <div className="canvas-wrapper">
      <Toolbar
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        onClearCanvas={clearCanvas}
      />
      {isLoading && (
        <div className="canvas-loading">Initializing canvas...</div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="drawing-canvas"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
}

export default Canvas;