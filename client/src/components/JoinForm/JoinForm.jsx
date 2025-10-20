import { useState } from 'react';
import './JoinForm.css';

function JoinForm({ isConnected, onJoin }) {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!isConnected) {
      alert('Not connected to server. Please wait...');
      return;
    }

    const finalRoomId = roomId.trim() || `room-${Date.now()}`;
    onJoin(finalRoomId, userName.trim());
  };

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <h2>Join a Room</h2>
      <input
        type="text"
        placeholder="Your Name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
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
        disabled={!isConnected || !userName.trim()}
      >
        {isConnected ? 'Join Room' : 'Connecting...'}
      </button>
    </form>
  );
}

export default JoinForm;