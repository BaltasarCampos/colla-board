import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import socketService from './services/socket';
import { useRoom } from './hooks/useRoom';
import Canvas from './components/Canvas';
import RoomInfo from './components/RoomInfo/RoomInfo';
import JoinForm from './components/JoinForm/JoinForm';
import './App.css';

function App() {
  const [hasJoined, setHasJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [userId] = useState(() => uuidv4());
  const [socketReady, setSocketReady] = useState(false);

  // Connect to socket on mount
  useEffect(() => {
    console.log('Connecting to Socket.io server...');
    socketService.connect();

    // Mark socket as ready after a brief delay to ensure initialization
    const timer = setTimeout(() => {
      setSocketReady(true);
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      socketService.disconnect();
    };
  }, []);

  const { isConnected, users, roomState } = useRoom(socketReady ? socketService : null);

  // Handle joining a room
  const handleJoin = (finalRoomId, finalUserName) => {
    console.log(`Joining room: ${finalRoomId} as ${finalUserName}`);
    
    // Join the room via socket
    socketService.joinRoom(finalRoomId, userId, finalUserName);
    
    // Update UI
    setRoomId(finalRoomId);
    setUserName(finalUserName);
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
        <JoinForm isConnected={isConnected} onJoin={handleJoin} />
      ) : (
        <div className="canvas-container">
          <RoomInfo
            roomId={roomId}
            userName={userName}
            users={users}
            currentUserId={userId}
          />
          
          <Canvas
            socketService={socketService}
            roomId={roomId}
            userId={userId}
            userName={userName}
            initialRoomState={roomState}
          />
        </div>
      )}
    </div>
  );
}

export default App;