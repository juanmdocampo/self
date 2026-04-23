import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('self_token'))
  const [currentUser, setCurrentUser] = useState(() => {
    const u = localStorage.getItem('self_user')
    return u ? JSON.parse(u) : null
  })
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const login = useCallback((tok, user) => {
    setToken(tok)
    setCurrentUser(user)
    localStorage.setItem('self_token', tok)
    localStorage.setItem('self_user', JSON.stringify(user))
    setLoginModalOpen(false)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setCurrentUser(null)
    localStorage.removeItem('self_token')
    localStorage.removeItem('self_user')
  }, [])

  return (
    <AuthContext.Provider value={{
      token,
      currentUser,
      login,
      logout,
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
