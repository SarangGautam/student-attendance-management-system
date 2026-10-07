export class ApiError extends Error {
  constructor(message, status, code, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('Something went wrong. Please try again.', 0)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(payload.message || 'Something went wrong. Please try again.', response.status, payload.code, payload.errors)
  }
  return payload
}

export const authApi = {
  me: () => apiRequest('/api/auth/me'),
  login: (values) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  register: (values) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(values) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
}
