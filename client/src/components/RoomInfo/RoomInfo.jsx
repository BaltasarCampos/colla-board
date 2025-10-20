import './RoomInfo.css';

function RoomInfo({ roomId, userName, users, currentUserId }) {
  return (
    <div className="room-info">
      <div>
        <p><strong>Room:</strong> {roomId}</p>
        <p><strong>You:</strong> {userName}</p>
      </div>
      <div className="users-list">
        <strong>Users ({users.length}):</strong>
        <ul>
          {users.map((user) => (
            <li key={user.userId}>
              {user.userName}
              {user.userId === currentUserId && ' (you)'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RoomInfo;