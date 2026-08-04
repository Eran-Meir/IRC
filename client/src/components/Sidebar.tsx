import React, { useState, useEffect } from 'react';
import { Channel } from '../types/irc';

interface SidebarProps {
  nick: string;
  channels: Channel[];
  activeTarget: string;
  onSelectTarget: (target: string) => void;
  onPartChannel: (channelName: string) => void;
  onOpenBanList: (channelName: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  channelName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  nick,
  channels,
  activeTarget,
  onSelectTarget,
  onPartChannel,
  onOpenBanList,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, channelName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      channelName,
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>CHANNELS & FOLDERS</span>
      </div>

      <div className="sidebar-user-card">
        <span className="user-card-label">USER:</span>
        <span className="user-card-nick">{nick}</span>
      </div>

      <div className="sidebar-tree">
        {/* Status / Console Item */}
        <div
          className={`tree-item ${activeTarget === 'Status' ? 'active' : ''}`}
          onClick={() => onSelectTarget('Status')}
        >
          <span className="icon">🖥️</span> Status Window
          <span className="shortcut-badge">Alt+0</span>
        </div>

        <div className="category-title">CHANNELS ({channels.length})</div>

        {channels.map((ch, idx) => (
          <div
            key={ch.name}
            className={`tree-item ${activeTarget.toLowerCase() === ch.name.toLowerCase() ? 'active' : ''}`}
            onClick={() => onSelectTarget(ch.name)}
            onContextMenu={(e) => handleContextMenu(e, ch.name)}
          >
            <span className="channel-name">{ch.name.startsWith('#') ? ch.name : '💬 ' + ch.name}</span>
            {idx < 9 && <span className="shortcut-badge">Alt+{idx + 1}</span>}
            {ch.unreadCount > 0 && (
              <span className="badge">{ch.unreadCount}</span>
            )}
            <button
              className="part-btn"
              title="Leave Channel"
              onClick={(e) => {
                e.stopPropagation();
                onPartChannel(ch.name);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">{contextMenu.channelName}</div>
          <button
            className="context-menu-item"
            onClick={() => {
              onOpenBanList(contextMenu.channelName);
              setContextMenu(null);
            }}
          >
            🛡️ View Ban List
          </button>
          <button
            className="context-menu-item danger"
            onClick={() => {
              onPartChannel(contextMenu.channelName);
              setContextMenu(null);
            }}
          >
            🚪 Leave Channel
          </button>
        </div>
      )}
    </aside>
  );
};
