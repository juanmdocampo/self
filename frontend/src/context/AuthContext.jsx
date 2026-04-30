import { createContext, useContext, useState, useCallback } from 'react'
import { refreshAccessToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('self_token'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('self_refresh'))
  const [currentUser, setCurrentUser] = useState(() => {
    const u = localStorage.getItem('self_user')
    return u ? JSON.parse(u) : null
  })
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const login = useCallback((access, refresh, user) => {
    setToken(access)
    setRefreshToken(refresh)
    setCurrentUser(user)
    localStorage.setItem('self_token', access)
    localStorage.setItem('self_refresh', refresh)
    localStorage.setItem('self_user', JSON.stringify(user))
    setLoginModalOpen(false)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setRefreshToken(null)
    setCurrentUser(null)
    localStorage.removeItem('self_token')
    localStorage.removeItem('self_refresh')
    localStorage.removeItem('self_user')
  }, [])

  const updateUser = useCallback((user) => {
    setCurrentUser(user)
    localStorage.setItem('self_user', JSON.stringify(user))
  }, [])

  const refresh = useCallback(async () => {
    const rt = localStorage.getItem('self_refresh')
    if (!rt) { logout(); return null }
    try {
      const access = await refreshAccessToken(rt)
      setToken(access)
      localStorage.setItem('self_token', access)
      return access
    } catch {
      logout()
      return null
    }
  }, [logout])

  return (
    <AuthContext.Provider value={{
      token,
      refreshToken,
      currentUser,
      login,
      logout,
      updateUser,
      refresh,
      loginModalOpen,
      openLoginModal: () => setLoginModalOpen(true),
      closeLoginModal: () => setLoginModalOpen(false),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
