import React, { useState, useEffect } from 'react';

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
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Clear text box whenever switching channels or windows
  useEffect(() => {
    setText('');
    setHistoryIdx(-1);
  }, [activeTarget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add to 20-item history stack avoiding consecutive duplicates
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === trimmed) {
        return prev;
      }
      const updated = [...prev, trimmed];
      return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
    });

    setHistoryIdx(-1);
    setText('');
    try {
      onSendMessage(trimmed);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter key submit handling (Enter = send, Shift + Enter = newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // Ctrl + C: Clear current input line if no text selection exists
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      const inputEl = e.currentTarget;
      if (inputEl.selectionStart === inputEl.selectionEnd) {
        e.preventDefault();
        setText('');
        setHistoryIdx(-1);
        return;
      }
    }

    // Up Arrow: Navigate backwards in command history (when cursor is on top line or empty)
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      if (!text.includes('\n') || e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        let nextIdx = historyIdx;
        if (historyIdx === -1) {
          nextIdx = history.length - 1;
        } else if (historyIdx > 0) {
          nextIdx = historyIdx - 1;
        }
        setHistoryIdx(nextIdx);
        setText(history[nextIdx]);
        return;
      }
    }

    // Down Arrow: Navigate forwards in command history
    if (e.key === 'ArrowDown') {
      if (historyIdx === -1) return;
      if (!text.includes('\n') || e.currentTarget.selectionEnd === text.length) {
        e.preventDefault();
        if (historyIdx < history.length - 1) {
          const nextIdx = historyIdx + 1;
          setHistoryIdx(nextIdx);
          setText(history[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setText('');
        }
        return;
      }
    }
  };

  const isHebrewText = (val: string) => /[\u0590-\u05FF]/.test(val);

  return (
    <footer className="message-input-bar">
      <form onSubmit={handleSubmit} className="input-form">
        <div className="target-pill">{activeTarget}</div>
        <textarea
          className="chat-input"
          placeholder="Type a message or command (e.g. /join #channel)..."
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ direction: isHebrewText(text) ? 'rtl' : 'ltr' }}
        />
        <button type="submit" className="send-btn">
          Send
        </button>
      </form>
    </footer>
  );
};
