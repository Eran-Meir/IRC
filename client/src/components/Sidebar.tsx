import React from 'react';
import { Channel } from '../types/irc';

interface SidebarProps {
  channels: Channel[];
  activeTarget: string;
  onSelectTarget: (target: string) => void;
  onPartChannel: (channelName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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

      <div className="sidebar-tree">
        {/* Status / Console Item */}
        <div
          className={`tree-item ${activeTarget === 'Status' ? 'active' : ''}`}
          onClick={() => onSelectTarget('Status')}
        >
          <span className="icon">🖥️</span> Status Window
        </div>

        <div className="category-title">CHANNELS ({channels.length})</div>

        {channels.map((ch) => (
          <div
            key={ch.name}
            className={`tree-item ${activeTarget === ch.name ? 'active' : ''}`}
            onClick={() => onSelectTarget(ch.name)}
          >
            <span className="icon">#</span>
            <span className="channel-name">{ch.name}</span>
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
