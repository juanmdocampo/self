import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', visible: false })

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-warm-dark text-cream px-6 py-3 rounded-full text-sm z-[999] pointer-events-none transition-transform duration-300 ${toast.visible ? 'translate-y-0' : 'translate-y-24'}`}>
        {toast.msg}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
