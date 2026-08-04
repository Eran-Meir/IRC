import React, { useState, useEffect, useRef } from 'react';
import { UserPreferences } from '../types/irc';

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
  const barRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const closeDropdowns = () => setActiveDropdown(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        closeDropdowns();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="top-bar" ref={barRef}>
      <div className="menu-left">
        <div className="logo-badge">Enterprise IRC</div>

        {/* Quick Dark Mode Toggle Button */}
        <button
          className="theme-toggle-btn"
          onClick={() =>
            onUpdatePreferences({
              theme: preferences.theme === 'classic-light' ? 'mirc-dark' : 'classic-light',
            })
          }
          title="Toggle Dark / Light Mode"
        >
          {preferences.theme === 'classic-light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>

        {/* Quick Font Size Dropdown Button */}
        <div className="menu-item">
          <button className="menu-btn font-size-btn" onClick={() => toggleDropdown('fontsize')}>
            Font: {preferences.fontSize || '16px'} ▾
          </button>
          {activeDropdown === 'fontsize' && (
            <div className="dropdown-menu">
              <div className="dropdown-section-title">Select Font Size</div>
              <button
                className={preferences.fontSize === '12px' || preferences.fontSize === 'small' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: '12px' }); closeDropdowns(); }}
              >
                12px (Small)
              </button>
              <button
                className={preferences.fontSize === '14px' || preferences.fontSize === 'medium' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: '14px' }); closeDropdowns(); }}
              >
                14px (Medium)
              </button>
              <button
                className={preferences.fontSize === '16px' || preferences.fontSize === 'large' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: '16px' }); closeDropdowns(); }}
              >
                16px (Default)
              </button>
              <button
                className={preferences.fontSize === '18px' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: '18px' }); closeDropdowns(); }}
              >
                18px (Large)
              </button>
              <button
                className={preferences.fontSize === '20px' ? 'active' : ''}
                onClick={() => { onUpdatePreferences({ fontSize: '20px' }); closeDropdowns(); }}
              >
                20px (Extra Large)
              </button>
            </div>
          )}
        </div>

        {/* File Menu */}
        <div className="menu-item">
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
        <div className="menu-item">
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
                Fixedsys Classic
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
        <div className="menu-item">
          <button className="menu-btn" onClick={() => toggleDropdown('theme')}>
            Theme ▾
          </button>
          {activeDropdown === 'theme' && (
            <div className="dropdown-menu">
              <button onClick={() => { onUpdatePreferences({ theme: 'mirc-dark' }); closeDropdowns(); }}>
                🟢 Dark Mode
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'classic-light' }); closeDropdowns(); }}>
                ☀️ Classic Light Mode (Gray Panels)
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'matrix-emerald' }); closeDropdowns(); }}>
                📟 Matrix Emerald
              </button>
              <button onClick={() => { onUpdatePreferences({ theme: 'cyberpunk' }); closeDropdowns(); }}>
                🌆 Cyberpunk Neon
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
