'use client'

export default function ReportsPage() {
  return (
    <div>
      <div
        style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
        }}
      >
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
          REPORTS
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          Production analytics and exports
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div
          style={{
            background: 'var(--dark2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              opacity: 0.3,
            }}
          >
            📈
          </div>
          <div
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              color: 'var(--text2)',
              marginBottom: 8,
            }}
          >
            COMING SOON
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            Production reports, timesheet analytics, and job costing summaries will be available here.
            In the meantime, use the <strong style={{ color: 'var(--accent)' }}>Time Logging</strong> page
            to export timesheet CSVs.
          </div>
        </div>
      </div>
    </div>
  )
}
