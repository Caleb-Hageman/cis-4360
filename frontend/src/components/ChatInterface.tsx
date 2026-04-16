// frontend/src/components/ChatInterface.tsx
import { useState } from 'react';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export default function ChatInterface({ messages, onSendMessage }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-interface">
      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="I solved 'Two Sum' today..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}