'use client'

import { useRouter } from 'next/navigation'

export default function JobSheetsPage() {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            onClick={() => router.push('/engineering')}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E8681A'
              e.currentTarget.style.color = '#E8681A'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text3)'
            }}
          >
            &larr; Engineering
          </button>
        </div>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Job Sheet Creator
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Drop a quote PDF, review extracted details, and generate Excel job sheets.
        </div>
      </div>

      {/* Iframe */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src="/job-sheet-creator.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#000',
          }}
          title="Job Sheet Creator"
        />
      </div>
    </div>
  )
}
