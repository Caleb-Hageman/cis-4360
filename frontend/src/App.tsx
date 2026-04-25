// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import ChatInterface from './components/ChatInterface';
import DataPreview from './components/DataPreview';
import ProfileSettings from './components/ProfileSettings';
import type { AuthUser, Message, SheetRow } from './types';
import './App.css';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingData, setPendingData] = useState<SheetRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem('spreadsheetId') ?? '',
  );

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });
        const data = await response.json();
        setAuthUser(data.user ?? null);
      } catch (error) {
        console.error('Auth lookup failed:', error);
      }
    };

    loadAuthState();
  }, [API_BASE_URL]);

  useEffect(() => {
    localStorage.setItem('spreadsheetId', spreadsheetId);
  }, [spreadsheetId]);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isProfileOpen]);

  const handleSendMessage = async (text: string) => {
    const newUserMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMsg]);
    setIsProfileOpen(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          spreadsheet_id: spreadsheetId || undefined,
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: pendingData,
          spreadsheet_id: spreadsheetId || undefined,
        }),
      });
      alert("Added to LeetCode Tracker!");
      setPendingData(null);
    } catch (error) {
      console.error("Commit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/start`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setAuthUser(null);
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand__mark">LT</span>
          <div>
            <p className="app-brand__eyebrow">Workspace</p>
            <h1>LeetCode Tracker</h1>
          </div>
        </div>
        <ProfileSettings
          userName={authUser?.name ?? 'Caleb'}
          userEmail={authUser?.email}
          isAuthenticated={Boolean(authUser)}
          isOpen={isProfileOpen}
          onToggle={() => setIsProfileOpen(prev => !prev)}
          spreadsheetId={spreadsheetId}
          onSpreadsheetIdChange={setSpreadsheetId}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
        />
      </header>
      <main className="main-content">
        <div className="chat-column">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
        {pendingData && (
          <aside className="preview-sidebar">
            <DataPreview
              data={pendingData}
              onCommit={handleCommit}
              isLoading={isLoading}
            />
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;
