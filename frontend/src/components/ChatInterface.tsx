import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export default function ChatInterface({ messages, onSendMessage }: Props) {
  const [input, setInput] = useState('');
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };
  const messageListRef = useRef<HTMLDivElement>(null);
  const trimmedInput = input.trim();
  const estimatedTokens = Math.max(0, Math.ceil(input.length / 4));

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!trimmedInput) return;
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
    <section className="chat-shell">
      <div className="message-list" ref={messageListRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__badge">AI assistant</div>
            <h2>Track solved problems in a chat-first workspace.</h2>
            <p>
              Describe what you solved, the approach, and anything worth logging.
              I&apos;ll turn it into a clean Google Sheets entry.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className={`message-bubble ${msg.role}`}>
                <p>{msg.content}</p>
                {msg.preview && (
                  <div className="message-preview">
                    <div className="message-preview__header">
                      <span>Draft Extraction</span>
                    </div>
                    <table className="message-preview__table">
                      <tbody>
                        {Object.entries(msg.preview)
                          .slice(0, expandedIndices.includes(i) ? undefined : 4)
                          .map(([key, value]) => (
                            <tr key={key}>
                              <th>{key}</th>
                              <td>{value?.toString() || '-'}</td>
                            </tr>
                          ))}
                        {Object.keys(msg.preview).length > 4 && (
                          <tr>
                            <td 
                              colSpan={2} 
                              className="more-rows"
                              onClick={() => toggleExpand(i)}
                              style={{ cursor: 'pointer' }}
                            >
                              {expandedIndices.includes(i) 
                                ? '↑ Show less' 
                                : `+ ${Object.keys(msg.preview).length - 4} more fields...`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <div className="composer-main">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I solved 'Two Sum' today..."
            />
          </div>
          <button
            type="button"
            className="send-arrow-btn"
            onClick={handleSend}
            disabled={!trimmedInput}
            aria-label="Send"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
        <div className="composer-meta">
          <span>Gemini 2.5 Flash</span>
          <span>{input.length} chars</span>
          <span>~{estimatedTokens} tokens</span>
        </div>
      </div>
    </section>
  );
}
