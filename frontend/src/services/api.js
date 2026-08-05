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
