// frontend/src/App.tsx
import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import DataPreview from './components/DataPreview';
import type { Message, SheetRow } from './types';
import './App.css';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingData, setPendingData] = useState<SheetRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use the Environment Variable instead of a hardcoded string
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const handleSendMessage = async (text: string) => {
    const newUserMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_profile: { name: "Caleb", preferences: {} }
        }),
      });

      const data = await response.json();

      const newAssistantMsg: Message = { 
        role: 'assistant', 
        content: data.reply,
        preview: data.preview as SheetRow 
      };
      
      setMessages(prev => [...prev, newAssistantMsg]);
      setPendingData(data.preview);
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const handleCommit = async () => {
    if (!pendingData) return;
    setIsLoading(true);

    try {
      await fetch(`${API_BASE_URL}/api/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: pendingData }),
      });
      
      alert("Added to LeetCode Tracker!");
      setPendingData(null);
    } catch (error) {
      console.error("Commit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>LeetCode Tracker Agent</h1>
      </header>
      
      <main className="main-content">
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage} 
        />
        
        <div className="preview-sidebar">
          <DataPreview 
            data={pendingData} 
            onCommit={handleCommit} 
            isLoading={isLoading} 
          />
        </div>
      </main>
    </div>
  );
}

export default App;