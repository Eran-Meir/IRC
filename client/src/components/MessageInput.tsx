import React, { useState, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  activeTarget: string;
  isRtlLanguage: boolean;
  channelUsers?: string[];
  availableChannels?: string[];
}

function findLongestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  activeTarget,
  isRtlLanguage,
  channelUsers = [],
  availableChannels = [],
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
    // Tab autocompletion for nicknames and channels
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.slice(0, cursorPos);
      const textAfterCursor = text.slice(cursorPos);

      const lastSpaceIdx = textBeforeCursor.lastIndexOf(' ');
      const currentWord = textBeforeCursor.slice(lastSpaceIdx + 1);

      if (!currentWord) return;

      // 1. Channel completion (starts with '#')
      if (currentWord.startsWith('#')) {
        if (currentWord === '#') {
          if (activeTarget.startsWith('#')) {
            const completed = textBeforeCursor.slice(0, lastSpaceIdx + 1) + activeTarget + ' ' + textAfterCursor;
            setText(completed);
          }
          return;
        }

        const normSearch = currentWord.toLowerCase();
        const matches = availableChannels.filter((ch) => ch.toLowerCase().startsWith(normSearch));
        if (matches.length === 1) {
          const completed = textBeforeCursor.slice(0, lastSpaceIdx + 1) + matches[0] + ' ' + textAfterCursor;
          setText(completed);
        } else if (matches.length > 1) {
          const common = findLongestCommonPrefix(matches);
          const completed = textBeforeCursor.slice(0, lastSpaceIdx + 1) + common + textAfterCursor;
          setText(completed);
        }
        return;
      }

      // 2. Nickname completion (mIRC style)
      const cleanUsers = Array.from(new Set(channelUsers.map((u) => u.replace(/^[*@%+]*/, ''))));
      const normWord = currentWord.toLowerCase();
      const matchingNicks = cleanUsers.filter((u) => u.toLowerCase().startsWith(normWord));

      if (matchingNicks.length === 1) {
        const completedNick = matchingNicks[0];
        const isStartOfLine = lastSpaceIdx === -1;
        const suffix = isStartOfLine ? ': ' : ' ';
        const completed = textBeforeCursor.slice(0, lastSpaceIdx + 1) + completedNick + suffix + textAfterCursor;
        setText(completed);
      } else if (matchingNicks.length > 1) {
        const commonPrefix = findLongestCommonPrefix(matchingNicks);
        const completed = textBeforeCursor.slice(0, lastSpaceIdx + 1) + commonPrefix + textAfterCursor;
        setText(completed);
      }
      return;
    }

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

    // Up Arrow: Navigate backwards in command history
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
