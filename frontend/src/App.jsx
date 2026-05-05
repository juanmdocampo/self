import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Nav from './components/Nav'
import LoginModal from './components/LoginModal'
import Landing from './pages/Landing'
import Discover from './pages/Discover'
import Register from './pages/Register'
import Recommend from './pages/Recommend'
import Profile from './pages/Profile'
import Favorites from './pages/Matches'
import PsychProfile from './pages/PsychProfile'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/recommend" element={<Recommend />} />
        <Route path="/psicologos/:id" element={<PsychProfile />} />
      </Routes>
      <LoginModal />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}
