import { useState, useEffect, useRef } from 'react'

const PRESETS = [
  'High alerts 24h',
  'Failed logins',
  'Suspicious PowerShell',
  'SSH brute force',
]

export default function ChatPanel({ onSubmit, onHunt, loading, streamingText }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const historyEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Expose addAssistantMessage so App can push replies in
  // We use a callback pattern: parent calls onSubmit, then adds assistant message externally
  // But since history is local, we need a way for App to push replies.
  // Solution: App passes the reply back through a prop or we use an event pattern.
  // Per spec, the parent calls onSubmit and we add user msg locally.
  // The assistant reply will come back via streamingText or will be finalized by App.
  // We'll expose addReply via window (simple) or just watch streamingText for completion.
  // Actually spec says: "Adds assistant message to chat history" in App handlers.
  // Since history is local, we'll use an internal ref trick:
  // App doesn't own history — we do. So when loading goes false and streamingText has content,
  // we commit it. We also need App to be able to add plain text replies.
  // Let's use a simpler model: expose a function via ref prop.
  // But spec doesn't mention a ref prop. We'll use a global event bus approach with a custom event.
  // Simplest: watch for a prop `assistantReply` that when it changes, we push to history.
  // Not listed in props. Let's just finalize from streamingText when loading transitions false→true.

  const prevLoadingRef = useRef(loading)
  const streamAccRef = useRef('')

  useEffect(() => {
    if (streamingText) {
      streamAccRef.current = streamingText
    }
  }, [streamingText])

  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading
    if (wasLoading && !loading) {
      // loading finished — commit streaming text as assistant message if any
      const accumulated = streamAccRef.current
      if (accumulated) {
        setHistory((h) => [...h, { role: 'assistant', content: accumulated }])
        streamAccRef.current = ''
      }
    }
  }, [loading])

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, streamingText])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || loading) return
    setHistory((h) => [...h, { role: 'user', content: trimmed }])
    onSubmit(trimmed)
    setMessage('')
  }

  const handleHunt = () => {
    const trimmed = message.trim()
    if (!trimmed || loading) return
    setHistory((h) => [...h, { role: 'user', content: `[Hunt] ${trimmed}` }])
    onHunt(trimmed)
    setMessage('')
  }

  const handlePreset = (preset) => {
    setMessage(preset)
    textareaRef.current?.focus()
  }

  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
      <h2 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
        Chat
      </h2>

      {/* Preset chips */}
      <div className="preset-chips">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            onClick={() => handlePreset(p)}
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message history */}
      <div className="history-scroll" style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
        {history.length === 0 && !streamingText && (
          <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '24px' }}>
            Ask anything about your Wazuh alerts…
          </p>
        )}

        {history.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'user' ? 'msg-user' : 'msg-assistant'}
          >
            <div className="msg-bubble">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming / typing bubble */}
        {streamingText && (
          <div className="msg-assistant">
            <div className="msg-bubble" style={{ opacity: 0.85 }}>
              {streamingText}
              <span className="typing-cursor">▋</span>
            </div>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          rows={3}
          placeholder="Ask in plain language… (Enter to send, Shift+Enter for newline)"
          disabled={loading}
          style={{ resize: 'none' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading || !message.trim()}
            style={{ flex: 1, position: 'relative' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Spinner /> Translating…
              </span>
            ) : (
              'Translate'
            )}
          </button>
          <button
            type="button"
            className="btn-hunt"
            onClick={handleHunt}
            disabled={loading || !message.trim()}
            title="Run a proactive threat hunt"
          >
            {loading ? <Spinner /> : '🔍 Hunt'}
          </button>
        </div>
      </form>
    </section>
  )
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}
