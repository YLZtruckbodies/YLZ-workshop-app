'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserInfo {
  id: string
  name: string
  role: string
  color: string
  defaultScreen: string
  section: string | null
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<UserInfo | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((data: UserInfo[]) => setUsers(data))
  }, [])

  const filtered = users.filter(
    (u) =>
      !filter ||
      u.name.toLowerCase().includes(filter.toLowerCase()) ||
      u.role.toLowerCase().includes(filter.toLowerCase())
  )

  async function handleLogin() {
    if (!selected || pin.length !== 4) return
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      userId: selected.id,
      pin,
      redirect: false,
    })

    if (res?.error) {
      setError('Incorrect PIN — try again')
      setPin('')
      pinRef.current?.focus()
      setLoading(false)
    } else {
      router.push(`/${selected.defaultScreen}`)
    }
  }

  function handlePinChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 4)
    setPin(cleaned)
    if (cleaned.length === 4) {
      setTimeout(() => handleLogin(), 100)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 400,
          background: 'var(--dark2)',
          border: '1px solid var(--border2)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 28px 20px',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <img
            src="/images/ylz-logo.webp"
            alt="YLZ"
            style={{ height: 72, objectFit: 'contain', marginBottom: 12 }}
          />
          <div
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 3,
              color: '#fff',
            }}
          >
            WORKSHOP LOGIN
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Select your name to sign in
          </div>
        </div>

        {!selected ? (
          /* Step 1: User List */
          <div>
            <div style={{ padding: '12px 16px' }}>
              <input
                type="text"
                placeholder="Search by name or role..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--dark3)',
                  border: '1px solid var(--border2)',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {filtered.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelected(u)
                    setPin('')
                    setError('')
                    setTimeout(() => pinRef.current?.focus(), 50)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: '0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: u.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'League Spartan', sans-serif",
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {u.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                      {u.role}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text3)' }}>›</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text3)',
                  }}
                >
                  No users found
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: PIN Entry */
          <div style={{ padding: '28px', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: selected.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                margin: '0 auto 12px',
              }}
            >
              {selected.name[0]}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {selected.role}
            </div>

            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--text3)',
                  marginBottom: 8,
                }}
              >
                Enter 4-digit PIN
              </div>
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin()
                }}
                style={{
                  width: 160,
                  padding: '12px',
                  background: 'var(--dark3)',
                  border: '2px solid var(--border2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 28,
                  textAlign: 'center',
                  letterSpacing: 12,
                  outline: 'none',
                  fontFamily: "'League Spartan', sans-serif",
                  fontWeight: 700,
                }}
              />
              {error && (
                <div
                  style={{ fontSize: 12, color: 'var(--red)', marginTop: 10, fontWeight: 600 }}
                >
                  {error}
                </div>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={pin.length !== 4 || loading}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '12px',
                background: pin.length === 4 ? 'var(--btn-primary)' : 'var(--mid)',
                border: pin.length === 4 ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid transparent',
                borderRadius: 4,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                transition: '0.15s',
                minHeight: 44,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              onClick={() => {
                setSelected(null)
                setPin('')
                setError('')
              }}
              style={{
                marginTop: 10,
                background: 'transparent',
                border: 'none',
                color: 'var(--text3)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              ← Back to user list
            </button>
          </div>
        )}

        {/* Version footer — remove after deploy test */}
        <div style={{ padding: '8px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          v2.0.2 — 08/04/2026
        </div>
      </div>
    </div>
  )
}
