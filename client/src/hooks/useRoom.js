import { useState, useEffect, useCallback } from 'react';
import { LOCAL_EVENTS, SERVER_EVENTS } from '../utils/constants';

/**
 * Hook for managing room state and user management
 * @param {Object} socketService - Socket service instance
 * @returns {Object} Room state and handlers
 */
export const useRoom = (socketService) => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [roomState, setRoomState] = useState(null);

  useEffect(() => {
    if (!socketService) return;

    const handleConnectionStatus = (status) => {
      console.log('Connection status changed:', status);
      setIsConnected(status);
    };

    const handleRoomState = (data) => {
      console.log('Room state received');
      setUsers(data.users);
      setRoomState(data);
    };

    const handleUserJoined = (data) => {
      console.log('User joined:', data.userName);
      setUsers((prevUsers) => [
        ...prevUsers,
        { userId: data.userId, userName: data.userName }
      ]);
    };

    const handleUserLeft = (data) => {
      console.log('User left:', data.userName);
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.userId !== data.userId)
      );
    };

    // Register listeners
    socketService.on(LOCAL_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
    socketService.on(SERVER_EVENTS.ROOM_STATE, handleRoomState);
    socketService.on(SERVER_EVENTS.USER_JOINED, handleUserJoined);
    socketService.on(SERVER_EVENTS.USER_LEFT, handleUserLeft);

    // Cleanup
    return () => {
      socketService.off(LOCAL_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
      // Note: We're not cleaning up other listeners to avoid memory leaks in StrictMode
      // Socket.io will handle cleanup on disconnect
    };
  }, [socketService]);

  const joinRoom = useCallback((roomId, userId, userName) => {
    if (!socketService) return;
    socketService.joinRoom(roomId, userId, userName);
  }, [socketService]);

  return {
    isConnected,
    users,
    roomState,
    joinRoom
  };
};