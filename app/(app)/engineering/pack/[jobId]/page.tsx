'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { generateTEBSDocx, downloadTEBSBlob, hasTEBSData, type TEBSInput } from '@/lib/tebs'

// ── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string
  num: string
  type: string
  customer: string
  make: string
  dims: string
  vin: string
  stage: string
  createdAt: string
}

interface QuoteConfig {
  chassisMake?: string
  chassisModel?: string
  chassisVariant?: string
  axleCount?: number
  axleMake?: string
  axleType?: string
  bodyLength?: string
  bodyHeight?: string
  material?: string
  [key: string]: unknown
}

interface Quote {
  id: string
  buildType: string
  configuration: QuoteConfig | null
}

interface WorkOrderPart {
  id: string
  partName: string
  material: string
  thickness: string
  hasFlatPattern: boolean
  quantity: number
  dxfFileId: string
  pdfFileId: string
}

interface WorkOrder {
  id: string
  status: string
  kitName: string
  dxfFolderId: string
  pdfFolderId: string
  parts: WorkOrderPart[]
  approvedAt: string | null
  approvedBy: string
}

interface JobDrawing {
  id: string
  fileName: string
  driveFileId: string
  type: string   // assembly | step
  category: string
  thumbnailUrl: string
  mimeType: string
}

interface BomItem {
  code: string
  name: string
  category: string
  quantity: number
}

interface VassBooking {
  id: string
  status: string
  jobNumber: string
  vehicleMake: string
  vehicleModel: string
}

interface VinPlateData {
  vin?: string
  make?: string
  model?: string
  engineNumber?: string
  gvm?: string
  gcm?: string
  frontAxleRating?: string
  rearAxleRating?: string
  seats?: string
  tareWeight?: string
  complianceDate?: string
  engineType?: string
}

interface DriveVinFile {
  id: string
  name: string
  thumbnailLink?: string
}

type PackItemStatus = 'ready' | 'warning' | 'missing' | 'generating' | 'not-applicable'

interface PackItem {
  key: string
  label: string
  icon: string
  status: PackItemStatus
  detail?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EngineeringPackPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const { jobId } = params

  const [job, setJob] = useState<Job | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [boms, setBoms] = useState<BomItem[]>([])
  const [drawings, setDrawings] = useState<JobDrawing[]>([])
  const [vass, setVass] = useState<VassBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tebsLoading, setTebsLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingDrawings, setGeneratingDrawings] = useState(false)
  const [approving, setApproving] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchResults, setDispatchResults] = useState<Array<{ target: string; status: string; detail: string }>>([])
  const [dispatchMsg, setDispatchMsg] = useState('')
  const [vinData, setVinData] = useState<VinPlateData | null>(null)
  const [vinLoading, setVinLoading] = useState(false)
  const [vinDriveFiles, setVinDriveFiles] = useState<DriveVinFile[]>([])
  const [vinDragOver, setVinDragOver] = useState(false)
  const [vinError, setVinError] = useState('')
  const [vinSaving, setVinSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      // Fetch job
      const jobRes = await fetch(`/api/jobs/${jobId}`)
      if (!jobRes.ok) { setLoading(false); return }
      const jobData = await jobRes.json()
      setJob(jobData)

      // Fetch quote
      const qRes = await fetch(`/api/quotes?jobId=${jobId}`)
      if (qRes.ok) {
        const quotes = await qRes.json()
        if (quotes.length > 0) {
          const fullRes = await fetch(`/api/quotes/${quotes[0].id}`)
          if (fullRes.ok) setQuote(await fullRes.json())
        }
      }

      // Fetch work order
      const woRes = await fetch(`/api/work-orders?jobId=${jobId}`)
      if (woRes.ok) {
        const orders = await woRes.json()
        if (Array.isArray(orders) && orders.length > 0) setWorkOrder(orders[0])
      }

      // Fetch drawings
      const drawRes = await fetch(`/api/jobs/${jobId}/drawings`)
      if (drawRes.ok) {
        const drawData = await drawRes.json()
        if (Array.isArray(drawData)) setDrawings(drawData)
      }

      // Fetch BOMs
      const bomRes = await fetch(`/api/jobs/${jobId}/boms`)
      if (bomRes.ok) {
        const bomData = await bomRes.json()
        setBoms(Array.isArray(bomData) ? bomData : bomData.items || [])
      }

      // Fetch dispatch logs
      const dlRes = await fetch(`/api/jobs/${jobId}/dispatch-log`)
      if (dlRes.ok) {
        const dlData = await dlRes.json()
        if (Array.isArray(dlData) && dlData.length > 0) setDispatchResults(dlData)
      }

      // Fetch VASS booking
      const vassRes = await fetch(`/api/vass/bookings?q=${encodeURIComponent(jobData.num)}`)
      if (vassRes.ok) {
        const vassData = await vassRes.json()
        if (Array.isArray(vassData) && vassData.length > 0) setVass(vassData[0])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [jobId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Derived state ──────────────────────────────────────────────────────────

  const cfg = quote?.configuration || {} as QuoteConfig
  const buildType = (quote?.buildType || job?.type || '').toLowerCase()
  const isTrailer = buildType.includes('trailer') || buildType.includes('dog') || buildType.includes('semi') || buildType.includes('lead')

  const assemblyDrawings = drawings.filter(d => d.type !== 'step' && d.category !== 'tube-laser')
  const stepFiles = drawings.filter(d => d.type === 'step')
  const tubeLaserPdfs = drawings.filter(d => d.type !== 'step' && d.category === 'tube-laser')

  const tebsInput: TEBSInput | null = isTrailer && cfg.axleCount && cfg.axleMake && cfg.axleType
    ? { axleCount: cfg.axleCount, axleMake: cfg.axleMake, axleType: cfg.axleType, vin: job?.vin || (cfg.vin as string) || '', jobNumber: job?.num || '' }
    : null
  const hasTEBS = tebsInput && hasTEBSData(tebsInput)

  // Build pack item statuses
  const packItems: PackItem[] = [
    {
      key: 'vin-plate',
      label: 'VIN Plate',
      icon: '🪪',
      status: vinData ? 'ready' : (job?.vin ? 'ready' : 'warning'),
      detail: vinData ? `VIN: ${vinData.vin || 'extracted'} — ${vinData.make || ''} ${vinData.model || ''}` : (job?.vin ? `VIN: ${job.vin}` : 'Drop photo or search Drive'),
    },
    {
      key: 'work-order',
      label: 'Cold Form Work Order',
      icon: '🔩',
      status: workOrder ? (workOrder.status === 'approved' ? 'ready' : 'warning') : 'missing',
      detail: workOrder ? `${workOrder.parts.length} parts — ${workOrder.status}` : 'Not generated',
    },
    {
      key: 'tebs',
      label: 'TEBS Document',
      icon: '📄',
      status: !isTrailer ? 'not-applicable' : hasTEBS ? 'ready' : 'missing',
      detail: !isTrailer ? 'Trucks only — N/A' : hasTEBS ? 'Ready to generate' : 'Missing axle config',
    },
    {
      key: 'vass',
      label: 'VASS / CVC Form',
      icon: '🔧',
      status: isTrailer ? 'not-applicable' : vass ? (vass.status === 'draft' ? 'warning' : 'ready') : 'missing',
      detail: isTrailer ? 'Trailers — N/A' : vass ? `${vass.status} — ${vass.vehicleMake} ${vass.vehicleModel}` : 'Not created',
    },
    {
      key: 'axle-order',
      label: 'Axle / Suspension Order',
      icon: '🛞',
      status: !isTrailer ? 'not-applicable' : cfg.axleMake ? 'warning' : 'missing',
      detail: !isTrailer ? 'Trailers only — N/A' : cfg.axleMake ? `${cfg.axleCount}x ${cfg.axleMake} ${cfg.axleType} — draft` : 'Missing axle config',
    },
    {
      key: 'drawings',
      label: 'Workshop Drawings',
      icon: '📐',
      status: assemblyDrawings.length > 0 ? 'ready' : 'missing',
      detail: assemblyDrawings.length > 0 ? `${assemblyDrawings.length} drawing${assemblyDrawings.length !== 1 ? 's' : ''} found` : 'No drawings generated yet',
    },
    {
      key: 'tube-laser',
      label: 'Tube Laser Files',
      icon: '🔬',
      status: stepFiles.length > 0 ? 'ready' : 'missing',
      detail: stepFiles.length > 0 ? `${stepFiles.length} STEP + ${tubeLaserPdfs.length} PDF` : 'No STEP files found',
    },
  ]

  const readyCount = packItems.filter(i => i.status === 'ready').length
  const applicableCount = packItems.filter(i => i.status !== 'not-applicable').length
  const hasCriticalMissing = packItems.some(i => i.status === 'missing' && i.key === 'work-order')

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleGenerateWorkOrder = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/work-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      if (res.ok) {
        const wo = await res.json()
        setWorkOrder(wo)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to generate work order')
      }
    } catch {
      alert('Failed to generate work order')
    }
    setGenerating(false)
  }

  const handleGenerateDrawings = async () => {
    setGeneratingDrawings(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/drawings/generate`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setDrawings(data)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to scan for drawings')
      }
    } catch {
      alert('Failed to scan for drawings')
    }
    setGeneratingDrawings(false)
  }

  const handleApproveWorkOrder = async () => {
    if (!workOrder) return
    setApproving(true)
    try {
      await fetch(`/api/work-orders/${workOrder.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Engineering' }),
      })
      await fetchAll()
    } catch { /* ignore */ }
    setApproving(false)
  }

  const handleTEBS = async () => {
    if (!tebsInput) return
    setTebsLoading(true)
    try {
      const blob = await generateTEBSDocx(tebsInput)
      if (blob) downloadTEBSBlob(blob, job?.num)
    } catch { /* ignore */ }
    setTebsLoading(false)
  }

  const handleDispatch = async () => {
    if (!job) return
    setDispatching(true)
    setDispatchMsg('Dispatching...')
    try {
      const res = await fetch(`/api/jobs/${job.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Engineering' }),
      })
      if (res.ok) {
        const data = await res.json()
        setDispatchResults(data.results || [])
        setDispatchMsg('Pack dispatched')
      } else {
        setDispatchMsg('Failed to dispatch')
      }
    } catch {
      setDispatchMsg('Failed to dispatch')
    }
    setDispatching(false)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const statusIcon = (s: PackItemStatus) => {
    switch (s) {
      case 'ready': return '✅'
      case 'warning': return '⚠️'
      case 'missing': return '❌'
      case 'generating': return '⏳'
      case 'not-applicable': return '—'
    }
  }

  const statusColor = (s: PackItemStatus) => {
    switch (s) {
      case 'ready': return '#22c55e'
      case 'warning': return '#eab308'
      case 'missing': return '#ef4444'
      case 'generating': return '#3b82f6'
      case 'not-applicable': return 'rgba(255,255,255,0.2)'
    }
  }

  // ── VIN Plate Handlers ────────────────────────────────────────────────────

  const handleVinFile = async (file: File) => {
    setVinLoading(true)
    setVinError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/ocr/vin-plate', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        setVinError(err.error || 'Failed to read VIN plate')
        return
      }
      const { data } = await res.json()
      setVinData(data)
    } catch {
      setVinError('Failed to process image')
    }
    setVinLoading(false)
  }

  const handleVinDriveFile = async (fileId: string) => {
    setVinLoading(true)
    setVinError('')
    try {
      // Download from drive and send to OCR
      const driveRes = await fetch(`/api/drive-files/${fileId}`)
      if (!driveRes.ok) { setVinError('Failed to download from Drive'); setVinLoading(false); return }
      const blob = await driveRes.blob()
      const file = new File([blob], 'vin-plate.jpg', { type: blob.type || 'image/jpeg' })
      await handleVinFile(file)
    } catch {
      setVinError('Failed to process Drive file')
      setVinLoading(false)
    }
  }

  const searchDriveForVin = async () => {
    if (!job) return
    try {
      const res = await fetch(`/api/jobs/${job.id}/drive-vin-files`)
      if (res.ok) {
        const files = await res.json()
        setVinDriveFiles(Array.isArray(files) ? files : [])
      }
    } catch { /* ignore */ }
  }

  const saveVinToJob = async () => {
    if (!vinData || !job) return
    setVinSaving(true)
    try {
      // Update job with VIN
      if (vinData.vin) {
        await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: vinData.vin, make: `${vinData.make || ''} ${vinData.model || ''}`.trim() || undefined }),
        })
      }
      // Update quote config with extracted specs
      if (quote) {
        const updates: Record<string, string> = {}
        if (vinData.vin) updates.vin = vinData.vin
        if (vinData.gvm) updates.gvm = vinData.gvm
        if (vinData.gcm) updates.gcm = vinData.gcm
        if (vinData.make) updates.chassisMake = vinData.make
        if (vinData.model) updates.chassisModel = vinData.model
        if (Object.keys(updates).length > 0) {
          await fetch(`/api/quotes/${quote.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configuration: { ...cfg, ...updates } }),
          })
        }
      }
      await fetchAll()
    } catch { /* ignore */ }
    setVinSaving(false)
  }

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text3)', fontFamily: "'League Spartan', sans-serif" }}>
      Loading engineering pack...
    </div>
  )

  if (!job) return (
    <div style={{ padding: 40, fontFamily: "'League Spartan', sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Job Not Found</div>
      <button
        onClick={() => router.push('/engineering')}
        style={{ fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)' }}
      >
        ← Back to Engineering
      </button>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '3px solid #E8681A' }}>
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff' }}>
            Engineering Pack — {job.num}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>
            {job.customer}{job.make ? ` — ${job.make}` : ''}{job.type ? ` — ${job.type}` : ''}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {job.dims || ''}{cfg.chassisVariant ? ` — Variant: ${cfg.chassisVariant}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)' }}>
            {readyCount}/{applicableCount} ready
          </span>
          <button
            onClick={() => router.push('/engineering')}
            style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
              padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)',
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => window.open(`/jsheet/${job.id}?edit=true`, '_blank')}
          style={actionBtn('#E8681A')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,104,26,0.12)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          Edit Job Sheet
        </button>
        <button
          onClick={() => window.open(`/jsheet/${job.id}`, '_blank')}
          style={actionBtn('rgba(255,255,255,0.5)')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          View Job Sheet
        </button>
        {quote && (
          <button
            onClick={() => window.open(`/qsheet/${quote.id}`, '_blank')}
            style={actionBtn('rgba(255,255,255,0.5)')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            View Quote
          </button>
        )}
      </div>

      {/* Pack Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {packItems.map((item) => (
          <div key={item.key}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === item.key ? null : item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: expanded === item.key ? '8px 8px 0 0' : 8,
                cursor: 'pointer', transition: 'border-color 0.15s',
                borderLeft: `3px solid ${statusColor(item.status)}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = statusColor(item.status) }}
            >
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.5 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.detail}</div>
              </div>
              <span style={{ fontSize: 14 }}>{statusIcon(item.status)}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', transform: expanded === item.key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▼</span>
            </div>

            {/* Expanded Detail */}
            {expanded === item.key && (
              <div style={{
                padding: '16px 20px', background: 'rgba(17,17,17,0.8)',
                border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px',
              }}>
                {renderExpandedSection(item.key)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dispatch Results */}
      {dispatchResults.length > 0 && (
        <div style={{
          marginTop: 24, padding: '16px 20px', background: 'var(--dark2)',
          border: '1px solid var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.5 }}>
            Dispatch Results
          </div>
          {dispatchResults.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 12 }}>
              <span>{r.status === 'sent' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌'}</span>
              <span style={{ fontWeight: 600, color: '#fff', minWidth: 120 }}>{r.target}</span>
              <span style={{ color: 'var(--text3)' }}>{r.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Bar — Approve & Dispatch */}
      {dispatchResults.length === 0 && (
        <div style={{
          marginTop: 24, padding: '16px 20px', background: 'var(--dark2)',
          border: '1px solid var(--border)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {hasCriticalMissing
              ? 'Critical items missing — generate work order before dispatching.'
              : `${readyCount}/${applicableCount} pack items ready.`}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {dispatchMsg && (
              <span style={{ fontSize: 12, fontWeight: 600, color: dispatchMsg.includes('Failed') ? '#ef4444' : '#22c55e' }}>
                {dispatchMsg}
              </span>
            )}
            <button
              onClick={handleDispatch}
              disabled={hasCriticalMissing || dispatching}
              style={{
                fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800,
                letterSpacing: 1, textTransform: 'uppercase',
                padding: '10px 24px', borderRadius: 6,
                cursor: hasCriticalMissing || dispatching ? 'not-allowed' : 'pointer',
                border: 'none',
                background: hasCriticalMissing || dispatching ? 'rgba(34,197,94,0.2)' : '#22c55e',
                color: '#fff', opacity: hasCriticalMissing || dispatching ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {dispatching ? 'Dispatching...' : '✓ Approve & Send All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Expanded sections ──────────────────────────────────────────────────────

  function renderExpandedSection(key: string) {
    switch (key) {
      case 'vin-plate': return renderVinPlate()
      case 'work-order': return renderWorkOrder()
case 'tebs': return renderTEBS()
      case 'vass': return renderVASS()
      case 'axle-order': return renderAxleOrder()
      case 'drawings': return renderDrawings()
      case 'tube-laser': return renderTubeLaser()
      default: return null
    }
  }

  function renderVinPlate() {
    return (
      <div>
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setVinDragOver(true) }}
          onDragLeave={() => setVinDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setVinDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file && file.type.startsWith('image/')) handleVinFile(file)
            else setVinError('Please drop an image file (JPG, PNG)')
          }}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e: any) => {
              const file = e.target?.files?.[0]
              if (file) handleVinFile(file)
            }
            input.click()
          }}
          style={{
            border: `2px dashed ${vinDragOver ? '#E8681A' : 'var(--border)'}`,
            borderRadius: 8, padding: '24px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            background: vinDragOver ? 'rgba(232,104,26,0.08)' : 'rgba(0,0,0,0.2)',
            marginBottom: 12,
          }}
        >
          {vinLoading ? (
            <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>
              Reading VIN plate... (this takes a few seconds)
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                Drop VIN plate photo here or click to upload
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                JPG, PNG — photo of the compliance / VIN plate on the chassis
              </div>
            </>
          )}
        </div>

        {/* Drive Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button
            onClick={searchDriveForVin}
            style={actionBtn('rgba(255,255,255,0.5)')}
          >
            Search Drive for VIN Photos
          </button>
          {vinDriveFiles.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {vinDriveFiles.length} file{vinDriveFiles.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Drive VIN files */}
        {vinDriveFiles.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            {vinDriveFiles.map((f) => (
              <div
                key={f.id}
                onClick={() => handleVinDriveFile(f.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {f.thumbnailLink ? (
                  <img src={f.thumbnailLink} alt={f.name} style={{ width: 120, height: 80, objectFit: 'contain', borderRadius: 3, marginBottom: 4 }} />
                ) : (
                  <div style={{ width: 120, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark2)', borderRadius: 3, marginBottom: 4, fontSize: 24 }}>📷</div>
                )}
                <div style={{ fontSize: 10, color: '#fff', textAlign: 'center', wordBreak: 'break-word' }}>{f.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {vinError && (
          <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
            {vinError}
          </div>
        )}

        {/* Extracted Data */}
        {vinData && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              padding: '8px 12px', background: '#E8681A', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Extracted VIN Plate Data</span>
              <button
                onClick={saveVinToJob}
                disabled={vinSaving}
                style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.6)', background: 'transparent', color: '#fff',
                  cursor: vinSaving ? 'not-allowed' : 'pointer', opacity: vinSaving ? 0.5 : 1,
                }}
              >
                {vinSaving ? 'Saving...' : 'Save to Job & Quote'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
              {[
                { label: 'VIN', value: vinData.vin },
                { label: 'Make', value: vinData.make },
                { label: 'Model', value: vinData.model },
                { label: 'GVM (kg)', value: vinData.gvm },
                { label: 'GCM (kg)', value: vinData.gcm },
                { label: 'Front Axle Rating', value: vinData.frontAxleRating },
                { label: 'Rear Axle Rating', value: vinData.rearAxleRating },
                { label: 'Seats', value: vinData.seats },
                { label: 'Tare Weight (kg)', value: vinData.tareWeight },
                { label: 'Engine Type', value: vinData.engineType },
                { label: 'Engine Number', value: vinData.engineNumber },
                { label: 'Compliance Date', value: vinData.complianceDate },
              ].filter(f => f.value).map((f) => (
                <div key={f.label} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderWorkOrder() {
    if (!workOrder) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', flex: 1 }}>
            No work order generated yet. Click to scan Drive for kit files and generate the parts list.
          </div>
          <button
            onClick={handleGenerateWorkOrder}
            disabled={generating}
            style={{ ...actionBtn('#3b82f6'), opacity: generating ? 0.5 : 1 }}
          >
            {generating ? 'Generating...' : '🔩 Generate Work Order'}
          </button>
        </div>
      )
    }

    // Group parts by material
    const groups: Record<string, WorkOrderPart[]> = {}
    for (const part of workOrder.parts) {
      if (!groups[part.material]) groups[part.material] = []
      groups[part.material].push(part)
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {workOrder.parts.length} parts — {Object.keys(groups).length} material groups — Status: <strong style={{ color: statusColor(workOrder.status === 'approved' ? 'ready' : 'warning') }}>{workOrder.status}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push(`/engineering/work-orders/${job!.id}`)} style={actionBtn('rgba(255,255,255,0.5)')}>
              Full View
            </button>
            {workOrder.dxfFolderId && (
              <a href={`https://drive.google.com/drive/folders/${workOrder.dxfFolderId}`} target="_blank" rel="noopener noreferrer" style={{ ...actionBtn('rgba(255,255,255,0.5)'), textDecoration: 'none' }}>
                DXF Folder
              </a>
            )}
            {workOrder.status === 'draft' && (
              <button onClick={handleApproveWorkOrder} disabled={approving} style={{ ...actionBtn('#22c55e'), opacity: approving ? 0.5 : 1 }}>
                {approving ? 'Approving...' : '✓ Approve for Cold Form'}
              </button>
            )}
          </div>
        </div>

        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([material, parts]) => (
          <div key={material} style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
              padding: '4px 10px', background: '#E8681A', color: '#fff', borderRadius: '3px 3px 0 0',
            }}>
              {material} ({parts.length})
            </div>
            {parts.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12,
              }}>
                <span style={{ flex: 1, color: '#fff', fontWeight: 500 }}>{p.partName}</span>
                <span style={{ color: 'var(--text3)', minWidth: 60 }}>{p.thickness || material}</span>
                <span style={{ color: '#fff', fontWeight: 600, minWidth: 30, textAlign: 'center' }}>x{p.quantity}</span>
                <span style={{ color: 'var(--text3)', minWidth: 50, textAlign: 'center' }}>
                  {p.hasFlatPattern ? '☐ Fold' : '—'}
                </span>
                {p.dxfFileId && <a href={`https://drive.google.com/file/d/${p.dxfFileId}/view`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>DXF</a>}
                {p.pdfFileId && <a href={`https://drive.google.com/file/d/${p.pdfFileId}/view`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#E8681A', fontWeight: 700 }}>PDF</a>}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  function renderBOM() {
    if (boms.length === 0) {
      return <div style={{ fontSize: 12, color: 'var(--text3)' }}>No BOM data resolved for this job. Check the quote configuration.</div>
    }

    // Group by category
    const byCategory: Record<string, BomItem[]> = {}
    for (const b of boms) {
      const cat = b.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(b)
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{boms.length} items across {Object.keys(byCategory).length} categories</div>
          <button onClick={() => router.push('/engineering/mrp-ordering')} style={actionBtn('rgba(255,255,255,0.5)')}>
            Open MRP Ordering
          </button>
        </div>

        {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8681A', marginBottom: 4 }}>
              {cat}
            </div>
            {items.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
              }}>
                <span style={{ color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace', minWidth: 100 }}>{b.code}</span>
                <span style={{ flex: 1, color: '#fff' }}>{b.name}</span>
                <span style={{ color: 'var(--text3)', minWidth: 30, textAlign: 'right' }}>x{b.quantity}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  function renderTEBS() {
    if (!isTrailer) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>TEBS documents apply to trailers only.</div>
    if (!hasTEBS) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Missing axle configuration — need axle count, make, and type to generate TEBS.</div>

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
            {cfg.axleCount}x {cfg.axleMake} {cfg.axleType}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            TEBS datasheet ready for download
          </div>
        </div>
        <button
          onClick={handleTEBS}
          disabled={tebsLoading}
          style={{ ...actionBtn('#3b82f6'), opacity: tebsLoading ? 0.5 : 1 }}
        >
          {tebsLoading ? 'Generating...' : '📄 Download TEBS'}
        </button>
      </div>
    )
  }

  function renderVASS() {
    if (vass) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
              VASS booking — {vass.vehicleMake} {vass.vehicleModel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Status: {vass.status}
            </div>
          </div>
          <button onClick={() => router.push(`/engineering/vass-booking?id=${vass!.id}`)} style={actionBtn('rgba(255,255,255,0.5)')}>
            View / Edit
          </button>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)' }}>
          No VASS booking created yet. Create one from the VASS Booking Generator.
        </div>
        <button onClick={() => router.push(`/engineering/vass-booking?jobNum=${job!.num}`)} style={actionBtn('rgba(255,255,255,0.5)')}>
          Create VASS Booking
        </button>
      </div>
    )
  }

  function renderAxleOrder() {
    if (!isTrailer) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Axle orders apply to trailers only.</div>

    if (!cfg.axleMake) return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Missing axle configuration in quote.</div>

    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
          Draft axle order — email dispatch coming in Phase 5.
        </div>
        <div style={{
          padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 4, border: '1px solid var(--border)',
          fontFamily: 'monospace', fontSize: 11, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
{`Subject: Axle Order — ${job!.num} — ${job!.customer}

Axle Configuration:
- ${cfg.axleCount} x ${cfg.axleMake} ${cfg.axleType}
${cfg.suspension ? `- Suspension: ${cfg.suspension}` : ''}
${cfg.studPattern ? `- Stud Pattern: ${cfg.studPattern}` : ''}

Delivery to:
YLZ Truck Bodies
29 Southeast Boulevard
Pakenham, VIC 3810

Required by: ASAP

Regards,
YLZ Truck Bodies
03 5940 7620`}
        </div>
      </div>
    )
  }

  function renderDrawings() {
    if (assemblyDrawings.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)' }}>
            No workshop drawings found. Click to scan Drive kit folders for assembly PDFs.
          </div>
          <button
            onClick={handleGenerateDrawings}
            disabled={generatingDrawings}
            style={{ ...actionBtn('#3b82f6'), opacity: generatingDrawings ? 0.5 : 1 }}
          >
            {generatingDrawings ? 'Scanning...' : '📐 Scan for Drawings'}
          </button>
        </div>
      )
    }

    // Group by category
    const byCategory: Record<string, JobDrawing[]> = {}
    for (const d of assemblyDrawings) {
      const cat = d.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(d)
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {assemblyDrawings.length} assembly drawing{assemblyDrawings.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={handleGenerateDrawings}
            disabled={generatingDrawings}
            style={{ ...actionBtn('rgba(255,255,255,0.5)'), opacity: generatingDrawings ? 0.5 : 1 }}
          >
            {generatingDrawings ? 'Scanning...' : '↻ Re-scan'}
          </button>
        </div>

        {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8681A', marginBottom: 6 }}>
              {cat}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {items.map((d) => (
                <a
                  key={d.id}
                  href={`/api/drive-files/${d.driveFileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                    borderRadius: 6, textDecoration: 'none', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {d.thumbnailUrl ? (
                    <img src={d.thumbnailUrl} alt={d.fileName} style={{ width: 140, height: 100, objectFit: 'contain', borderRadius: 3, background: '#fff', marginBottom: 6 }} />
                  ) : (
                    <div style={{ width: 140, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark2)', borderRadius: 3, marginBottom: 6, fontSize: 28, color: 'var(--text3)' }}>
                      📄
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#fff', fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 }}>
                    {d.fileName.replace(/\.[^.]+$/, '')}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderTubeLaser() {
    if (stepFiles.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)' }}>
            No STEP files found. They will be picked up when drawings are scanned from the CAD folder.
          </div>
          <button
            onClick={handleGenerateDrawings}
            disabled={generatingDrawings}
            style={{ ...actionBtn('#3b82f6'), opacity: generatingDrawings ? 0.5 : 1 }}
          >
            {generatingDrawings ? 'Scanning...' : '📐 Scan Folder'}
          </button>
        </div>
      )
    }

    const allTubeLaser = [...stepFiles, ...tubeLaserPdfs]
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)' }}>
            {stepFiles.length} STEP + {tubeLaserPdfs.length} PDF file{tubeLaserPdfs.length !== 1 ? 's' : ''} for tube laser cutting
          </div>
          <button
            onClick={handleGenerateDrawings}
            disabled={generatingDrawings}
            style={{ ...actionBtn('#3b82f6'), opacity: generatingDrawings ? 0.5 : 1 }}
          >
            {generatingDrawings ? 'Scanning...' : '📐 Scan Folder'}
          </button>
        </div>
        {allTubeLaser.map((f: any) => (
          <div key={f.id || f.driveFileId} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12,
          }}>
            <span style={{ fontSize: 16 }}>{f.type === 'step' ? '📦' : '📄'}</span>
            <span style={{ flex: 1, color: '#fff', fontWeight: 500 }}>{f.fileName}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const }}>
              {f.type === 'step' ? 'STEP' : 'PDF'}
            </span>
            <a
              href={`https://drive.google.com/file/d/${f.driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', padding: '3px 8px', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 3, textDecoration: 'none' }}
            >
              View
            </a>
          </div>
        ))}
      </div>
    )
  }

  function renderPlaceholder(msg: string) {
    return <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{msg}</div>
  }
}

// ── Shared button style ──────────────────────────────────────────────────────

function actionBtn(color: string): React.CSSProperties {
  return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
    border: `1px solid ${color}`, background: 'transparent', color,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  }
}
