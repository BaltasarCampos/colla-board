import { useState, useEffect } from 'react';
import canvasService from '../services/canvasService';

/**
 * Hook for managing canvas initialization and context
 * @param {RefObject} canvasRef - Reference to canvas element
 * @returns {Object} Canvas context and loading state
 */
export const useCanvas = (canvasRef) => {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const ctx = canvasService.initializeCanvas(canvas);
      setContext(ctx);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
      setIsLoading(false);
    }
  }, [canvasRef]);

  // Handle window resize
  useEffect(() => {
    if (!context) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      canvasService.resizeCanvas(context, canvas);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [context, canvasRef]);

  return { context, isLoading };
};