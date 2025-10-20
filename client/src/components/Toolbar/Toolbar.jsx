import { TOOLS } from '../../utils/constants';
import './Toolbar.css';

function Toolbar({
  currentTool,
  setCurrentTool,
  currentColor,
  setCurrentColor,
  brushSize,
  setBrushSize,
  onClearCanvas
}) {
  return (
    <div className="toolbar">
      <div className="tool-group">
        <label>Tool:</label>
        <button
          className={currentTool === TOOLS.PEN ? 'active' : ''}
          onClick={() => setCurrentTool(TOOLS.PEN)}
          title="Pen"
        >
          ✏️ Pen
        </button>
        <button
          className={currentTool === TOOLS.ERASER ? 'active' : ''}
          onClick={() => setCurrentTool(TOOLS.ERASER)}
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
          disabled={currentTool === TOOLS.ERASER}
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
          onClick={onClearCanvas}
          className="clear-button"
          title="Clear canvas for everyone"
        >
          🗑️ Clear Canvas
        </button>
      </div>
    </div>
  );
}

export default Toolbar;