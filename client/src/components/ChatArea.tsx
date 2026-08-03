import React, { useEffect, useRef } from 'react';
import { Message, Channel } from '../types/irc';

interface ChatAreaProps {
  activeTarget: string;
  activeChannel?: Channel;
  messages: Message[];
  isRtlLanguage: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeTarget,
  activeChannel,
  messages,
  isRtlLanguage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect Hebrew characters for auto RTL line alignment
  const containsHebrew = (text: string) => /[\u0590-\u05FF]/.test(text);

  return (
    <main className="chat-area">
      {/* Channel Header Bar */}
      <div className="chat-header">
        <div className="header-title">
          <span className="target-icon">{activeTarget.startsWith('#') ? '#' : '🖥️'}</span>
          <span className="target-name">{activeTarget}</span>
        </div>
        {activeChannel && (
          <div className="header-topic" title={activeChannel.topic}>
            <span className="label">Topic:</span> {activeChannel.topic}
          </div>
        )}
      </div>

      {/* Message Stream Container */}
      <div className={`message-stream ${isRtlLanguage ? 'rtl-dir' : 'ltr-dir'}`}>
        {messages.map((msg) => {
          const isHebrew = containsHebrew(msg.text);

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="msg-line system-line">
                <span className="timestamp">[{msg.timestamp}]</span>
                <span className="system-text">{msg.text}</span>
              </div>
            );
          }

          if (msg.isAction) {
            return (
              <div key={msg.id} className="msg-line action-line">
                <span className="timestamp">[{msg.timestamp}]</span>
                <span className="action-text">* {msg.sender} {msg.text}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="msg-line">
              <span className="timestamp">[{msg.timestamp}]</span>
              <span className="sender">&lt;{msg.sender}&gt;</span>
              <span className="text" dir="auto">{msg.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </main>
  );
};
