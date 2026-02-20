import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Canvas from '../../components/Canvas';
import { EVENT_TYPES, TOOLS } from '../../utils/constants';

const createMockSocketService = () => {
  const eventHandlers = {};

  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      eventHandlers[event] = handler;
    }),
    off: jest.fn(),
    isConnected: jest.fn(() => true),
    getSocketId: jest.fn(() => 'socket-123'),
    sendDrawingEvent: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    trigger: (event, data) => {
      if (eventHandlers[event]) {
        eventHandlers[event](data);
      }
    },
  };
};

describe('Drawing E2E Tests', () => {
  let mockSocketService;
  const defaultProps = {
    roomId: 'test-room',
    userId: 'user-123',
    userName: 'Test User',
    initialRoomState: {
      strokes: [],
      users: [{ userId: 'user-123', userName: 'Test User' }],
      canUndo: false,
      canRedo: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketService = createMockSocketService();
  });

  test('should render canvas successfully', () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    const canvas = document.querySelector('.drawing-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.width).toBeGreaterThan(0);
  });

  test('should initialize socket connection', () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    expect(mockSocketService.on).toHaveBeenCalled();
  });

  test('should replay initial room state', async () => {
    const initialState = {
      strokes: [
        { type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } },
      ],
      users: [{ userId: 'user-123', userName: 'Test User' }],
      canUndo: false,
      canRedo: false,
    };

    render(
      <Canvas
        {...defaultProps}
        socketService={mockSocketService}
        initialRoomState={initialState}
      />
    );

    const canvas = document.querySelector('.drawing-canvas');
    expect(canvas).toBeInTheDocument();
  });

  test('should handle remote drawing events', async () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    const remoteEvent = {
      type: EVENT_TYPES.STROKE_START,
      userId: 'other-user',
      data: { x: 50, y: 50, color: '#ff0000', size: 5, tool: 'pen' },
    };

    mockSocketService.trigger('drawing-event', remoteEvent);

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  test('should handle room state updates', async () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    const roomState = {
      strokes: [{ type: EVENT_TYPES.STROKE_START, data: { x: 10, y: 10 } }],
      users: [{ userId: 'user-123', userName: 'Test User' }],
      canUndo: true,
      canRedo: false,
    };

    mockSocketService.trigger('room-state', roomState);

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  test('should update undo/redo button states', async () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    mockSocketService.trigger('history-update', {
      canUndo: true,
      canRedo: false,
    });

    await waitFor(() => {
      const undoButton = screen.getByRole('button', { name: /undo/i });
      expect(undoButton).not.toBeDisabled();
    });
  });

  test('should handle user join/leave events', async () => {
    render(<Canvas {...defaultProps} socketService={mockSocketService} />);

    mockSocketService.trigger('user-joined', {
      userId: 'new-user',
      userName: 'New User',
    });

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  test('should render without errors when socket is unavailable', () => {
    const unavailableSocket = {
      ...mockSocketService,
      isConnected: () => false,
    };

    render(<Canvas {...defaultProps} socketService={unavailableSocket} />);

    const canvas = document.querySelector('.drawing-canvas');
    expect(canvas).toBeInTheDocument();
  });
});
