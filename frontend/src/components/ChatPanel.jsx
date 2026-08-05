import { useState } from 'react'

export default function ChatPanel({ onSubmit, loading }) {
  const [message, setMessage] = useState('Show high priority alerts from the last 24 hours')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!message.trim() || loading) return
    onSubmit(message.trim())
  }

  return (
    <section className="panel">
      <h2>Chat</h2>
      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          placeholder="Ask in plain language..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Running…' : 'Translate'}
        </button>
      </form>
    </section>
  )
}
