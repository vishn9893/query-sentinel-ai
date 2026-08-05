import { useState } from 'react'

const TABS = ['Summary', 'IOCs', 'MITRE', 'Next Steps']

const TACTIC_COLORS = {
  'initial-access': '#f87171',
  'execution': '#fb923c',
  'persistence': '#fbbf24',
  'privilege-escalation': '#facc15',
  'defense-evasion': '#a3e635',
  'credential-access': '#34d399',
  'discovery': '#22d3ee',
  'lateral-movement': '#38bdf8',
  'collection': '#818cf8',
  'exfiltration': '#c084fc',
  'command-and-control': '#f472b6',
  'impact': '#fb7185',
}

function getTacticColor(tactic) {
  if (!tactic) return '#64748b'
  const key = tactic.toLowerCase().replace(/\s+/g, '-')
  return TACTIC_COLORS[key] || '#64748b'
}

function RiskBar({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0))
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Risk Score</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{pct}</span>
      </div>
      <div className="risk-bar">
        <div
          className="risk-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }) {
  const map = {
    high: 'badge-high-conf',
    medium: 'badge-medium-conf',
    low: 'badge-low-conf',
  }
  const label = confidence || 'unknown'
  return (
    <span className={`badge ${map[label.toLowerCase()] || 'badge-low-conf'}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)} Confidence
    </span>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
      {[80, 60, 90, 50, 70].map((w, i) => (
        <div
          key={i}
          className="skeleton-shimmer"
          style={{ height: '14px', width: `${w}%`, borderRadius: '4px' }}
        />
      ))}
    </div>
  )
}

export default function InvestigationSummary({
  summary,
  model,
  riskScore,
  confidence,
  iocs,
  mitreTechniques,
  nextSteps,
  loading,
}) {
  const [activeTab, setActiveTab] = useState('Summary')
  const [checkedSteps, setCheckedSteps] = useState({})

  const safeIocs = Array.isArray(iocs) ? iocs.slice(0, 20) : []
  const safeMitre = Array.isArray(mitreTechniques) ? mitreTechniques : []
  const safeSteps = Array.isArray(nextSteps) ? nextSteps : []

  // Group IOCs by type
  const iocsByType = safeIocs.reduce((acc, ioc) => {
    const t = ioc.type || 'unknown'
    if (!acc[t]) acc[t] = []
    acc[t].push(ioc)
    return acc
  }, {})

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <section className="panel full-width">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Investigation Summary
        </h2>
        {model && (
          <span className="badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }}>
            {model}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'IOCs' && safeIocs.length > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.8 }}>({safeIocs.length})</span>
            )}
            {tab === 'MITRE' && safeMitre.length > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.8 }}>({safeMitre.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ marginTop: '14px', minHeight: '120px' }}>
        {loading && activeTab === 'Summary' ? (
          <Skeleton />
        ) : activeTab === 'Summary' ? (
          <div>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 14px' }}>
              {summary || 'AI summary will appear here after a translation is generated.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {confidence && <ConfidenceBadge confidence={confidence} />}
              {riskScore !== null && riskScore !== undefined && (
                <div style={{ flex: 1, minWidth: '200px', maxWidth: '340px' }}>
                  <RiskBar score={riskScore} />
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'IOCs' ? (
          <div>
            {safeIocs.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: '24px' }}>No IOCs extracted.</p>
            ) : (
              Object.entries(iocsByType).map(([type, items]) => (
                <div key={type} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    {type}
                  </div>
                  <table className="alert-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Value</th>
                        <th style={{ width: '60px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((ioc, i) => (
                        <tr key={i}>
                          <td>
                            <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                              {ioc.type || 'unknown'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#7dd3fc', wordBreak: 'break-all' }}>
                            {ioc.value || ioc}
                          </td>
                          <td>
                            <button
                              onClick={() => copyToClipboard(ioc.value || ioc)}
                              style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: '6px' }}
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'MITRE' ? (
          <div>
            {safeMitre.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: '24px' }}>No MITRE techniques identified.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {safeMitre.map((t, i) => {
                  const tacticColor = getTacticColor(t.tactic)
                  const id = t.id || t.technique_id || ''
                  const name = t.name || t.technique_name || id
                  const tactic = t.tactic || ''
                  const url = id ? `https://attack.mitre.org/techniques/${id.replace('.', '/')}` : '#'
                  return (
                    <div
                      key={i}
                      className="mitre-card"
                      style={{ borderLeft: `3px solid ${tacticColor}` }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.82rem' }}>{name}</span>
                        {id && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.72rem', color: '#60a5fa', whiteSpace: 'nowrap', textDecoration: 'none' }}
                          >
                            {id} ↗
                          </a>
                        )}
                      </div>
                      {tactic && (
                        <span style={{ fontSize: '0.7rem', color: tacticColor, marginTop: '4px', display: 'block' }}>
                          {tactic}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'Next Steps' ? (
          <div>
            {safeSteps.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: '24px' }}>No recommendations yet.</p>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {safeSteps.map((step, i) => (
                  <li key={i} className="next-step-card">
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!checkedSteps[i]}
                        onChange={() => setCheckedSteps((prev) => ({ ...prev, [i]: !prev[i] }))}
                        style={{ marginTop: '3px', accentColor: '#3b82f6', width: '15px', height: '15px', flexShrink: 0 }}
                      />
                      <span style={{
                        color: checkedSteps[i] ? '#64748b' : '#cbd5e1',
                        textDecoration: checkedSteps[i] ? 'line-through' : 'none',
                        lineHeight: 1.5,
                        fontSize: '0.88rem',
                      }}>
                        <span style={{ color: '#3b82f6', fontWeight: 700, marginRight: '6px' }}>{i + 1}.</span>
                        {typeof step === 'string' ? step : step.description || step.step || JSON.stringify(step)}
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
