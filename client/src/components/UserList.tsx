import React, { useState, useEffect, useRef } from 'react';

interface UserListProps {
  users: string[];
  activeChannel: string;
  onQueryUser?: (nick: string) => void;
  onSendCommand?: (cmd: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nick: string;
  symbol: string;
}

interface ReasonModalState {
  visible: boolean;
  type: 'KICK' | 'KICKBAN';
  nick: string;
  reason: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  activeChannel,
  onQueryUser,
  onSendCommand,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nick: '',
    symbol: '',
  });

  const [reasonModal, setReasonModal] = useState<ReasonModalState>({
    visible: false,
    type: 'KICK',
    nick: '',
    reason: '',
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse user prefix symbol and clean nick
  const parseUser = (raw: string) => {
    const symbol = raw.charAt(0);
    if (['*', '@', '%', '+'].includes(symbol)) {
      return { symbol, nick: raw.slice(1) };
    }
    return { symbol: '', nick: raw };
  };

  // Rank weight for strict hierarchy sorting (* > @ > % > + > none)
  const getRankWeight = (symbol: string) => {
    switch (symbol) {
      case '*':
        return 4;
      case '@':
        return 3;
      case '%':
        return 2;
      case '+':
        return 1;
      default:
        return 0;
    }
  };

  // Sort users strictly by rank weight descending, then alphabetically by nickname
  const sortedUsers = [...users].map(parseUser).sort((a, b) => {
    const weightDiff = getRankWeight(b.symbol) - getRankWeight(a.symbol);
    if (weightDiff !== 0) return weightDiff;
    return a.nick.localeCompare(b.nick, undefined, { sensitivity: 'base' });
  });

  const handleContextMenu = (e: React.MouseEvent, nick: string, symbol: string) => {
    e.preventDefault();
    const menuWidth = 190;
    const menuHeight = 350;
    const x = e.clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : e.clientX;
    const y = e.clientY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : e.clientY;
    setContextMenu({
      visible: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      nick,
      symbol,
    });
  };

  const handleDoubleClick = (nick: string) => {
    if (onQueryUser) {
      onQueryUser(nick);
    }
  };

  const executeAction = (action: string) => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    const { nick } = contextMenu;
    if (!nick || !onSendCommand) return;

    switch (action) {
      case 'WHOIS':
        onSendCommand(`/whois ${nick}`);
        break;
      case 'QUERY':
        if (onQueryUser) onQueryUser(nick);
        break;
      case 'OP':
        onSendCommand(`/mode ${activeChannel} +o ${nick}`);
        break;
      case 'DEOP':
        onSendCommand(`/mode ${activeChannel} -o ${nick}`);
        break;
      case 'HALFOP':
        onSendCommand(`/mode ${activeChannel} +h ${nick}`);
        break;
      case 'DEHALFOP':
        onSendCommand(`/mode ${activeChannel} -h ${nick}`);
        break;
      case 'VOICE':
        onSendCommand(`/mode ${activeChannel} +v ${nick}`);
        break;
      case 'DEVOICE':
        onSendCommand(`/mode ${activeChannel} -v ${nick}`);
        break;
      case 'PROTECT':
        onSendCommand(`/mode ${activeChannel} +q ${nick}`);
        break;
      case 'DEPROTECT':
        onSendCommand(`/mode ${activeChannel} -q ${nick}`);
        break;
      case 'KICK':
        setReasonModal({
          visible: true,
          type: 'KICK',
          nick,
          reason: 'Kicked by operator',
        });
        break;
      case 'BAN':
        onSendCommand(`/mode ${activeChannel} +b ${nick}!*@*`);
        break;
      case 'KICKBAN':
        setReasonModal({
          visible: true,
          type: 'KICKBAN',
          nick,
          reason: 'Banned from channel',
        });
        break;
      default:
        break;
    }
  };

  const handleReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendCommand) return;

    const { type, nick, reason } = reasonModal;
    const finalReason = reason.trim() || (type === 'KICK' ? 'Kicked by operator' : 'Banned from channel');

    if (type === 'KICK') {
      onSendCommand(`/kick ${activeChannel} ${nick} ${finalReason}`);
    } else if (type === 'KICKBAN') {
      onSendCommand(`/mode ${activeChannel} +b ${nick}!*@*`);
      onSendCommand(`/kick ${activeChannel} ${nick} ${finalReason}`);
    }

    setReasonModal((prev) => ({ ...prev, visible: false }));
  };

  return (
    <aside className="user-list">
      <div className="user-list-header">
        <span>USERS ({users.length})</span>
      </div>
      <div className="user-items">
        {sortedUsers.map(({ symbol, nick }, idx) => {
          const badgeClass =
            symbol === '*'
              ? 'protected'
              : symbol === '@'
              ? 'op'
              : symbol === '%'
              ? 'halfop'
              : symbol === '+'
              ? 'voice'
              : 'normal';

          return (
            <div
              key={idx}
              className={`user-item ${badgeClass}`}
              onContextMenu={(e) => handleContextMenu(e, nick, symbol)}
              onDoubleClick={() => handleDoubleClick(nick)}
              title="Double-click to Query, Right-click for options"
            >
              <span className={`user-badge ${badgeClass}`}>{symbol || ' '}</span>
              <span className={`user-nick ${badgeClass}`}>{nick}</span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Right-Click Context Menu */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="user-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-header">{contextMenu.nick}</div>
          <div className="context-item" onClick={() => executeAction('QUERY')}>
            Message (Query)
          </div>
          <div className="context-item" onClick={() => executeAction('WHOIS')}>
            Whois Information
          </div>
          <div className="context-divider" />
          {activeChannel.startsWith('#') && (
            <>
              <div className="context-item" onClick={() => executeAction('PROTECT')}>
                +q Grant Protect (*)
              </div>
              <div className="context-item" onClick={() => executeAction('DEPROTECT')}>
                -q Remove Protect (*)
              </div>
              <div className="context-item" onClick={() => executeAction('OP')}>
                +o Grant Operator (@)
              </div>
              <div className="context-item" onClick={() => executeAction('DEOP')}>
                -o Revoke Operator (@)
              </div>
              <div className="context-item" onClick={() => executeAction('HALFOP')}>
                +h Grant Half-Op (%)
              </div>
              <div className="context-item" onClick={() => executeAction('DEHALFOP')}>
                -h Revoke Half-Op (%)
              </div>
              <div className="context-item" onClick={() => executeAction('VOICE')}>
                +v Grant Voice (+)
              </div>
              <div className="context-item" onClick={() => executeAction('DEVOICE')}>
                -v Revoke Voice (+)
              </div>
              <div className="context-divider" />
              <div className="context-item danger" onClick={() => executeAction('KICK')}>
                Kick User (with reason)
              </div>
              <div className="context-item danger" onClick={() => executeAction('BAN')}>
                Ban User (+b)
              </div>
              <div className="context-item danger" onClick={() => executeAction('KICKBAN')}>
                KickBan User (with reason)
              </div>
            </>
          )}
        </div>
      )}

      {/* Kick / KickBan Reason Prompt Modal */}
      {reasonModal.visible && (
        <div className="modal-overlay" onClick={() => setReasonModal((prev) => ({ ...prev, visible: false }))}>
          <div className="modal-content ban-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ {reasonModal.type === 'KICK' ? 'Kick' : 'KickBan'} User: {reasonModal.nick}</h3>
              <button className="close-btn" onClick={() => setReasonModal((prev) => ({ ...prev, visible: false }))}>×</button>
            </div>
            <form onSubmit={handleReasonSubmit}>
              <div className="modal-body">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '8px', display: 'block' }}>
                  Reason for {reasonModal.type === 'KICK' ? 'kick' : 'kickban'}:
                </label>
                <input
                  type="text"
                  className="ban-input"
                  value={reasonModal.reason}
                  onChange={(e) => setReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason..."
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setReasonModal((prev) => ({ ...prev, visible: false }))}>
                  Cancel
                </button>
                <button type="submit" className="add-ban-btn" style={{ background: '#d9534f' }}>
                  {reasonModal.type === 'KICK' ? 'Kick User' : 'KickBan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
