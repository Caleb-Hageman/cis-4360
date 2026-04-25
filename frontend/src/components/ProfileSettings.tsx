import type { UserProfile } from '../types';

interface Props {
  userName: string;
  userEmail?: string;
  isAuthenticated: boolean;
  isOpen: boolean;
  onToggle: () => void;
  spreadsheetId: string;
  onSpreadsheetIdChange: (value: string) => void;
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function ProfileSettings({
  userName,
  userEmail,
  isAuthenticated,
  isOpen,
  onToggle,
  spreadsheetId,
  onSpreadsheetIdChange,
  profile,
  onProfileChange,
  onSignIn,
  onSignOut,
}: Props) {
  const initials = (userName || 'C')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const updateProfile = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    onProfileChange({
      ...profile,
      [key]: value,
    });
  };

  return (
    <div className="profile-menu">
      <button
        type="button"
        className={`profile-trigger${isOpen ? ' open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open profile settings"
      >
        <span className="profile-trigger__status" />
        <span className="profile-trigger__initials">{initials}</span>
      </button>

      {isOpen && (
        <div className="profile-dropdown" role="menu" aria-label="Profile settings">
          <div className="profile-dropdown__header">
            <p className="profile-dropdown__eyebrow">Signed in as</p>
            <strong>{userName}</strong>
            {userEmail && <span className="profile-dropdown__email">{userEmail}</span>}
          </div>
          <div className="profile-dropdown__content">
            {isAuthenticated && (
              <div className="profile-auth-state">
                <span className="profile-auth-state__badge">Google Connected</span>
                <button
                  type="button"
                  className="profile-action profile-action--secondary"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </div>
            )}
            <label className="profile-field">
              <span>Profile Name</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile('name', e.target.value)}
                placeholder="How should the assistant refer to you?"
              />
            </label>
            <label className="profile-field">
              <span>Experience Level</span>
              <select
                value={profile.experienceLevel}
                onChange={(e) => updateProfile('experienceLevel', e.target.value)}
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
            <label className="profile-field">
              <span>Primary Language</span>
              <input
                type="text"
                value={profile.primaryLanguage}
                onChange={(e) => updateProfile('primaryLanguage', e.target.value)}
                placeholder="Python, Java, C++, JavaScript..."
              />
            </label>
            <label className="profile-field">
              <span>LeetCode Goals</span>
              <textarea
                value={profile.leetcodeGoals}
                onChange={(e) => updateProfile('leetcodeGoals', e.target.value)}
                placeholder="What are you optimizing for right now?"
                rows={3}
              />
            </label>
            <label className="profile-field">
              <span>Problems Solved</span>
              <input
                type="number"
                min="0"
                value={profile.problemsSolved}
                onChange={(e) => updateProfile('problemsSolved', Number(e.target.value) || 0)}
              />
            </label>
            <label className="profile-field">
              <span>Spreadsheet ID</span>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => onSpreadsheetIdChange(e.target.value)}
                placeholder="Paste a Google Sheets ID"
              />
            </label>
            <p>
              {isAuthenticated
                ? 'Your Google account can read and write the spreadsheet above.'
                : 'Sign in with Google to use your own Sheets access. Local profile settings still save on this device.'}
            </p>
            {!isAuthenticated && (
              <button
                type="button"
                className="profile-action"
                onClick={onSignIn}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
