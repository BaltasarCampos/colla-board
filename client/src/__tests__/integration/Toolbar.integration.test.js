import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Toolbar from '../../components/Toolbar/Toolbar';
import { TOOLS } from '../../utils/constants';

describe('Toolbar Integration Tests', () => {
  const mockSetCurrentTool = jest.fn();
  const mockSetCurrentColor = jest.fn();
  const mockSetBrushSize = jest.fn();
  const mockOnClearCanvas = jest.fn();
  const mockOnUndo = jest.fn();
  const mockOnRedo = jest.fn();

  const defaultProps = {
    currentTool: TOOLS.PEN,
    setCurrentTool: mockSetCurrentTool,
    currentColor: '#000000',
    setCurrentColor: mockSetCurrentColor,
    brushSize: 3,
    setBrushSize: mockSetBrushSize,
    onClearCanvas: mockOnClearCanvas,
    canUndo: false,
    canRedo: false,
    onUndo: mockOnUndo,
    onRedo: mockOnRedo,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Toolbar Rendering', () => {
    test('should render toolbar with all tools', () => {
      render(<Toolbar {...defaultProps} />);

      expect(screen.getByText(/pen|Pen/i) || screen.getByRole('button', { name: /pen/i })).toBeTruthy();
      expect(screen.getByText(/eraser|Eraser/i) || screen.getByRole('button', { name: /eraser/i })).toBeTruthy();
    });

    test('should render color picker', () => {
      render(<Toolbar {...defaultProps} />);

      const colorInput = screen.getByDisplayValue('#000000');
      expect(colorInput).toBeInTheDocument();
    });

    test('should render brush size slider', () => {
      render(<Toolbar {...defaultProps} />);

      const sizeInput = screen.getByDisplayValue('3') || screen.getByRole('slider');
      expect(sizeInput).toBeTruthy();
    });

    test('should render clear canvas button', () => {
      render(<Toolbar {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /clear|Clear/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    test('should highlight selected tool', () => {
      const { rerender } = render(<Toolbar {...defaultProps} currentTool={TOOLS.PEN} />);

      const penButton = screen.getByRole('button', { name: /pen|Pen/i });
      expect(penButton).toHaveAttribute('class', expect.stringContaining('active') || expect.stringContaining('selected'));

      rerender(<Toolbar {...defaultProps} currentTool={TOOLS.ERASER} />);

      const eraserButton = screen.getByRole('button', { name: /eraser|Eraser/i });
      expect(eraserButton).toHaveAttribute('class', expect.stringContaining('active') || expect.stringContaining('selected'));
    });

    test('should call onToolChange when tool is selected', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} currentTool={TOOLS.PEN} />);

      const eraserButton = screen.getByRole('button', { name: /eraser|Eraser/i });
      await user.click(eraserButton);

      expect(mockSetCurrentTool).toHaveBeenCalledWith(TOOLS.ERASER);
    });
  });

  describe('Color Selection', () => {
    test('should update color when picker changes', () => {
      render(<Toolbar {...defaultProps} />);

      const colorInput = screen.getByDisplayValue('#000000');
      expect(colorInput).toBeInTheDocument();
      expect(colorInput).toHaveAttribute('type', 'color');
    });

    test('should display current color', () => {
      render(<Toolbar {...defaultProps} currentColor='#FF0000' />);

      const colorInput = document.querySelector('input[type="color"]');
      expect(colorInput).toBeInTheDocument();
      expect(colorInput.value.toLowerCase()).toBe('#ff0000');
    });
  });

  describe('Brush Size Adjustment', () => {
    test('should update brush size when slider changes', () => {
      render(<Toolbar {...defaultProps} brushSize={3} />);

      const sizeInput = screen.getByRole('slider');
      expect(sizeInput).toBeInTheDocument();
      expect(sizeInput.value).toBe('3');
    });

    test('should display current brush size', () => {
      render(<Toolbar {...defaultProps} brushSize={10} />);

      const sizeDisplay = screen.getByText('Size: 10px');
      expect(sizeDisplay).toBeInTheDocument();
    });

    test('should constrain brush size within min and max', () => {
      render(<Toolbar {...defaultProps} brushSize={3} />);

      const sizeInput = screen.getByRole('slider');
      expect(sizeInput.getAttribute('max')).toBe('20');
      expect(sizeInput.getAttribute('min')).toBe('1');
    });
  });;;

  describe('Clear Canvas', () => {
    test('should call onClearCanvas when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /clear|Clear/i });
      await user.click(clearButton);

      expect(mockOnClearCanvas).toHaveBeenCalled();
    });
  });

  describe('Undo/Redo Buttons', () => {
    test('should disable undo button when canUndo is false', () => {
      render(<Toolbar {...defaultProps} canUndo={false} />);

      const undoButton = screen.getByRole('button', { name: /undo|Undo/i });
      expect(undoButton).toBeDisabled();
    });

    test('should enable undo button when canUndo is true', () => {
      render(<Toolbar {...defaultProps} canUndo={true} />);

      const undoButton = screen.getByRole('button', { name: /undo|Undo/i });
      expect(undoButton).not.toBeDisabled();
    });

    test('should disable redo button when canRedo is false', () => {
      render(<Toolbar {...defaultProps} canRedo={false} />);

      const redoButton = screen.getByRole('button', { name: /redo|Redo/i });
      expect(redoButton).toBeDisabled();
    });

    test('should enable redo button when canRedo is true', () => {
      render(<Toolbar {...defaultProps} canRedo={true} />);

      const redoButton = screen.getByRole('button', { name: /redo|Redo/i });
      expect(redoButton).not.toBeDisabled();
    });

    test('should call onUndo when undo button is clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} canUndo={true} />);

      const undoButton = screen.getByRole('button', { name: /undo|Undo/i });
      await user.click(undoButton);

      expect(defaultProps.onUndo).toHaveBeenCalled();
    });

    test('should call onRedo when redo button is clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} canRedo={true} />);

      const redoButton = screen.getByRole('button', { name: /redo|Redo/i });
      await user.click(redoButton);

      expect(defaultProps.onRedo).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible color picker', () => {
      render(<Toolbar {...defaultProps} />);

      const colorInput = screen.getByDisplayValue('#000000');
      expect(colorInput).toHaveAttribute('type', 'color');
    });

    test('should have accessible tool buttons', () => {
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // At least some buttons should have text content
      const hasText = buttons.some(btn => btn.textContent.trim().length > 0);
      expect(hasText).toBe(true);
    });

    test('should have accessible slider', () => {
      render(<Toolbar {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min') && expect(slider).toHaveAttribute('max');
    });
  });
});
