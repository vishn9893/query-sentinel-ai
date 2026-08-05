const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with ${response.status}`)
  }

  return response.json()
}

export function getHealth() {
  return request('/health')
}

export function translateQuery(message) {
  return request('/translate', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function chat(message) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function investigate(message, query, alerts) {
  return request('/investigate', {
    method: 'POST',
    body: JSON.stringify({ message, query, alerts }),
  })
}

export function executeQuery(query, index = 'wazuh-alerts-*') {
  return request('/execute', {
    method: 'POST',
    body: JSON.stringify({ query, index }),
  })
}

export function getAlerts(limit = 100, level = null, hours = 24) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('hours', String(hours))
  if (level !== null) params.set('level', String(level))
  return request(`/alerts?${params.toString()}`)
}

export function getDashboard(hours = 24) {
  return request(`/dashboard?hours=${hours}`)
}

export function hunt(objective, hours = 24) {
  return request('/hunt', {
    method: 'POST',
    body: JSON.stringify({ objective, hours }),
  })
}

/**
 * SSE streaming translate.
 * @param {string} message
 * @param {(token: string) => void} onToken  called for each streamed token
 * @param {() => void} onDone               called when stream closes
 * @returns {() => void}  cleanup function that closes the EventSource
 */
export function streamTranslate(message, onToken, onDone) {
  const url = `${API_BASE}/stream?message=${encodeURIComponent(message)}`
  const es = new EventSource(url)

  es.onmessage = (event) => {
    if (event.data) {
      onToken(event.data)
    }
  }

  es.onerror = () => {
    es.close()
    onDone()
  }

  es.addEventListener('done', () => {
    es.close()
    onDone()
  })

  // Fallback: close + done if the connection ends naturally
  const origClose = es.close.bind(es)
  return () => {
    origClose()
    onDone()
  }
}
