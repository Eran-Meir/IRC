import React, { useState } from 'react';

interface BanListModalProps {
  channel: string;
  bans: string[];
  isOp: boolean;
  onClose: () => void;
  onAddBan: (channel: string, mask: string) => void;
  onRemoveBan: (channel: string, mask: string) => void;
}

export const BanListModal: React.FC<BanListModalProps> = ({
  channel,
  bans,
  isOp,
  onClose,
  onAddBan,
  onRemoveBan,
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
