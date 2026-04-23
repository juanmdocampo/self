import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Nav from './components/Nav'
import LoginModal from './components/LoginModal'
import Landing from './pages/Landing'
import Discover from './pages/Discover'
import Register from './pages/Register'
import Recommend from './pages/Recommend'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Nav />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/register" element={<Register />} />
            <Route path="/recommend" element={<Recommend />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <LoginModal />
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}
