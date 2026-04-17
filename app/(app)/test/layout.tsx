'use client'

import { TestModeProvider } from '@/lib/test-mode-context'

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <TestModeProvider>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Persistent TEST ENVIRONMENT banner */}
        <div style={{
          background: 'rgba(232,104,26,0.1)',
          borderBottom: '2px solid rgba(232,104,26,0.35)',
          padding: '7px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: '#E8681A' }}>⚠</span>
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#E8681A',
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            Test Environment
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            — isolated from live data. Nothing here affects production.
          </span>
        </div>
        {children}
      </div>
    </TestModeProvider>
  )
}
