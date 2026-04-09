'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VASS_CODES, YLZ_DEFAULTS, getNextWednesday } from '@/lib/vassData'

type VassCode = { code: string; description: string }
type Chassis = { id: string; make: string; model: string; seatingCapacity: string; gvm: string; gcm: string; frontAxleRating: string; rearAxleRating: string }
type Booking = Record<string, any>
type Quote = Record<string, any>

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

const inputStyle: React.CSSProperties = {
  background: 'var(--dark3, #1a1a2e)', border: '1px solid var(--border, #333)', borderRadius: 6,
  padding: '8px 10px', color: '#fff', fontSize: 13, width: '100%', outline: 'none',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text3, #888)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 4 }
const sectionStyle: React.CSSProperties = { background: 'var(--dark2, #141425)', border: '1px solid var(--border, #333)', borderRadius: 10, padding: 20, marginBottom: 16 }
const sectionTitle: React.CSSProperties = { fontFamily: "'League Spartan', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: '#E8681A', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border, #333)' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function VassBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const fromQuote = searchParams.get('quoteId')
  const fromJobNum = searchParams.get('jobNum')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(editId)
  const [chassisDb, setChassisDb] = useState<Chassis[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<Chassis[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuote, setSelectedQuote] = useState<string>(fromQuote || '')
  const [selectedCodes, setSelectedCodes] = useState<VassCode[]>([])
  const [showCodePicker, setShowCodePicker] = useState(false)
  const [codeFilter, setCodeFilter] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showList, setShowList] = useState(!editId && !fromQuote && !fromJobNum)
  const [addChassisMode, setAddChassisMode] = useState(false)
  const [newChassis, setNewChassis] = useState<Partial<Chassis>>({})

  // Form state
  const [form, setForm] = useState<Record<string, string>>({
    jobNumber: '',
    bookingDate: new Date().toISOString().split('T')[0],
    requestedBy: YLZ_DEFAULTS.requestedBy,
    companyAddress: YLZ_DEFAULTS.companyAddress,
    companyState: YLZ_DEFAULTS.companyState,
    companyPostcode: YLZ_DEFAULTS.companyPostcode,
    companyEmail: YLZ_DEFAULTS.companyEmail,
    companyPhone: YLZ_DEFAULTS.companyPhone,
    poNumber: '',
    finishDate: getNextWednesday(),
    ownerName: '',
    ownerAddress: '',
    ownerCity: '',
    ownerState: 'VIC',
    ownerPostcode: '',
    vehicleMake: '',
    vehicleModel: '',
    engineType: '',
    engineNumber: '',
    rego: '',
    compPlateDate: '',
    odometer: '',
    seats: '',
    gvm: '',
    gcm: '',
    frontAxleRating: '',
    rearAxleRating: '',
    vinNumber: '',
    frontTyreCount: '',
    rearTyreCount: '',
    frontTyreSize: '',
    rearTyreSize: '',
    extremeAxleSpacing: '',
    modDescription: '',
    newTareWeight: '',
    notes: '',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  // Load chassis database
  useEffect(() => {
    fetch('/api/vass/chassis').then(r => r.json()).then((data: Chassis[]) => {
      setChassisDb(data)
      const uniqueMakes = [...new Set(data.map(c => c.make))].sort()
      setMakes(uniqueMakes)
    }).catch(() => {})
  }, [])

  // Load accepted quotes for population
  useEffect(() => {
    fetch('/api/quotes?status=accepted').then(r => r.json()).then((data: Quote[]) => {
      if (Array.isArray(data)) setQuotes(data)
    }).catch(() => {})
    fetch('/api/quotes?status=sent').then(r => r.json()).then((data: Quote[]) => {
      if (Array.isArray(data)) setQuotes(prev => [...prev, ...data])
    }).catch(() => {})
  }, [])

  // Load bookings list
  useEffect(() => {
    fetch('/api/vass/bookings').then(r => r.json()).then((data: Booking[]) => {
      if (Array.isArray(data)) setBookings(data)
    }).catch(() => {})
  }, [])

  // Load existing booking if editing
  useEffect(() => {
    if (!editId) return
    fetch(`/api/vass/bookings/${editId}`).then(r => r.json()).then((b: Booking) => {
      if (b.id) {
        const f: Record<string, string> = {}
        Object.keys(form).forEach(k => { f[k] = b[k] || form[k] || '' })
        setForm(f)
        setSelectedCodes(Array.isArray(b.vassCodes) ? b.vassCodes : [])
        setBookingId(b.id)
        setShowList(false)
      }
    }).catch(() => {})
  }, [editId])

  // Populate from quote
  const populateFromQuote = useCallback((quoteId: string) => {
    if (!quoteId) return
    fetch(`/api/quotes/${quoteId}`).then(r => r.json()).then(async (q: Quote) => {
      if (!q.id) return
      const cfg = q.configuration || {}

      // Find linked job number
      let jobNum = ''
      if (q.jobId) {
        try {
          const jr = await fetch(`/api/jobs/${q.jobId}`)
          if (jr.ok) {
            const jd = await jr.json()
            jobNum = jd.num || ''
          }
        } catch { /* ignore */ }
      }

      const make = cfg.chassisMake || ''
      const model = cfg.chassisModel || ''

      setForm(f => ({
        ...f,
        ownerName: q.customerName || f.ownerName,
        jobNumber: jobNum || f.jobNumber,
        poNumber: q.quoteNumber || f.poNumber,
        vehicleMake: make || f.vehicleMake,
        vehicleModel: model || f.vehicleModel,
        vinNumber: cfg.vin || cfg.truckVin || f.vinNumber,
        gvm: cfg.gvm || cfg.truckGvm || f.gvm,
        gcm: cfg.gcm || cfg.trailerGcm || f.gcm,
        modDescription: `Body build — ${cfg.bodyLength || ''}mm ${cfg.material || cfg.truckMaterial || ''} ${cfg.bodyHeight || cfg.truckBodyHeight || ''}mm walls`.replace(/\s+/g, ' ').trim(),
      }))

      // Trigger chassis DB lookup for make/model specs
      if (make && model && chassisDb.length > 0) {
        const chassis = chassisDb.find(c => c.make === make && c.model === model)
        if (chassis) {
          setForm(f => ({
            ...f,
            seats: chassis.seatingCapacity || f.seats,
            gvm: f.gvm || chassis.gvm || '',
            gcm: f.gcm || chassis.gcm || '',
            frontAxleRating: chassis.frontAxleRating || f.frontAxleRating,
            rearAxleRating: chassis.rearAxleRating || f.rearAxleRating,
          }))
        }
      }

      setSelectedQuote(quoteId)
      setShowList(false)
    }).catch(() => {})
  }, [chassisDb])

  // Populate from job number — finds the job, then its quote, then populates
  const populateFromJobNum = useCallback(async (jobNum: string) => {
    try {
      // Search for the job
      const res = await fetch(`/api/search?q=${encodeURIComponent(jobNum)}`)
      if (!res.ok) return
      const data = await res.json()
      const job = (data.jobs || []).find((j: any) => j.num === jobNum || j.num === jobNum.toUpperCase())
      if (!job) { alert(`Job ${jobNum} not found`); return }

      // Find linked quote
      const qRes = await fetch(`/api/quotes?jobId=${job.id}`)
      if (qRes.ok) {
        const quotes = await qRes.json()
        if (quotes.length > 0) {
          populateFromQuote(quotes[0].id)
          return
        }
      }

      // No quote — still fill job-level fields
      setForm(f => ({
        ...f,
        jobNumber: job.num,
        ownerName: job.customer || f.ownerName,
        vehicleMake: job.make?.split(' ')[0] || f.vehicleMake,
        vinNumber: job.vin || f.vinNumber,
      }))
      setShowList(false)
    } catch {
      alert('Failed to load job')
    }
  }, [populateFromQuote])

  // Auto-populate from quote or job number URL param
  useEffect(() => {
    if (fromQuote) populateFromQuote(fromQuote)
    else if (fromJobNum) populateFromJobNum(fromJobNum)
  }, [fromQuote, fromJobNum, populateFromQuote, populateFromJobNum])

  // When make changes, update model list
  useEffect(() => {
    if (form.vehicleMake) {
      const filtered = chassisDb.filter(c => c.make === form.vehicleMake)
      setModels(filtered)
    } else {
      setModels([])
    }
  }, [form.vehicleMake, chassisDb])

  // When model selected, auto-fill chassis specs
  const onModelSelect = (modelStr: string) => {
    set('vehicleModel', modelStr)
    const chassis = chassisDb.find(c => c.make === form.vehicleMake && c.model === modelStr)
    if (chassis) {
      setForm(f => ({
        ...f,
        vehicleModel: modelStr,
        seats: chassis.seatingCapacity || f.seats,
        gvm: chassis.gvm || f.gvm,
        gcm: chassis.gcm || f.gcm,
        frontAxleRating: chassis.frontAxleRating || f.frontAxleRating,
        rearAxleRating: chassis.rearAxleRating || f.rearAxleRating,
      }))
    }
  }

  // Toggle VASS code
  const toggleCode = (vc: VassCode) => {
    setSelectedCodes(prev => {
      const exists = prev.find(c => c.code === vc.code)
      if (exists) return prev.filter(c => c.code !== vc.code)
      return [...prev, vc]
    })
  }

  // Build mod description from selected codes
  useEffect(() => {
    if (selectedCodes.length > 0) {
      const desc = selectedCodes.map(c => `${c.code} - ${c.description}`).join('\n')
      set('modDescription', desc)
    }
  }, [selectedCodes])

  // Save booking
  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, vassCodes: selectedCodes, quoteId: selectedQuote || null }
      let res
      if (bookingId) {
        res = await fetch(`/api/vass/bookings/${bookingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await fetch('/api/vass/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (data.id) {
        setBookingId(data.id)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        // Refresh bookings list
        fetch('/api/vass/bookings').then(r => r.json()).then((d: Booking[]) => {
          if (Array.isArray(d)) setBookings(d)
        }).catch(() => {})
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Save new chassis to database
  const saveNewChassis = async () => {
    try {
      const res = await fetch('/api/vass/chassis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newChassis) })
      const data = await res.json()
      if (data.id) {
        setChassisDb(prev => [...prev, data])
        const uniqueMakes = [...new Set([...chassisDb, data].map(c => c.make))].sort()
        setMakes(uniqueMakes)
        setNewChassis({})
        setAddChassisMode(false)
      }
    } catch (err) {
      console.error('Failed to save chassis:', err)
    }
  }

  const gridTwo: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const gridThree: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }
  const gridFour: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }

  // ── Bookings list view ────────────────────────────────────────────────────
  if (showList) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={() => router.push('/engineering')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 0 }}>
            ← Engineering
          </button>
          <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0, flex: 1 }}>
            VASS Bookings
          </h1>
          <button
            onClick={() => { setBookingId(null); setForm(f => ({ ...f })); setSelectedCodes([]); setShowList(false) }}
            style={{ background: '#E8681A', border: 'none', borderRadius: 6, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}
          >
            + New Booking
          </button>
        </div>

        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            No VASS bookings yet. Click &quot;New Booking&quot; to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => (
              <div
                key={b.id}
                onClick={() => router.push(`/engineering/vass-booking?id=${b.id}`)}
                style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#E8681A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{b.ownerName || 'Unknown Owner'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {b.vehicleMake} {b.vehicleModel} {b.rego ? `· ${b.rego}` : ''} {b.jobNumber ? `· Job ${b.jobNumber}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('en-AU') : ''}</div>
                <div style={{ fontSize: 11, color: '#E8681A', fontWeight: 600 }}>Edit →</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => setShowList(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 0 }}>
          ← Bookings
        </button>
        <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0, flex: 1 }}>
          {bookingId ? 'Edit VASS Booking' : 'New VASS Booking'}
        </h1>
        {bookingId && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>ID: {bookingId}</div>
        )}
      </div>

      {/* Populate from Quote or Job */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={sectionTitle}>Auto-Populate</div>
        <div style={gridTwo}>
          {quotes.length > 0 && (
            <Field label="From Quote">
              <select style={selectStyle} value={selectedQuote} onChange={e => populateFromQuote(e.target.value)}>
                <option value="">— Select a quote —</option>
                {quotes.map(q => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} — {q.customerName || 'Unknown'}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="From Job Number">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="e.g. YLZ1108"
                onKeyDown={async (e) => {
                  if (e.key !== 'Enter') return
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (!val) return
                  await populateFromJobNum(val)
                }}
              />
              <button
                onClick={async () => {
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="e.g. YLZ1108"]')
                  if (input?.value) await populateFromJobNum(input.value.trim())
                }}
                style={{ ...inputStyle, width: 'auto', padding: '8px 14px', cursor: 'pointer', background: '#E8681A', border: '1px solid #E8681A', fontWeight: 700, fontSize: 12 }}
              >
                Load
              </button>
            </div>
          </Field>
        </div>
      </div>

      {/* Booking Details */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Booking Details</div>
        <div style={{ ...gridFour, marginBottom: 12 }}>
          <Field label="Job Number"><input style={inputStyle} value={form.jobNumber} onChange={e => set('jobNumber', e.target.value)} placeholder="e.g. 1042" /></Field>
          <Field label="Booking Date"><input type="date" style={inputStyle} value={form.bookingDate} onChange={e => set('bookingDate', e.target.value)} /></Field>
          <Field label="Finish Date"><input type="date" style={inputStyle} value={form.finishDate} onChange={e => set('finishDate', e.target.value)} /></Field>
          <Field label="PO Number"><input style={inputStyle} value={form.poNumber} onChange={e => set('poNumber', e.target.value)} placeholder="Optional" /></Field>
        </div>
        <div style={gridFour}>
          <Field label="Requested By"><input style={inputStyle} value={form.requestedBy} onChange={e => set('requestedBy', e.target.value)} /></Field>
          <Field label="Company Email"><input style={inputStyle} value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} /></Field>
          <Field label="Company Phone"><input style={inputStyle} value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} /></Field>
          <Field label="Company State">
            <select style={selectStyle} value={form.companyState} onChange={e => set('companyState', e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Owner / Customer */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Owner / Customer</div>
        <div style={{ ...gridThree, marginBottom: 12 }}>
          <Field label="Owner Name"><input style={inputStyle} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Full name or company" /></Field>
          <Field label="Address"><input style={inputStyle} value={form.ownerAddress} onChange={e => set('ownerAddress', e.target.value)} /></Field>
          <Field label="City / Suburb"><input style={inputStyle} value={form.ownerCity} onChange={e => set('ownerCity', e.target.value)} /></Field>
        </div>
        <div style={gridThree}>
          <Field label="State">
            <select style={selectStyle} value={form.ownerState} onChange={e => set('ownerState', e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Postcode"><input style={inputStyle} value={form.ownerPostcode} onChange={e => set('ownerPostcode', e.target.value)} /></Field>
        </div>
      </div>

      {/* Vehicle Details */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={sectionTitle}>Vehicle Details</div>
          <button onClick={() => setAddChassisMode(!addChassisMode)} style={{ background: 'rgba(232,104,26,0.12)', border: '1px solid rgba(232,104,26,0.3)', borderRadius: 5, padding: '5px 12px', color: '#E8681A', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
            {addChassisMode ? 'Cancel' : '+ Add Chassis'}
          </button>
        </div>

        {addChassisMode && (
          <div style={{ background: 'rgba(232,104,26,0.05)', border: '1px solid rgba(232,104,26,0.15)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E8681A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Add New Chassis to Database</div>
            <div style={{ ...gridFour, marginBottom: 10 }}>
              <Field label="Make"><input style={inputStyle} value={newChassis.make || ''} onChange={e => setNewChassis(c => ({ ...c, make: e.target.value }))} /></Field>
              <Field label="Model"><input style={inputStyle} value={newChassis.model || ''} onChange={e => setNewChassis(c => ({ ...c, model: e.target.value }))} /></Field>
              <Field label="GVM (kg)"><input style={inputStyle} value={newChassis.gvm || ''} onChange={e => setNewChassis(c => ({ ...c, gvm: e.target.value }))} /></Field>
              <Field label="GCM (kg)"><input style={inputStyle} value={newChassis.gcm || ''} onChange={e => setNewChassis(c => ({ ...c, gcm: e.target.value }))} /></Field>
            </div>
            <div style={{ ...gridFour, marginBottom: 10 }}>
              <Field label="Front Axle (kg)"><input style={inputStyle} value={newChassis.frontAxleRating || ''} onChange={e => setNewChassis(c => ({ ...c, frontAxleRating: e.target.value }))} /></Field>
              <Field label="Rear Axle (kg)"><input style={inputStyle} value={newChassis.rearAxleRating || ''} onChange={e => setNewChassis(c => ({ ...c, rearAxleRating: e.target.value }))} /></Field>
              <Field label="Seating Capacity"><input style={inputStyle} value={newChassis.seatingCapacity || ''} onChange={e => setNewChassis(c => ({ ...c, seatingCapacity: e.target.value }))} /></Field>
            </div>
            <button onClick={saveNewChassis} style={{ background: '#E8681A', border: 'none', borderRadius: 5, padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Save Chassis
            </button>
          </div>
        )}

        <div style={{ ...gridFour, marginBottom: 12 }}>
          <Field label="Make">
            <select style={selectStyle} value={form.vehicleMake} onChange={e => set('vehicleMake', e.target.value)}>
              <option value="">— Select Make —</option>
              {makes.map(m => <option key={m}>{m}</option>)}
              <option value="__other__">Other (type below)</option>
            </select>
          </Field>
          <Field label="Model">
            {models.length > 0 ? (
              <select style={selectStyle} value={form.vehicleModel} onChange={e => onModelSelect(e.target.value)}>
                <option value="">— Select Model —</option>
                {models.map(m => <option key={m.id} value={m.model}>{m.model}</option>)}
              </select>
            ) : (
              <input style={inputStyle} value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} placeholder="Enter model" />
            )}
          </Field>
          <Field label="Rego"><input style={inputStyle} value={form.rego} onChange={e => set('rego', e.target.value)} /></Field>
          <Field label="VIN Number"><input style={inputStyle} value={form.vinNumber} onChange={e => set('vinNumber', e.target.value)} /></Field>
        </div>
        <div style={{ ...gridFour, marginBottom: 12 }}>
          <Field label="Engine Type"><input style={inputStyle} value={form.engineType} onChange={e => set('engineType', e.target.value)} /></Field>
          <Field label="Engine Number"><input style={inputStyle} value={form.engineNumber} onChange={e => set('engineNumber', e.target.value)} /></Field>
          <Field label="Comp Plate Date"><input type="date" style={inputStyle} value={form.compPlateDate} onChange={e => set('compPlateDate', e.target.value)} /></Field>
          <Field label="Odometer (km)"><input style={inputStyle} value={form.odometer} onChange={e => set('odometer', e.target.value)} /></Field>
        </div>
        <div style={gridFour}>
          <Field label="GVM (kg)"><input style={inputStyle} value={form.gvm} onChange={e => set('gvm', e.target.value)} /></Field>
          <Field label="GCM (kg)"><input style={inputStyle} value={form.gcm} onChange={e => set('gcm', e.target.value)} /></Field>
          <Field label="Front Axle Rating (kg)"><input style={inputStyle} value={form.frontAxleRating} onChange={e => set('frontAxleRating', e.target.value)} /></Field>
          <Field label="Rear Axle Rating (kg)"><input style={inputStyle} value={form.rearAxleRating} onChange={e => set('rearAxleRating', e.target.value)} /></Field>
        </div>
      </div>

      {/* Tyre Details */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Tyre Details</div>
        <div style={gridFour}>
          <Field label="Front Tyre Count"><input style={inputStyle} value={form.frontTyreCount} onChange={e => set('frontTyreCount', e.target.value)} placeholder="e.g. 2" /></Field>
          <Field label="Front Tyre Size"><input style={inputStyle} value={form.frontTyreSize} onChange={e => set('frontTyreSize', e.target.value)} placeholder="e.g. 315/80R22.5" /></Field>
          <Field label="Rear Tyre Count"><input style={inputStyle} value={form.rearTyreCount} onChange={e => set('rearTyreCount', e.target.value)} placeholder="e.g. 4" /></Field>
          <Field label="Rear Tyre Size"><input style={inputStyle} value={form.rearTyreSize} onChange={e => set('rearTyreSize', e.target.value)} placeholder="e.g. 315/80R22.5" /></Field>
        </div>
      </div>

      {/* Modification Details */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={sectionTitle}>Modification Details</div>
          <button onClick={() => setShowCodePicker(!showCodePicker)} style={{ background: 'rgba(232,104,26,0.12)', border: '1px solid rgba(232,104,26,0.3)', borderRadius: 5, padding: '5px 12px', color: '#E8681A', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
            {showCodePicker ? 'Hide VASS Codes' : `+ VASS Codes${selectedCodes.length > 0 ? ` (${selectedCodes.length})` : ''}`}
          </button>
        </div>

        {showCodePicker && (
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <input
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="Filter codes..."
              value={codeFilter}
              onChange={e => setCodeFilter(e.target.value)}
            />
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {VASS_CODES
                .filter(vc => !codeFilter || vc.code.toLowerCase().includes(codeFilter.toLowerCase()) || vc.description.toLowerCase().includes(codeFilter.toLowerCase()))
                .map(vc => {
                  const selected = selectedCodes.some(c => c.code === vc.code)
                  return (
                    <div
                      key={vc.code}
                      onClick={() => toggleCode(vc)}
                      style={{
                        padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
                        background: selected ? 'rgba(232,104,26,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected ? 'rgba(232,104,26,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: 3, background: selected ? '#E8681A' : 'transparent', border: `2px solid ${selected ? '#E8681A' : 'rgba(255,255,255,0.2)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: '#E8681A', fontWeight: 700, width: 40, flexShrink: 0 }}>{vc.code}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{vc.description}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {selectedCodes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {selectedCodes.map(vc => (
              <span key={vc.code} style={{ background: 'rgba(232,104,26,0.15)', border: '1px solid rgba(232,104,26,0.3)', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: '#E8681A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {vc.code}
                <span onClick={() => toggleCode(vc)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ ...gridTwo, marginBottom: 12 }}>
          <Field label="Extreme Axle Spacing (mm)"><input style={inputStyle} value={form.extremeAxleSpacing} onChange={e => set('extremeAxleSpacing', e.target.value)} /></Field>
          <Field label="New Tare Weight (kg)"><input style={inputStyle} value={form.newTareWeight} onChange={e => set('newTareWeight', e.target.value)} /></Field>
        </div>
        <Field label="Modification Description">
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={form.modDescription}
            onChange={e => set('modDescription', e.target.value)}
            placeholder="Describe the modification work..."
          />
        </Field>
      </div>

      {/* Seating */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Seating</div>
        <div style={{ maxWidth: 200 }}>
          <Field label="Seats"><input style={inputStyle} value={form.seats} onChange={e => set('seats', e.target.value)} placeholder="e.g. 3" /></Field>
        </div>
      </div>

      {/* Notes */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Notes</div>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 40 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: saving ? 'rgba(232,104,26,0.4)' : '#E8681A',
            border: 'none', borderRadius: 7, padding: '12px 28px',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            letterSpacing: 0.5, transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving...' : bookingId ? 'Update Booking' : 'Save Booking'}
        </button>
        {saved && (
          <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
            ✓ Saved successfully
          </div>
        )}
      </div>
    </div>
  )
}
