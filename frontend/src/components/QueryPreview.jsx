import { useState } from 'react'

function detectQueryType(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'Unknown'
  const q = parsed.query
  if (!q) return 'No Query'
  if (q.match_all !== undefined) return 'Match All'
  if (q.bool !== undefined) return 'Bool Query'
  if (q.range !== undefined) return 'Range Query'
  if (q.term !== undefined) return 'Term Query'
  if (q.terms !== undefined) return 'Terms Query'
  if (q.match !== undefined) return 'Match Query'
  if (q.multi_match !== undefined) return 'Multi Match'
  if (q.query_string !== undefined) return 'Query String'
  if (q.wildcard !== undefined) return 'Wildcard'
  if (q.exists !== undefined) return 'Exists'
  const keys = Object.keys(q)
  if (keys.length > 0) return keys[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return 'Custom Query'
}

const TYPE_COLORS = {
  'Match All': '#22c55e',
  'Bool Query': '#a78bfa',
  'Range Query': '#fb923c',
  'Term Query': '#38bdf8',
  'Terms Query': '#38bdf8',
  'Match Query': '#34d399',
  'Multi Match': '#34d399',
  'Query String': '#facc15',
  Wildcard: '#f472b6',
  Exists: '#94a3b8',
  'No Query': '#64748b',
  Unknown: '#64748b',
}

export default function QueryPreview({ query, onExecute, executing }) {
  const [copied, setCopied] = useState(false)

  let displayText = query || ''
  let parsed = null
  let queryType = 'No Query'

  if (query) {
    try {
      parsed = JSON.parse(query)
      displayText = JSON.stringify(parsed, null, 2)
      queryType = detectQueryType(parsed)
    } catch {
      queryType = 'Raw Query'
    }
  }

  const handleCopy = () => {
    if (!query) return
    navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const typeColor = TYPE_COLORS[queryType] || '#94a3b8'

  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Generated Query
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {query && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: `${typeColor}22`,
                color: typeColor,
                border: `1px solid ${typeColor}55`,
                whiteSpace: 'nowrap',
              }}
            >
              {queryType}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!query}
            style={{
              padding: '4px 12px',
              fontSize: '0.78rem',
              background: copied ? '#22c55e22' : 'rgba(59,130,246,0.15)',
              border: `1px solid ${copied ? '#22c55e55' : 'rgba(59,130,246,0.35)'}`,
              color: copied ? '#22c55e' : '#93c5fd',
              borderRadius: '8px',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => onExecute && onExecute(displayText)}
            disabled={!query || executing}
            style={{
              padding: '4px 14px',
              fontSize: '0.78rem',
              background: executing ? 'rgba(59,130,246,0.1)' : '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
            }}
          >
            {executing ? 'Running…' : '▶ Execute'}
          </button>
        </div>
      </div>

      <pre
        className="code-block"
        style={{
          flex: 1,
          minHeight: '340px',
          maxHeight: '420px',
          overflowY: 'auto',
          color: '#7dd3fc',
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontSize: '0.82rem',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {displayText || <span style={{ color: '#475569' }}>No query generated yet.</span>}
      </pre>
    </section>
  )
}
