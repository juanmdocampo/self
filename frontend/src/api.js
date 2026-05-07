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

export async function uploadDocument(token, file) {
  const fd = new FormData()
  fd.append('document_upload', file)
  const res = await fetch(`${BASE}/auth/me/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const json = await res.json()
  if (!res.ok) throw new Error('Error al subir documento.')
  return json
}

export async function fetchPsychologists(token, filters = {}) {
  const params = new URLSearchParams()
  if (filters.specialty) params.set('specialty', filters.specialty)
  if (filters.modality) params.set('modality', filters.modality)
  if (filters.maxPrice) params.set('max_price', filters.maxPrice)
  if (filters.language) params.set('language', filters.language)
  const qs = params.toString()
  const res = await fetch(`${BASE}/psychologists/${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Error al cargar psicólogos.')
  return res.json()
}

export async function fetchPsychologist(token, id) {
  const res = await fetch(`${BASE}/psychologists/${id}/`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Psicólogo no encontrado.')
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

export async function fetchFavorites(token) {
  const res = await fetch(`${BASE}/favorites/`, { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function deleteFavorite(token, favoriteId) {
  const res = await fetch(`${BASE}/favorites/${favoriteId}/`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Error al eliminar favorito.')
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export async function fetchPublicSlots(token, psychologistId) {
  const res = await fetch(`${BASE}/calendar/slots/?psychologist=${psychologistId}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) return []
  return res.json()
}

export async function fetchMySlots(token) {
  const res = await fetch(`${BASE}/calendar/slots/mine/`, { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function createSlot(token, data) {
  const res = await fetch(`${BASE}/calendar/slots/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(Object.values(json).flat().join(' ') || 'Error al crear turno.')
  return json
}

export async function deleteSlot(token, slotId) {
  const res = await fetch(`${BASE}/calendar/slots/${slotId}/`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Error al eliminar turno.')
}

export async function fetchAppointments(token) {
  const res = await fetch(`${BASE}/calendar/appointments/`, { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function bookAppointment(token, slotId, notes = '') {
  const res = await fetch(`${BASE}/calendar/appointments/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ slot_id: slotId, notes }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Error al reservar.')
  return json
}

export async function updateAppointment(token, appointmentId, newStatus) {
  const res = await fetch(`${BASE}/calendar/appointments/${appointmentId}/`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status: newStatus }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Error al actualizar.')
  return json
}

export async function fetchConversations(token) {
  const res = await fetch(`${BASE}/chat/`, { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function getOrCreateConversation(token, psychologistId) {
  const res = await fetch(`${BASE}/chat/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ psychologist_id: psychologistId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al abrir chat.')
  return data
}

export async function fetchMessages(token, conversationId) {
  const res = await fetch(`${BASE}/chat/${conversationId}/messages/`, {
    headers: authHeaders(token),
  })
  if (!res.ok) return []
  return res.json()
}

export async function sendMessage(token, conversationId, text) {
  const res = await fetch(`${BASE}/chat/${conversationId}/messages/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al enviar.')
  return data
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
