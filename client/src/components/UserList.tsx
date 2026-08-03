import React from 'react';

interface UserListProps {
  users: string[];
}

export const UserList: React.FC<UserListProps> = ({ users }) => {
  return (
    <aside className="user-list">
      <div className="user-list-header">
        <span>USERS ({users.length})</span>
      </div>
      <div className="user-items">
        {users.map((user, idx) => {
          const isOp = user.startsWith('@');
          const isVoice = user.startsWith('+');
          const cleanNick = isOp || isVoice ? user.slice(1) : user;

          return (
            <div key={idx} className="user-item">
              <span className={`user-badge ${isOp ? 'op' : isVoice ? 'voice' : 'normal'}`}>
                {isOp ? '@' : isVoice ? '+' : ''}
              </span>
              <span className="user-nick">{cleanNick}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
