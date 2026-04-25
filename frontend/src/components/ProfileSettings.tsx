interface Props {
  userName: string;
  userEmail?: string;
  isAuthenticated: boolean;
  isOpen: boolean;
  onToggle: () => void;
  spreadsheetId: string;
  onSpreadsheetIdChange: (value: string) => void;
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
  onSignIn,
  onSignOut,
}: Props) {
  const initials = (userName || 'C')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
                : 'Sign in with Google to use your own Sheets access.'}
            </p>
            <button
              type="button"
              className="profile-action"
              onClick={isAuthenticated ? onSignOut : onSignIn}
            >
              {isAuthenticated ? 'Sign out' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
