import { useEffect, useRef } from 'react'

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

function StatCard({ label, value, color, loading }) {
  return (
    <div className="stat-card">
      {loading ? (
        <div className="skeleton-shimmer" style={{ height: '40px', borderRadius: '6px', marginBottom: '8px' }} />
      ) : (
        <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
      )}
      <div className="stat-label">{label}</div>
    </div>
  )
}

function SeverityBarChart({ counts }) {
  const entries = ['critical', 'high', 'medium', 'low']
  const max = Math.max(...entries.map((k) => counts?.[k] || 0), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
      {entries.map((key) => {
        const val = counts?.[key] || 0
        const pct = (val / max) * 100
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '64px',
              fontSize: '0.75rem',
              color: SEVERITY_COLORS[key],
              textAlign: 'right',
              textTransform: 'capitalize',
              flexShrink: 0,
            }}>
              {key}
            </span>
            <div style={{ flex: 1, background: 'rgba(148,163,184,0.1)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: SEVERITY_COLORS[key],
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ width: '36px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right', flexShrink: 0 }}>
              {val}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TimelineChart({ timeline }) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return <p style={{ color: '#64748b', textAlign: 'center', margin: '16px 0' }}>No timeline data.</p>
  }

  const W = 700
  const H = 100
  const PAD = { top: 10, right: 16, bottom: 28, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const counts = timeline.map((d) => d.count || 0)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts, 1)

  const scaleX = (i) => PAD.left + (i / Math.max(timeline.length - 1, 1)) * innerW
  const scaleY = (v) => PAD.top + innerH - ((v - minCount) / (maxCount - minCount || 1)) * innerH

  const points = timeline.map((d, i) => `${scaleX(i)},${scaleY(d.count || 0)}`).join(' ')

  // Area polygon
  const areaPoints = [
    `${PAD.left},${PAD.top + innerH}`,
    ...timeline.map((d, i) => `${scaleX(i)},${scaleY(d.count || 0)}`),
    `${PAD.left + innerW},${PAD.top + innerH}`,
  ].join(' ')

  // X-axis labels: show every nth
  const labelEvery = Math.max(1, Math.ceil(timeline.length / 6))
  const xLabels = timeline
    .map((d, i) => ({ i, ts: d.timestamp }))
    .filter((_, i) => i % labelEvery === 0 || i === timeline.length - 1)

  return (
    <div className="timeline-wrapper">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100px', display: 'block' }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + f * innerH
          return (
            <line
              key={f}
              x1={PAD.left} y1={y}
              x2={PAD.left + innerW} y2={y}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
          )
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="rgba(59,130,246,0.12)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Y-axis labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fill="#64748b" fontSize="9">
          {maxCount}
        </text>
        <text x={PAD.left - 4} y={PAD.top + innerH} textAnchor="end" fill="#64748b" fontSize="9">
          {minCount}
        </text>

        {/* X-axis labels */}
        {xLabels.map(({ i, ts }) => {
          const label = ts
            ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''
          return (
            <text
              key={i}
              x={scaleX(i)}
              y={H - 4}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default function Dashboard({ data, loading, onRefresh }) {
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      onRefresh && onRefresh()
    }, 30000)
    return () => clearInterval(intervalRef.current)
  }, [onRefresh])

  const counts = data?.severity_counts || {}
  const topAgents = Array.isArray(data?.top_agents) ? data.top_agents : []
  const timeline = Array.isArray(data?.timeline) ? data.timeline : []

  return (
    <section className="panel full-width">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Dashboard
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '4px 14px',
            fontSize: '0.78rem',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.35)',
            color: '#93c5fd',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {loading ? (
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid rgba(147,197,253,0.3)',
                borderTopColor: '#93c5fd',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          ) : '↻'}
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Total Alerts (24h)" value={data?.total_alerts_24h} color="#e2e8f0" loading={loading} />
        <StatCard label="Critical" value={counts.critical} color="#ef4444" loading={loading} />
        <StatCard label="High" value={counts.high} color="#f97316" loading={loading} />
        <StatCard label="Medium" value={counts.medium} color="#f59e0b" loading={loading} />
      </div>

      {/* Middle row: table + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        {/* Alert table */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Top Agents
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[60, 80, 50, 70].map((w, i) => (
                <div key={i} className="skeleton-shimmer" style={{ height: '24px', borderRadius: '4px', width: `${w}%` }} />
              ))}
            </div>
          ) : topAgents.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No agent data available.</p>
          ) : (
            <table className="alert-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th style={{ textAlign: 'right' }}>Alert Count</th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {row.agent || row.name || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#f97316' }}>
                      {row.count ?? row.alert_count ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Severity distribution */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Severity Distribution
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[90, 70, 50, 30].map((w, i) => (
                <div key={i} className="skeleton-shimmer" style={{ height: '16px', borderRadius: '4px', width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <SeverityBarChart counts={counts} />
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Alert Timeline
        </div>
        {loading ? (
          <div className="skeleton-shimmer" style={{ height: '100px', borderRadius: '8px' }} />
        ) : (
          <TimelineChart timeline={timeline} />
        )}
      </div>
    </section>
  )
}
