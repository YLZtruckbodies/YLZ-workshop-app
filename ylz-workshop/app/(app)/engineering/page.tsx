'use client'

import { useRouter } from 'next/navigation'

export default function EngineeringPage() {
  const router = useRouter()

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Engineering
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Track engineering specs, drawings, and build requirements.
        </div>
      </div>

      {/* Tool Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Job Sheet Generator', icon: '📋', desc: 'Generate job sheets from accepted quotes', href: '/engineering/job-sheets' },
          { label: 'Manual Job Sheet Generator', icon: '🛠️', desc: 'Drag & drop builder — fill in fields manually and export', href: '/job-sheet-creator.html', external: true },
          { label: 'VIN Plate / EBS File / Axle Suspension Ordering', icon: '🏷️', desc: 'VIN plates, EBS files & suspension orders', href: '/engineering/vin-plates' },
          { label: 'MRP Ordering', icon: '📦', desc: 'Auto BOM resolver — select a job, get the full MRPeasy BOM list', href: '/engineering/mrp-ordering' },
          { label: 'Xero Quote Import', icon: '📥', desc: 'Drop Xero quotes CSV → parse specs → get BOMs → import to app', href: '/engineering/xero-import' },
          { label: 'VASS Booking Generator', icon: '🔧', desc: 'CVC eVASS booking requests \u2014 populate from quotes or fill manually', href: '/engineering/vass-booking' },
          { label: 'Drawings', icon: '📐', desc: 'Engineering drawings & revisions', href: '' },
        ].map((tool) => (
          <button
            key={tool.label}
            onClick={() => {
              if (!tool.href) return
              if ((tool as any).external) window.open(tool.href, '_blank')
              else router.push(tool.href)
            }}
            style={{
              background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '20px 16px', cursor: tool.href ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              transition: 'all 0.2s', opacity: tool.href ? 1 : 0.5,
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (tool.href) {
                e.currentTarget.style.borderColor = '#E8681A'
                e.currentTarget.style.background = 'rgba(232,104,26,0.06)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--dark2)'
            }}
          >
            <div style={{ fontSize: 28 }}>{tool.icon}</div>
            <div style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              color: '#fff', lineHeight: 1.3,
            }}>
              {tool.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
              {tool.desc}
              {!tool.href && <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Coming Soon</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}  
