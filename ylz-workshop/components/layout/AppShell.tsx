'use client'

import React from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

interface AppShellProps {
  title: string
  subtitle?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({ title, subtitle, headerRight, children }: AppShellProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '52px 1fr',
        gridTemplateColumns: '220px 1fr',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* TopBar - spans full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar title={title} />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main
        style={{
          overflowY: 'auto',
          background: 'var(--dark)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px 0',
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text3)',
                  margin: '4px 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px 28px',
            flex: 1,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
