import React, { useEffect, useRef } from 'react';
import { Message, Channel } from '../types/irc';

interface ChatAreaProps {
  activeTarget: string;
  activeChannel?: Channel;
  messages: Message[];
  isRtlLanguage: boolean;
  onOpenBanList?: (channelName: string) => void;
  onJoinChannel?: (channelName: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeTarget,
  activeChannel,
  messages,
  isRtlLanguage,
  onOpenBanList,
  onJoinChannel,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format message text to render #channel tokens as clickable links (double-click to join)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_\-\+]+)/g);
    return parts.map((part, i) => {
      if (/^#[a-zA-Z0-9_\-\+]+$/.test(part)) {
        return (
          <span
            key={i}
            className="channel-link"
            title={`Double-click to join ${part}`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onJoinChannel) {
                onJoinChannel(part);
              }
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString();
    if (selectedText && selectedText.trim().length > 0) {
      navigator.clipboard.writeText(selectedText).catch((err) => {
        console.warn('[Clipboard] Failed to auto-copy selected text:', err);
      });
    }
  };

  return (
    <main className="chat-area">
      {/* Channel Header Bar */}
      <div className="chat-header">
        <div className="header-title">
          <span className="target-name">
            {activeTarget.startsWith('#')
              ? activeTarget
              : activeTarget === 'Status'
              ? '🖥️ Status'
              : '💬 ' + activeTarget}
          </span>
        </div>

        {activeChannel && (
          <div className="header-topic" title={activeChannel.topic}>
            <span className="label">Topic:</span> {activeChannel.topic}
          </div>
        )}

        {activeTarget.startsWith('#') && onOpenBanList && (
          <button
            className="header-ban-btn"
            title="View & Manage Channel Bans"
            onClick={() => onOpenBanList(activeTarget)}
          >
            🛡️ Bans
          </button>
        )}
      </div>

      {/* Message Stream Container */}
      <div
        className={`message-stream ${isRtlLanguage ? 'rtl-dir' : 'ltr-dir'}`}
        onMouseUp={handleMouseUp}
      >
        {messages.map((msg) => {
          if (msg.isWhois) {
            return (
              <div key={msg.id} className="msg-line whois-line">
                <span className="timestamp">[{msg.timestamp}]</span>
                <span className="whois-text" style={{ color: 'var(--text-color, #111111)', fontWeight: 500 }}>
                  {renderFormattedText(msg.text)}
                </span>
              </div>
            );
          }

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="msg-line system-line">
                <span className="timestamp">[{msg.timestamp}]</span>
                <span className="system-text">{renderFormattedText(msg.text)}</span>
              </div>
            );
          }

          if (msg.isAction) {
            return (
              <div key={msg.id} className="msg-line action-line">
                <span className="timestamp">[{msg.timestamp}]</span>
                <span className="action-text">
                  * {msg.sender} {renderFormattedText(msg.text)}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="msg-line">
              <span className="timestamp">[{msg.timestamp}]</span>
              <span className="sender">&lt;{msg.sender}&gt;</span>
              <span className="text" dir="auto">
                {renderFormattedText(msg.text)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </main>
  );
};
