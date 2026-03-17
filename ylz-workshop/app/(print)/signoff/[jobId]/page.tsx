'use client'

import { useEffect, useRef, useState } from 'react'
import { createSignoff } from '@/lib/hooks'

export default function SignoffPage({ params }: { params: { jobId: string } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [hasSignature, setHasSignature] = useState(false)
  const [signedBy, setSignedBy] = useState('')
  const [signerRole, setSignerRole] = useState<'customer' | 'driver'>('customer')
  const [driverName, setDriverName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [job, setJob] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/jobs/${params.jobId}`)
      .then((r) => r.json())
      .then((d) => setJob(d))
      .catch(() => {})
  }, [params.jobId])

  // Canvas drawing helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    setIsDrawing(true)
    setLastPos(getPos(e, canvas))
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setLastPos(pos)
    setHasSignature(true)
  }

  function stopDraw() {
    setIsDrawing(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSubmit() {
    if (!hasSignature || !signedBy.trim()) return
    const canvas = canvasRef.current
    if (!canvas) return

    setSubmitting(true)
    try {
      const signatureDataUrl = canvas.toDataURL('image/png')
      // Store in localStorage as a backup
      try { localStorage.setItem('ylz-signoff-backup', JSON.stringify({ signatureDataUrl, signedBy, signerRole, driverName, notes, jobId: params.jobId })) } catch {}

      await createSignoff({
        jobId: params.jobId,
        signedBy: signedBy.trim(),
        signerRole,
        signatureDataUrl,
        driverName: driverName.trim(),
        notes: notes.trim(),
      })

      try { localStorage.removeItem('ylz-signoff-backup') } catch {}
      setDone(true)
    } catch (err) {
      alert('Failed to submit — please try again. Your signature has been saved locally.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
          <h1 style={{ color: '#22d07a', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>Signed Off</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, margin: 0 }}>
            Delivery confirmed for <strong style={{ color: '#fff' }}>{job?.num || params.jobId}</strong>.<br />
            Thank you, {signedBy}.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 24 }}>
            {new Date().toLocaleString('en-AU')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px 20px', boxSizing: 'border-box', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <img src="/images/ylz-logo.webp" alt="YLZ" style={{ height: 40, objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8681A', letterSpacing: 0.5 }}>DELIVERY SIGN-OFF</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {job ? `${job.num} — ${job.customer}` : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Signer details */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Full Name *</label>
        <input
          value={signedBy}
          onChange={(e) => setSignedBy(e.target.value)}
          placeholder="Print your full name"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>I am the</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['customer', 'driver'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setSignerRole(role)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 6, cursor: 'pointer',
                border: `2px solid ${signerRole === role ? '#E8681A' : 'rgba(255,255,255,0.15)'}`,
                background: signerRole === role ? 'rgba(232,104,26,0.15)' : 'transparent',
                color: signerRole === role ? '#E8681A' : 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 700, textTransform: 'capitalize' as const, transition: '0.1s',
                minHeight: 48,
              }}
            >
              {role === 'customer' ? '🏢 Customer' : '🚛 Driver'}
            </button>
          ))}
        </div>
      </div>

      {signerRole === 'driver' && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Driver Name</label>
          <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver's name" style={inputStyle} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any delivery notes or conditions..."
          rows={2}
          style={{ ...inputStyle, resize: 'none' as const }}
        />
      </div>

      {/* Signature pad */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={labelStyle}>Signature *</label>
          {hasSignature && (
            <button onClick={clearCanvas} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, overflow: 'hidden', background: '#111', position: 'relative' }}>
          {!hasSignature && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', fontSize: 13, pointerEvents: 'none',
            }}>
              Sign here
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            style={{ display: 'block', width: '100%', height: 160, touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !hasSignature || !signedBy.trim()}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
          background: hasSignature && signedBy.trim() ? '#E8681A' : 'rgba(255,255,255,0.1)',
          color: hasSignature && signedBy.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: 15, fontWeight: 700, letterSpacing: 0.5, transition: '0.15s',
          minHeight: 56,
        }}
      >
        {submitting ? 'Submitting...' : 'Sign & Confirm Delivery'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
        By signing you confirm receipt of the described goods in the stated condition.
      </p>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box', minHeight: 48,
}
