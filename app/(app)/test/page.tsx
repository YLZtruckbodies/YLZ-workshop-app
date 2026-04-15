'use client'

import { useState } from 'react'

// ─── This page is visible to fullAdmin users only. All actions here are
//     read-only — nothing created in this section affects live app data. ───────

export default function TestLabPage() {
  const [quoteId, setQuoteId] = useState('')
  const [jobId, setJobId] = useState('')
  const [quoteResults, setQuoteResults] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function searchQuotes() {
    if (!quoteId.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes?search=${encodeURIComponent(quoteId.trim())}`)
      const data = await res.json()
      setQuoteResults(Array.isArray(data) ? data : [])
    } catch {
      setQuoteResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🧪</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Test Lab</h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 3,
            background: 'rgba(232,104,26,0.15)', color: '#E8681A',
            border: '1px solid rgba(232,104,26,0.4)',
          }}>
            SANDBOX
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Sandbox environment — actions here are read-only and do not affect live jobs, quotes, or any other section of the app.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Quote PDF ──────────────────────────────────────────────────── */}
        <Section title="Quote PDF" icon="💲">
          <p style={helpText}>
            Enter a quote number (e.g. <code style={code}>YLZ-0042</code>) or paste a quote ID to
            open its print-ready PDF in a new tab.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={quoteId}
              onChange={e => setQuoteId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchQuotes()}
              placeholder="Quote number or ID..."
              style={inputStyle}
            />
            <ActionBtn onClick={searchQuotes} disabled={loading}>
              {loading ? 'Searching...' : 'Find Quote'}
            </ActionBtn>
          </div>

          {quoteResults !== null && (
            <div style={{ marginTop: 12 }}>
              {quoteResults.length === 0 ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>No quotes found.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quoteResults.slice(0, 8).map((q: any) => (
                    <div key={q.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#E8681A', minWidth: 100 }}>
                        {q.quoteNumber}
                      </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                        {q.customerName}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {q.buildType}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <LinkBtn href={`/qpdf/${q.id}`} label="Quote PDF" />
                        <LinkBtn href={`/qsheet/${q.id}`} label="Quote Sheet" />
                        <LinkBtn href={`/quotes/builder?id=${q.id}`} label="Builder" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Job Sheet ─────────────────────────────────────────────────── */}
        <Section title="Job Sheet" icon="📋">
          <p style={helpText}>
            Enter a job number or ID to open the print-ready job sheet.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              placeholder="Job number or ID..."
              style={inputStyle}
            />
            <ActionBtn
              onClick={() => {
                if (jobId.trim()) window.open(`/jsheet/${jobId.trim()}`, '_blank')
              }}
            >
              Open Job Sheet
            </ActionBtn>
          </div>
        </Section>

        {/* ── Standalone HTML Tools ─────────────────────────────────────── */}
        <Section title="Standalone HTML Tools" icon="🛠">
          <p style={helpText}>
            These tools run entirely in-browser — no DB required. Useful for testing generation logic in isolation.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <LinkBtn href="/job-sheet-creator.html" label="Job Sheet Creator" large />
            <LinkBtn href="/quote-builder.html" label="Quote Builder" large />
            <LinkBtn href="/vin-plate-generator.html" label="VIN Plate Generator" large />
          </div>
        </Section>

        {/* ── API Quick-Checks ──────────────────────────────────────────── */}
        <Section title="API Quick-Checks" icon="⚡">
          <p style={helpText}>
            Fire a quick GET to common endpoints and see the raw JSON response below.
          </p>
          <ApiTester />
        </Section>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: 0.3 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function ActionBtn({
  onClick, disabled, children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 18px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
        border: '1.5px solid rgba(232,104,26,0.6)',
        background: disabled ? 'transparent' : 'rgba(232,104,26,0.12)',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#E8681A',
        fontSize: 12, fontWeight: 700, letterSpacing: 0.5, fontFamily: 'inherit',
        transition: '0.15s',
      }}
    >
      {children}
    </button>
  )
}

function LinkBtn({ href, label, large }: { href: string; label: string; large?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-block',
        padding: large ? '9px 18px' : '5px 12px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.75)',
        fontSize: large ? 12 : 11,
        fontWeight: 600,
        textDecoration: 'none',
        letterSpacing: 0.3,
        transition: '0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
        e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
        e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
      }}
    >
      {label} ↗
    </a>
  )
}

const QUICK_ENDPOINTS = [
  { label: 'Jobs (first 5)', url: '/api/jobs?limit=5' },
  { label: 'Quotes (first 5)', url: '/api/quotes?limit=5' },
  { label: 'Users', url: '/api/users' },
  { label: 'Notifications (unread)', url: '/api/notifications?unreadOnly=true' },
  { label: 'Work Orders (first 5)', url: '/api/work-orders?limit=5' },
]

function ApiTester() {
  const [result, setResult] = useState<{ url: string; status: number; body: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function hit(url: string) {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(url)
      const text = await res.text()
      let body: string
      try {
        body = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        body = text
      }
      setResult({ url, status: res.status, body })
    } catch (e: any) {
      setResult({ url, status: 0, body: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {QUICK_ENDPOINTS.map(ep => (
          <button
            key={ep.url}
            onClick={() => hit(ep.url)}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: 4, cursor: loading ? 'default' : 'pointer',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600,
              fontFamily: 'inherit', transition: '0.15s',
            }}
          >
            {ep.label}
          </button>
        ))}
      </div>
      {result && (
        <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
            fontSize: 11, color: 'rgba(255,255,255,0.5)',
          }}>
            <span style={{ color: result.status >= 200 && result.status < 300 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
              {result.status || 'ERR'}
            </span>
            <span>{result.url}</span>
          </div>
          <pre style={{
            margin: 0, padding: '12px', fontSize: 11, lineHeight: 1.5,
            color: 'rgba(255,255,255,0.7)', background: '#0a0a0a',
            overflowX: 'auto', maxHeight: 320, overflowY: 'auto',
          }}>
            {result.body.length > 8000 ? result.body.slice(0, 8000) + '\n\n... (truncated)' : result.body}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const helpText: React.CSSProperties = {
  fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px',
}

const code: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 11,
  background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3,
}

const inputStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit',
  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', outline: 'none', minWidth: 260,
}
