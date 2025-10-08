import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import socketService from './services/socket';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [userId] = useState(() => uuidv4()); // Generate once on mount

  // Connect to socket when component mounts
  useEffect(() => {
    console.log('Connecting to Socket.io server...');
    socketService.connect();

    // Listen for connection status changes
    const handleConnectionStatus = (status) => {
      console.log('Connection status changed:', status);
      setIsConnected(status);
    };

    socketService.on('local:connection-status', handleConnectionStatus);

    // Listen for room state
    socketService.on('room-state', (data) => {
      console.log('Room state received:', data);
      // We'll use this later
    });

    // Listen for other users joining
    socketService.on('user-joined', (data) => {
      console.log('User joined:', data);
      // We'll use this later
    });

    // Listen for other users leaving
    socketService.on('user-left', (data) => {
      console.log('User left:', data);
      // We'll use this later
    });

    // Cleanup on unmount
    return () => {
      socketService.off('local:connection-status', handleConnectionStatus);
      socketService.disconnect();
    };
  }, []); // Empty dependency array = run once on mount

  // Handle joining a room
  const handleJoinRoom = (e) => {
    e.preventDefault(); // Prevent form submission from reloading page

    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!isConnected) {
      alert('Not connected to server. Please wait...');
      return;
    }

    // Generate room ID if not provided
    const finalRoomId = roomId.trim() || `room-${Date.now()}`;
    
    console.log(`Joining room: ${finalRoomId}`);
    
    // Join the room via socket
    socketService.joinRoom(finalRoomId, userId, username);
    
    // Update UI
    setRoomId(finalRoomId);
    setHasJoined(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 Collaborative Whiteboard</h1>
        <div className="connection-status">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>

      {!hasJoined ? (
        <form className="join-form" onSubmit={handleJoinRoom}>
          <h2>Join a Room</h2>
          <input
            type="text"
            placeholder="Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="Room ID (or leave empty to create new)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!isConnected || !username.trim()}
          >
            {isConnected ? 'Join Room' : 'Connecting...'}
          </button>
          <p className="hint">
            {userId && `Your ID: ${userId.substring(0, 8)}...`}
          </p>
        </form>
      ) : (
        <div className="canvas-container">
          <div className="room-info">
            <p><strong>Room:</strong> {roomId}</p>
            <p><strong>User:</strong> {username}</p>
          </div>
          <p>Canvas will go here!</p>
        </div>
      )}
    </div>
  );
}

export default App;