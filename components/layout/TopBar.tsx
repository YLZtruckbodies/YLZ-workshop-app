'use client'

import React from 'react'
import { useSession, signOut } from 'next-auth/react'

interface TopBarProps {
  title: string
  onConfigure?: () => void
}

export default function TopBar({ title, onConfigure }: TopBarProps) {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <header
      style={{
        height: '52px',
        background: 'var(--dark2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: '24px',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '3px',
              lineHeight: 1,
            }}
          >
            YLZ
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              lineHeight: 1,
              marginTop: '1px',
            }}
          >
            WORKSHOP
          </span>
        </div>

        {/* Separator */}
        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'var(--border2)',
          }}
        />

        {/* Page title */}
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          {title}
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Configure button - only for fullAdmin */}
        {user?.fullAdmin && onConfigure && (
          <button
            onClick={onConfigure}
            style={{
              background: 'transparent',
              border: '1.5px solid var(--border2)',
              borderRadius: '3px',
              color: 'var(--text3)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s',
              fontFamily: "'League Spartan', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--text3)'
            }}
          >
            <span style={{ fontSize: '13px' }}>&#9881;</span>
            Configure
          </button>
        )}

        {/* Save All button */}
        <button
          style={{
            background: 'var(--btn-primary)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderRadius: '3px',
            color: '#f7f7f7',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'background 0.15s',
            fontFamily: "'League Spartan', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--btn-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--btn-primary)')}
        >
          Save All
        </button>

        {/* User badge */}
        {user && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: user.color || 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
            title={user.name}
          >
            {user.name?.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text3)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '4px 6px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
          title="Sign out"
        >
          &#x2192;
        </button>
      </div>
    </header>
  )
}
