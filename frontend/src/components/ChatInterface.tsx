import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export default function ChatInterface({ messages, onSendMessage }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="I solved 'Two Sum' today..."
          />
          <button
            className="send-arrow-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() ? '#131314' : '#9aa0a6'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}