/**
 * Calculate the Euclidean distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between the two points
 */
export const getDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Get mouse position relative to canvas
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Object} Object with x and y coordinates
 */
export const getMousePosition = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

/**
 * Check if a point has moved significantly from the last point
 * @param {Object} lastPoint - Previous point {x, y}
 * @param {Object} currentPoint - Current point {x, y}
 * @param {number} minDistance - Minimum distance threshold
 * @returns {boolean} True if point has moved significantly
 */
export const hasMovedSignificantly = (lastPoint, currentPoint, minDistance) => {
  if (!lastPoint) return true;
  
  const distance = getDistance(
    lastPoint.x,
    lastPoint.y,
    currentPoint.x,
    currentPoint.y
  );
  
  return distance >= minDistance;
};