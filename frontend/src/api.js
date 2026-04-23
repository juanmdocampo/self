const BASE = '/api'

function authHeaders(token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.non_field_errors?.[0] || 'Credenciales inválidas.')
  return data
}

export async function register(body) {
  const res = await fetch(`${BASE}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(Object.values(data).flat().join(' ') || 'Error al registrarse.')
  return data
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  if (!res.ok) throw new Error('Sesión expirada.')
  const data = await res.json()
  return data.access
}

export async function fetchMe(token) {
  const res = await fetch(`${BASE}/auth/me/`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Error al cargar perfil.')
  return res.json()
}

export async function updateProfile(token, data) {
  const res = await fetch(`${BASE}/auth/me/`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(Object.values(json).flat().join(' ') || 'Error al guardar.')
  return json
}

export async function uploadAvatar(token, file) {
  const fd = new FormData()
  fd.append('avatar', file)
  const res = await fetch(`${BASE}/auth/me/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const json = await res.json()
  if (!res.ok) throw new Error('Error al subir foto.')
  return json
}

export async function fetchPsychologists(token, filters = {}) {
  const params = new URLSearchParams()
  if (filters.specialty) params.set('specialty', filters.specialty)
  if (filters.modality) params.set('modality', filters.modality)
  if (filters.maxPrice) params.set('max_price', filters.maxPrice)
  const qs = params.toString()
  const res = await fetch(`${BASE}/psychologists/${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Error al cargar psicólogos.')
  return res.json()
}

export async function swipeAction(token, psychologistId, action) {
  const res = await fetch(`${BASE}/swipe/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ psychologist: psychologistId, action }),
  })
  if (!res.ok) return {}
  return res.json()
}

export async function fetchMatches(token) {
  const res = await fetch(`${BASE}/matches/`, { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function deleteMatch(token, matchId) {
  const res = await fetch(`${BASE}/matches/${matchId}/`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Error al eliminar match.')
}

export async function submitRecommendation(body) {
  const res = await fetch(`${BASE}/recommendations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Error al enviar. Intentá de nuevo.')
  return res.json()
}
