import { useState } from 'react'
import ChatPanel from './components/ChatPanel'
import QueryPreview from './components/QueryPreview'
import InvestigationSummary from './components/InvestigationSummary'
import Dashboard from './components/Dashboard'
import { chat, translateQuery } from './services/api'

export default function App() {
  const [query, setQuery] = useState('')
  const [summary, setSummary] = useState('')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (message) => {
    setLoading(true)
    try {
      const translated = await translateQuery(message)
      setQuery(JSON.stringify(translated.query, null, 2))
      setSummary(translated.explanation || translated.summary || '')
      setModel(translated.model || '')
      await chat(message)
    } catch (error) {
      setSummary(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Query Sentinel AI</h1>
        <p>Explainable AI threat hunting for Wazuh-first SIEM workflows.</p>
      </header>

      <main className="layout-grid">
        <ChatPanel onSubmit={handleSubmit} loading={loading} />
        <QueryPreview query={query} />
        <InvestigationSummary summary={summary} model={model} />
        <Dashboard />
      </main>
    </div>
  )
}
