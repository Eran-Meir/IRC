import React, { useState } from 'react';

interface BanListModalProps {
  channel: string;
  bans?: string[];
  isOp: boolean;
  onClose: () => void;
  onAddBan: (channel: string, mask: string) => void;
  onRemoveBan: (channel: string, mask: string) => void;
  onRemoveAllBans?: (channel: string) => void;
}

export const BanListModal: React.FC<BanListModalProps> = ({
  channel,
  bans = [],
  isOp,
  onClose,
  onAddBan,
  onRemoveBan,
  onRemoveAllBans,
}) => {
  const [newMask, setNewMask] = useState('');
  const activeBans = Array.isArray(bans) ? bans : [];

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
          <div className="header-title-group">
            <h3>🛡️ Ban List for {channel}</h3>
            <span className="ban-count-badge">{activeBans.length} Active</span>
          </div>
          <button className="close-btn" onClick={onClose} title="Close Modal">✕</button>
        </div>

        <div className="modal-body">
          {!isOp && (
            <div className="op-warning-banner">
              ℹ️ You are viewing the ban list. Only channel operators (@) can add or remove bans.
            </div>
          )}

          {isOp && (
            <div className="ban-actions-row">
              <form className="add-ban-form" onSubmit={handleAdd}>
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
              {activeBans.length > 0 && onRemoveAllBans && (
                <button
                  type="button"
                  className="clear-all-bans-btn"
                  title="Remove all active bans in this channel"
                  onClick={() => onRemoveAllBans(channel)}
                >
                  🧹 Clear All
                </button>
              )}
            </div>
          )}

          <div className="ban-list-container">
            {activeBans.length === 0 ? (
              <div className="empty-bans">
                <div className="empty-icon">🛡️</div>
                <div>No active bans in {channel}.</div>
              </div>
            ) : (
              <div className="ban-items-list">
                {activeBans.map((mask) => (
                  <div key={mask} className="ban-item-card">
                    <div className="ban-mask-info">
                      <span className="ban-icon">🚫</span>
                      <span className="ban-mask">{mask}</span>
                    </div>
                    {isOp && (
                      <button
                        className="remove-ban-item-btn"
                        title={`Remove ban ${mask}`}
                        onClick={() => onRemoveBan(channel, mask)}
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
