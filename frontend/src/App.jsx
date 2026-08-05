import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import QueryPreview from './components/QueryPreview'
import InvestigationSummary from './components/InvestigationSummary'
import Dashboard from './components/Dashboard'
import AlertResults from './components/AlertResults'
import {
  getHealth,
  translateQuery,
  investigate,
  executeQuery,
  getDashboard,
  hunt,
  streamTranslate,
} from './services/api'

const EMPTY_INVESTIGATION = {
  summary: '',
  model: '',
  riskScore: null,
  confidence: '',
  iocs: [],
  mitreTechniques: [],
  nextSteps: [],
}

export default function App() {
  const [query, setQuery] = useState('')
  const [investigationData, setInvestigationData] = useState(EMPTY_INVESTIGATION)
  const [executeResults, setExecuteResults] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)

  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [hunting, setHunting] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  const [health, setHealth] = useState(null) // null = unknown, true = ok, false = error
  const [error, setError] = useState(null)

  // Latest message ref for investigate calls
  const lastMessageRef = useRef('')
  // Cleanup fn for SSE
  const sseCleanupRef = useRef(null)

  // Poll health every 30s
  useEffect(() => {
    const checkHealth = () => {
      getHealth()
        .then(() => setHealth(true))
        .catch(() => setHealth(false))
    }
    checkHealth()
    const id = setInterval(checkHealth, 30000)
    return () => clearInterval(id)
  }, [])

  // Load dashboard on mount
  useEffect(() => {
    handleRefreshDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (message) => {
    setLoading(true)
    setError(null)
    setStreamingText('')
    lastMessageRef.current = message

    // Clean up any previous SSE
    if (sseCleanupRef.current) {
      sseCleanupRef.current()
      sseCleanupRef.current = null
    }

    try {
      // Translate the query
      const translated = await translateQuery(message)
      const dsl = translated.query
        ? JSON.stringify(translated.query, null, 2)
        : typeof translated === 'string'
        ? translated
        : JSON.stringify(translated, null, 2)
      setQuery(dsl)

      // Investigate with empty alerts (quick analysis)
      let invData = EMPTY_INVESTIGATION
      try {
        const invRes = await investigate(message, dsl, [])
        invData = parseInvestigation(invRes, translated)
      } catch {
        invData = {
          ...EMPTY_INVESTIGATION,
          summary: translated.explanation || translated.summary || '',
          model: translated.model || '',
        }
      }
      setInvestigationData(invData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHunt = async (objective) => {
    setHunting(true)
    setError(null)
    lastMessageRef.current = objective
    try {
      const res = await hunt(objective)
      const invData = parseInvestigation(res, {})
      setInvestigationData(invData)

      if (res.query) {
        const dsl = typeof res.query === 'string'
          ? res.query
          : JSON.stringify(res.query, null, 2)
        setQuery(dsl)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setHunting(false)
    }
  }

  const handleExecute = async (queryStr) => {
    setExecuting(true)
    setError(null)
    try {
      const res = await executeQuery(queryStr)
      setExecuteResults(res)

      // Re-investigate with real alerts
      const alerts = Array.isArray(res.alerts)
        ? res.alerts
        : Array.isArray(res.hits?.hits)
        ? res.hits.hits
        : []

      if (alerts.length > 0 && lastMessageRef.current) {
        try {
          const invRes = await investigate(lastMessageRef.current, queryStr, alerts)
          setInvestigationData(parseInvestigation(invRes, {}))
        } catch {
          // non-fatal
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setExecuting(false)
    }
  }

  const handleRefreshDashboard = async () => {
    setDashboardLoading(true)
    try {
      const data = await getDashboard()
      setDashboardData(data)
    } catch {
      // non-fatal — keep previous data
    } finally {
      setDashboardLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ margin: 0 }}>Query Sentinel AI</h1>
          <span
            className={`health-dot${health === true ? ' ok' : health === false ? ' error' : ''}`}
            title={health === true ? 'Backend online' : health === false ? 'Backend offline' : 'Checking…'}
          />
        </div>
        <p style={{ margin: '6px 0 0', color: '#a8b3cf' }}>
          Explainable AI threat hunting for Wazuh-first SIEM workflows.
        </p>
        {error && (
          <div style={{
            marginTop: '10px',
            padding: '8px 14px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
            >
              ✕
            </button>
          </div>
        )}
      </header>

      <main className="layout-grid">
        <ChatPanel
          onSubmit={handleSubmit}
          onHunt={handleHunt}
          loading={loading || hunting}
          streamingText={streamingText}
        />
        <QueryPreview
          query={query}
          onExecute={handleExecute}
          executing={executing}
        />
        <InvestigationSummary
          summary={investigationData.summary}
          model={investigationData.model}
          riskScore={investigationData.riskScore}
          confidence={investigationData.confidence}
          iocs={investigationData.iocs}
          mitreTechniques={investigationData.mitreTechniques}
          nextSteps={investigationData.nextSteps}
          loading={loading || hunting}
        />
        <AlertResults results={executeResults} />
        <Dashboard
          data={dashboardData}
          loading={dashboardLoading}
          onRefresh={handleRefreshDashboard}
        />
      </main>
    </div>
  )
}

/**
 * Normalize investigation response from various backend shapes.
 */
function parseInvestigation(res, fallback) {
  if (!res || typeof res !== 'object') {
    return {
      ...EMPTY_INVESTIGATION,
      summary: fallback.explanation || fallback.summary || '',
      model: fallback.model || '',
    }
  }

  return {
    summary:
      res.summary ||
      res.explanation ||
      res.analysis ||
      fallback.explanation ||
      fallback.summary ||
      '',
    model:
      res.model ||
      res.model_used ||
      fallback.model ||
      '',
    riskScore:
      res.risk_score ??
      res.riskScore ??
      null,
    confidence:
      res.confidence ||
      res.confidence_level ||
      '',
    iocs:
      Array.isArray(res.iocs) ? res.iocs :
      Array.isArray(res.indicators) ? res.indicators :
      [],
    mitreTechniques:
      Array.isArray(res.mitre_techniques) ? res.mitre_techniques :
      Array.isArray(res.mitre) ? res.mitre :
      Array.isArray(res.techniques) ? res.techniques :
      [],
    nextSteps:
      Array.isArray(res.next_steps) ? res.next_steps :
      Array.isArray(res.recommendations) ? res.recommendations :
      Array.isArray(res.remediation) ? res.remediation :
      [],
  }
}
