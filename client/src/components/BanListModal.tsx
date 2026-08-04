import React, { useState } from 'react';

interface BanListModalProps {
  channel: string;
  bans: string[];
  isOp: boolean;
  onClose: () => void;
  onAddBan: (channel: string, mask: string) => void;
  onRemoveBan: (channel: string, mask: string) => void;
  onRemoveAllBans?: (channel: string) => void;
}

export const BanListModal: React.FC<BanListModalProps> = ({
  channel,
  bans,
  isOp,
  onClose,
  onAddBan,
  onRemoveBan,
  onRemoveAllBans,
}) => {
  const [newMask, setNewMask] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMask.trim()) return;
    onAddBan(channel, newMask.trim());
    setNewMask('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ban-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🛡️ Ban List for {channel}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!isOp && (
            <div className="op-warning-banner">
              ℹ️ You are viewing the ban list. Only channel operators (@) can add or remove bans.
            </div>
          )}

          {isOp && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <form className="add-ban-form" onSubmit={handleAdd} style={{ flex: 1, display: 'flex', gap: '8px', margin: 0 }}>
                <input
                  type="text"
                  placeholder="Enter nick or hostmask (e.g., BadUser!*@* or *@192.168.1.1)"
                  value={newMask}
                  onChange={(e) => setNewMask(e.target.value)}
                  className="ban-input"
                />
                <button type="submit" className="add-ban-btn">
                  + Add Ban
                </button>
              </form>
              {bans.length > 0 && onRemoveAllBans && (
                <button
                  type="button"
                  className="remove-ban-btn"
                  style={{ background: '#d9534f', color: '#fff', padding: '6px 12px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                  title="Remove all active bans in this channel"
                  onClick={() => onRemoveAllBans(channel)}
                >
                  🧹 Remove All Bans
                </button>
              )}
            </div>
          )}

          <div className="ban-list-container">
            {bans.length === 0 ? (
              <div className="empty-bans">No active bans in {channel}.</div>
            ) : (
              <ul className="ban-items-list">
                {bans.map((mask) => (
                  <li key={mask} className="ban-item">
                    <span className="ban-mask">{mask}</span>
                    {isOp && (
                      <button
                        className="remove-ban-btn"
                        title="Remove Ban"
                        onClick={() => onRemoveBan(channel, mask)}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
