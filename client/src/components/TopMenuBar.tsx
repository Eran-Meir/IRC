import React, { useState } from 'react';
import { UserPreferences, ThemeOption, FontSizeOption, FontFamilyOption, LanguageOption } from '../types/irc';

interface TopMenuBarProps {
  isConnected: boolean;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClear: () => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  isConnected,
  preferences,
  onUpdatePreferences,
  onConnect,
  onDisconnect,
  onClear,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const closeDropdowns = () => setActiveDropdown(null);

  return (
    <header className="top-bar">
      <div className="menu-left">
        <div className="logo-badge">mIRC v7.75 Web</div>

        {/* File Menu */}
        <div className="menu-item" onMouseLeave={closeDropdowns}>
          <button className="menu-btn" onClick={() => toggleDropdown('file')}>
            File ▾
          </button>
          {activeDropdown === 'file' && (
            <div className="dropdown-menu">
              {!isConnected ? (
                <button onClick={() => { onConnect(); closeDropdowns(); }}>🔌 Connect</button>
              ) : (
                <button onClick={() => { onDisconnect(); closeDropdowns(); }}>❌ Disconnect</button>
              )}
              <button onClick={() => { onClear(); closeDropdowns(); }}>🧹 Clear Window</button>
            </div>
          )}
        </div>

        {/* View & Preferences Menu */}
        <div className="menu-item" onMouseLeave={closeDropdowns}>
          <button className="menu-btn" onClick={() => toggleDropdown('view')}>
            View & Preferences ▾
          </button>
          {activeDropdown === 'view' && (
            <div className="dropdown-menu">
              <div className="dropdown-section-title">Font Size</div>
              <button
                className={preferences.fontSize === 'small' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: 'small' }); closeDropdowns(); }}
              >
                Small (12px)
              </button>
              <button
                className={preferences.fontSize === 'medium' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: 'medium' }); closeDropdowns(); }}
              >
                Medium (14px - Default)
              </button>
              <button
                className={preferences.fontSize === 'large' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: 'large' }); closeDropdowns(); }}
              >
                Large (16px)
              </button>

              <div className="dropdown-divider" />
              <div className="dropdown-section-title">Font Family</div>
              <button
                className={preferences.fontFamily === 'fixedsys' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontFamily: 'fixedsys' }); closeDropdowns(); }}
              >
                Fixedsys (mIRC Classic)
              </button>
              <button
                className={preferences.fontFamily === 'fira-code' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontFamily: 'fira-code' }); closeDropdowns(); }}
              >
                Fira Code
              </button>

              <div className="dropdown-divider" />
              <button onClick={() => { onUpdatePreferences({ showUserList: !preferences.showUserList }); closeDropdowns(); }}>
                {preferences.showUserList ? 'Hide Nick List' : 'Show Nick List'}
              </button>
            </div>
          )}
        </div>

        {/* Theme Menu */}
        <div className="menu-item" onMouseLeave={closeDropdowns}>
          <button className="menu-btn" onClick={() => toggleDropdown('theme')}>
            Theme ▾
          </button>
          {activeDropdown === 'theme' && (
            <div className="dropdown-menu">
              <button onClick={() => { onUpdatePreferences({ theme: 'mirc-dark' }); closeDropdowns(); }}>
                🟢 mIRC Dark (Default)
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'matrix-emerald' }); closeDropdowns(); }}>
                📟 Matrix Emerald
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'cyberpunk' }); closeDropdowns(); }}>
                🌆 Cyberpunk Neon
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'classic-light' }); closeDropdowns(); }}>
                ☀️ Classic Light
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="menu-right">
        <span className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? '🟢 ONLINE' : '🔴 DISCONNECTED'}
        </span>
      </div>
    </header>
  );
};
