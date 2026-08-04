import React from 'react';
import { Channel } from '../types/irc';

interface SidebarProps {
  nick: string;
  channels: Channel[];
  activeTarget: string;
  onSelectTarget: (target: string) => void;
  onPartChannel: (channelName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  nick,
  channels,
  activeTarget,
  onSelectTarget,
  onPartChannel,
}) => {
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
          >
            <span className="channel-name">{ch.name.startsWith('#') ? ch.name : '#' + ch.name}</span>
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
    </aside>
  );
};
