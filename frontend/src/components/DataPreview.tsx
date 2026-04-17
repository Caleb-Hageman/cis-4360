import type { SheetRow } from '../types';

interface Props {
  data: SheetRow | null;
  onCommit: () => void;
  isLoading: boolean;
}

export default function DataPreview({ data, onCommit, isLoading }: Props) {
  if (!data) {
    return (
      <div className="preview-empty">
        <p>No data extracted yet. Try describing a problem you solved!</p>
      </div>
    );
  }

  return (
    <div className="data-preview-card">
      <h3>Proposed Entry</h3>
      <table className="preview-table">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <th>{key}</th>
              <td>{value?.toString() ?? <span className="null-value">empty</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="commit-btn"
        onClick={onCommit}
        disabled={isLoading}
      >
        {isLoading ? 'Posting to Sheets...' : 'Confirm & Post to Google Sheets'}
      </button>
    </div>
  );
}