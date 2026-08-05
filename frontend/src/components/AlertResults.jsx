import { useState } from 'react'

function levelColor(level) {
  const n = parseInt(level, 10)
  if (n >= 10) return '#ef4444'
  if (n >= 7) return '#f97316'
  if (n >= 4) return '#f59e0b'
  return '#22c55e'
}

function extractField(alert, ...keys) {
  for (const key of keys) {
    if (alert[key] !== undefined && alert[key] !== null) return String(alert[key])
    // Try nested _source
    if (alert._source?.[key] !== undefined) return String(alert._source[key])
  }
  return '—'
}

function formatTs(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export default function AlertResults({ results }) {
  const [showRaw, setShowRaw] = useState(false)

  if (!results) {
    return (
      <section className="panel full-width">
        <h2 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Query Results
        </h2>
        <p style={{ color: '#64748b', textAlign: 'center', margin: '24px 0', fontSize: '0.9rem' }}>
          Execute a query to see results.
        </p>
      </section>
    )
  }

  const alerts = Array.isArray(results.alerts)
    ? results.alerts
    : Array.isArray(results.hits?.hits)
    ? results.hits.hits
    : []

  const totalHits =
    results.hits?.total?.value ??
    results.hits?.total ??
    results.total ??
    alerts.length

  const tookMs = results.took_ms ?? results.took ?? null

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify(results.raw ?? results, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel full-width">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Query Results
          {totalHits !== undefined && (
            <span style={{ marginLeft: '10px', fontSize: '0.82rem', color: '#64748b', fontWeight: 400 }}>
              {totalHits} hit{totalHits !== 1 ? 's' : ''}
              {tookMs !== null && ` in ${tookMs}ms`}
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowRaw((s) => !s)}
            style={{
              padding: '4px 12px',
              fontSize: '0.78rem',
              background: showRaw ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)',
              border: `1px solid ${showRaw ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.2)'}`,
              color: showRaw ? '#a5b4fc' : '#94a3b8',
              borderRadius: '8px',
            }}
          >
            {showRaw ? 'Hide Raw' : 'Show Raw JSON'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-export"
          >
            ↓ Export JSON
          </button>
        </div>
      </div>

      {/* Alert table */}
      {alerts.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', margin: '16px 0', fontSize: '0.88rem' }}>
          No alerts in results.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
          <table className="alert-table" style={{ width: '100%', minWidth: '640px' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Level</th>
                <th>Rule Description</th>
                <th>Source IP</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, i) => {
                const src = alert._source || alert
                const ts = src['@timestamp'] || src.timestamp
                const agent = src.agent?.name || src.agent || src.hostname
                const level = src.rule?.level ?? src.level
                const desc = src.rule?.description || src.description || src.message
                const srcIp =
                  src.data?.srcip ||
                  src.srcip ||
                  src.src_ip ||
                  src.source?.ip ||
                  src.network?.source?.ip

                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#94a3b8' }}>
                      {formatTs(ts)}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                      {agent || '—'}
                    </td>
                    <td>
                      {level !== undefined && level !== null ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 8px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fff',
                            background: levelColor(level),
                          }}
                        >
                          {level}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', maxWidth: '320px' }}>
                      {desc || '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#7dd3fc' }}>
                      {srcIp || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Collapsible raw JSON */}
      {showRaw && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Raw Response
          </div>
          <pre
            style={{
              background: '#050914',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: '10px',
              padding: '12px',
              color: '#7dd3fc',
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontSize: '0.75rem',
              maxHeight: '360px',
              overflowY: 'auto',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {JSON.stringify(results.raw ?? results, null, 2)}
          </pre>
        </div>
      )}
    </section>
  )
}
