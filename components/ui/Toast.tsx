'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'var(--green)',
  error: 'var(--red)',
  info: 'var(--blue)',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--dark3)',
              border: '1px solid var(--border2)',
              borderLeft: `3px solid ${BORDER_COLORS[toast.type]}`,
              borderRadius: '4px',
              padding: '12px 16px',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: "'League Spartan', sans-serif",
              minWidth: '260px',
              maxWidth: '380px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              animation: 'toast-slide-in 0.25s ease-out',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
