# Colla-Board

A collaborative whiteboard app with real-time drawing, undo/redo, and multi-user support. Built with React 19.2 (frontend) and Node.js/Express/Socket.IO (backend).

---

## Architecture Overview

- **Monorepo Structure**
  - `client/` — React 19.2 frontend (Create React App)
  - `server/` — Node.js backend (Express + Socket.IO)
- **Communication**: Real-time events via Socket.IO (see `server/events/eventHandlers.js` and `client/src/hooks/useSocketEvents.js`)
- **Room State**: Managed in-memory on the server (`server/services/roomService.js`). Undo/redo logic uses stacks per room.
- **Key Files**:
  - `client/src/components/Canvas.jsx`: Main drawing UI
  - `server/services/roomService.js`: Room and stroke management
  - `server/events/eventHandlers.js`: Socket event registration
  - `client/src/hooks/useSocketEvents.js`: Client event listeners

---

## Setup & Development

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install Dependencies
```bash
npm install
cd client && npm install
```

### Run Development Servers
- **Backend** (from repo root):
  ```bash
  npm run dev   # uses nodemon for auto-reload
  npm start     # runs server normally
  ```
- **Frontend** (from `client/`):
  ```bash
  npm start     # runs React app on :3000
  ```

### Build for Production
```bash
cd client && npm run build
```

---

## Testing

Colla-Board includes a **comprehensive testing suite with 216+ tests** covering unit, integration, and E2E scenarios for both client and server.

### Test Coverage

#### Server Tests: 57 Tests ✅
- **4 Test Suites** (Unit, Integration, E2E)
- **Room Management**: Create/delete rooms, user join/leave, room state
- **Drawing Events**: Stroke handling, broadcast to users
- **Undo/Redo**: History stacks, state synchronization
- **Socket Integration**: Real-time event handling

#### Client Tests: 159 Tests ✅
- **10 Test Suites** covering all components and hooks
- **Custom Hooks**: `useDrawing`, `useCanvas`, `useUndoRedo`
- **Services**: Socket service, Canvas service, Drawing engine
- **Components**: Canvas, Toolbar with full interaction tests
- **E2E Workflows**: Complete drawing, undo/redo, multi-user scenarios

### Running Tests

```bash
# Run all tests (server + client)
npm run test:all

# Run only server tests
npm test

# Run only client tests
npm run test:client

# Server tests with specific suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# Watch mode (auto-rerun on changes)
npm test:watch              # Server tests
npm run test:client:watch   # Client tests
```

### Test Structure

**Server Tests** (`server/__tests__/`)
- `unit/` — Isolated service and handler tests with mocks
- `integration/` — Room lifecycle and multi-user scenarios
- `e2e/` — Complete collaboration workflows

**Client Tests** (`client/src/__tests__/`)
- `unit/` — Hooks, services, and utility function tests
- `integration/` — Component interaction tests
- `e2e/` — Full drawing workflows and user scenarios

### Key Test Examples

- **Drawing Lifecycle**: Start → continue → end stroke with proper event sequencing
- **Undo/Redo**: State management with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Multi-User**: Concurrent drawing, user presence, remote event handling
- **Socket Integration**: Join/leave rooms, event broadcasting, state synchronization
- **Component Tests**: Toolbar tool selection, color/size changes, clear canvas

### Notes on Testing

- **Server**: Uses Jest with mocked services for isolated testing
- **Client**: Uses React Testing Library with Jest and Babel for JSX support
- **Mocking**: Socket.IO events are mocked for reliable, fast tests
- **No External Dependencies**: All tests run locally without external services
````