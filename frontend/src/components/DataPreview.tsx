import type { SheetRow, SummaryReport } from '../types';

interface Props {
  data: SheetRow | null;
  report: SummaryReport | null;
  onCommit: () => void;
  isLoading: boolean;
}

export default function DataPreview({ data, report, onCommit, isLoading }: Props) {
  if (!data && !report) {
    return (
      <div className="preview-empty">
        <p>No data extracted yet. Try describing a problem you solved!</p>
      </div>
    );
  }

  return (
    <div className="data-preview-card">
      {report && (
        <section className="preview-report">
          <span className="preview-section-label">Summary Report</span>
          <h3>{report.headline}</h3>
          <p className="preview-report__summary">{report.summary}</p>

          {report.observations.length > 0 && (
            <div className="preview-report__block">
              <h4>Observations</h4>
              <ul className="preview-list">
                {report.observations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div className="preview-report__block">
              <h4>Recommendations</h4>
              <ul className="preview-list">
                {report.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {data && (
        <>
          <div className="preview-table-header">
            <span className="preview-section-label">Sheet Draft</span>
            <h4>Proposed Entry</h4>
          </div>
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
        </>
      )}
    </div>
  );
}
