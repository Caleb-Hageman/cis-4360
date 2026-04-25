import { useEffect, useState } from 'react';
import ChatInterface from './components/ChatInterface';
import DataPreview from './components/DataPreview';
import ProfileSettings from './components/ProfileSettings';
import type { AuthUser, Message, SheetRow, SummaryReport, UserProfile } from './types';
import './App.css';

const STORAGE_KEYS = {
  messages: 'chatMessages',
  pendingData: 'pendingDraftPreview',
  pendingReport: 'pendingDraftReport',
  profile: 'userProfile',
  spreadsheetId: 'spreadsheetId',
  threadId: 'chatThreadId',
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  experienceLevel: '',
  primaryLanguage: '',
  leetcodeGoals: '',
  problemsSolved: 0,
  dateFormat: 'MM/DD/YYYY',
};

function sanitizeStorageScope(email?: string | null) {
  return email ? encodeURIComponent(email.trim().toLowerCase()) : 'guest';
}

function getStorageKey(base: string, email?: string | null) {
  return `${base}_${sanitizeStorageScope(email)}`;
}

function loadStoredValue<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}":`, error);
    return fallback;
  }
}

function createThreadId() {
  return crypto.randomUUID();
}

function App() {
  const [messages, setMessages] = useState<Message[]>(
    () => loadStoredValue(getStorageKey(STORAGE_KEYS.messages), []),
  );
  const [pendingData, setPendingData] = useState<SheetRow | null>(
    () => loadStoredValue(getStorageKey(STORAGE_KEYS.pendingData), null),
  );
  const [pendingReport, setPendingReport] = useState<SummaryReport | null>(
    () => loadStoredValue(getStorageKey(STORAGE_KEYS.pendingReport), null),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(
    () => loadStoredValue(getStorageKey(STORAGE_KEYS.profile), DEFAULT_PROFILE),
  );
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(getStorageKey(STORAGE_KEYS.spreadsheetId)) ?? '',
  );
  const [threadId, setThreadId] = useState(
    () => localStorage.getItem(getStorageKey(STORAGE_KEYS.threadId)) ?? createThreadId(),
  );

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const userEmail = authUser?.email ?? null;
  const activeThreadId = userEmail || threadId;

  const resetUiState = () => {
    setMessages([]);
    setPendingData(null);
    setPendingReport(null);
    setSpreadsheetId('');
    setProfile(DEFAULT_PROFILE);
    setThreadId(createThreadId());
  };

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
    if (!userEmail) {
      return;
    }

    const storedProfile = loadStoredValue(
      getStorageKey(STORAGE_KEYS.profile, userEmail),
      DEFAULT_PROFILE,
    );
    const storedSpreadsheetId =
      localStorage.getItem(getStorageKey(STORAGE_KEYS.spreadsheetId, userEmail)) ?? '';

    setProfile({
      ...storedProfile,
      name: storedProfile.name || authUser?.name || '',
    });
    setSpreadsheetId(storedSpreadsheetId);
    setThreadId(userEmail);

    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`History request failed with status ${response.status}`);
        }

        const data = await response.json();
        const restoredMessages = Array.isArray(data.messages)
          ? data.messages.map((message: { role?: string; content?: string }) => ({
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content: message.content ?? '',
            }))
          : [];

        setMessages(restoredMessages);
        setPendingData((data.preview as SheetRow | null) ?? null);
        setPendingReport((data.report as SummaryReport | null) ?? null);
      } catch (error) {
        console.error('History lookup failed:', error);
        setMessages(loadStoredValue(getStorageKey(STORAGE_KEYS.messages, userEmail), []));
        setPendingData(loadStoredValue(getStorageKey(STORAGE_KEYS.pendingData, userEmail), null));
        setPendingReport(loadStoredValue(getStorageKey(STORAGE_KEYS.pendingReport, userEmail), null));
      }
    };

    loadHistory();
  }, [API_BASE_URL, authUser?.name, userEmail]);

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

  useEffect(() => {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.messages, userEmail), JSON.stringify(messages));
  }, [messages, userEmail]);

  useEffect(() => {
    localStorage.setItem(
      getStorageKey(STORAGE_KEYS.pendingData, userEmail),
      JSON.stringify(pendingData),
    );
  }, [pendingData, userEmail]);

  useEffect(() => {
    localStorage.setItem(
      getStorageKey(STORAGE_KEYS.pendingReport, userEmail),
      JSON.stringify(pendingReport),
    );
  }, [pendingReport, userEmail]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.profile, userEmail), JSON.stringify(profile));
  }, [profile, userEmail]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.spreadsheetId, userEmail), spreadsheetId);
  }, [spreadsheetId, userEmail]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.threadId, userEmail), activeThreadId);
  }, [activeThreadId, userEmail]);

  const getRequestProfile = () => ({
    name: authUser?.name || profile.name.trim() || 'Guest',
    experience_level: profile.experienceLevel,
    primary_language: profile.primaryLanguage,
    leetcode_goals: profile.leetcodeGoals,
    problems_solved: profile.problemsSolved,
    date_format: profile.dateFormat,
    preferences: {
      auth_status: authUser ? 'google_signed_in' : 'guest',
      spreadsheet_connected: spreadsheetId ? 'true' : 'false',
    },
  });

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
          thread_id: activeThreadId,
          user_profile: getRequestProfile(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const newAssistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        preview: data.preview as SheetRow,
      };

      setMessages(prev => [...prev, newAssistantMsg]);
      setPendingData(data.preview);
      setPendingReport((data.report as SummaryReport | null) ?? null);
      if (!userEmail && data.thread_id) {
        setThreadId(data.thread_id);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong while updating the draft. Check the backend, auth, and spreadsheet settings, then try again.',
        },
      ]);
    }
  };

  const handleCommit = async () => {
    if (!pendingData) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/commit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: pendingData,
          spreadsheet_id: spreadsheetId || undefined,
          thread_id: activeThreadId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Commit request failed with status ${response.status}`);
      }

      alert('Added to LeetCode Tracker!');
      setProfile(prev => ({
        ...prev,
        problemsSolved: prev.problemsSolved + 1,
      }));
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Posted to Google Sheets. The current draft is closed, but you can keep chatting to start a new one.',
        },
      ]);
      setPendingData(null);
      setPendingReport(null);
    } catch (error) {
      console.error('Commit failed:', error);
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
      resetUiState();
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
          userName={authUser?.name || profile.name || 'Sign-in'}
          userEmail={authUser?.email}
          isAuthenticated={Boolean(authUser)}
          isOpen={isProfileOpen}
          onToggle={() => setIsProfileOpen(prev => !prev)}
          spreadsheetId={spreadsheetId}
          onSpreadsheetIdChange={setSpreadsheetId}
          profile={profile}
          onProfileChange={setProfile}
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
        {(pendingData || pendingReport) && (
          <aside className="preview-sidebar">
            <DataPreview
              data={pendingData}
              report={pendingReport}
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
