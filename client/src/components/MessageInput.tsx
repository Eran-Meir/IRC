import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  activeTarget: string;
  isRtlLanguage: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  activeTarget,
  isRtlLanguage,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const isHebrewText = (val: string) => /[\u0590-\u05FF]/.test(val);

  return (
    <footer className="message-input-bar">
      <form onSubmit={handleSubmit} className="input-form">
        <div className="target-pill">{activeTarget}</div>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message or command (e.g. /join #channel)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ direction: isHebrewText(text) ? 'rtl' : 'ltr' }}
        />
        <button type="submit" className="send-btn">
          Send
        </button>
      </form>
    </footer>
  );
};
