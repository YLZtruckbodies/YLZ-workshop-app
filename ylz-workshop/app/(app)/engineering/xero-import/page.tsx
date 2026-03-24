'use client'

import { useCallback, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedConfig {
  material: string
  chassisMake: string
  chassisModel: string
  bodyLength: string
  bodyHeight: string
  bodyWidth: string
  hoist: string
  coupling: string
  pto: string
  controls: string
  hydraulics: string
  tarpSystem: string
  axleCount: number
  axleMake: string
  axleType: string
  buildType: string
  trailerModel: string
  tailgateType: string
  floorSheet: string
  sideSheet: string
  brakeCoupling: string
}

interface XeroQuote {
  quoteNumber: string
  reference: string
  customer: string
  date: string
  status: string
  amount: string
  rawText: string
  parsedConfig: ParsedConfig
}

interface BomEntry {
  code: string
  name: string
  category: string
  section: string
  auto: boolean
}

// ── Styles ───────────────────────────────────────────────────────────────────
const C = {
  copper: '#E8681A', copperDim: 'rgba(232,104,26,0.1)', copperBorder: 'rgba(232,104,26,0.4)',
  red: '#c0392b', green: '#27ae60', greenDim: 'rgba(39,174,96,0.1)',
  panel: 'var(--dark2, #141414)', card: 'var(--dark3, #1e1e1e)', border: 'var(--border, #2a2a2a)',
  text1: '#fff', text2: '#aaa', text3: '#666',
  mono: "'Courier New', monospace", font: "'League Spartan', system-ui, sans-serif",
}

// ── Parser: Extract config from Xero quote text ─────────────────────────────

function parseXeroText(text: string): ParsedConfig {
  const t = text.replace(/\s+/g, ' ').toLowerCase()
  const tOrig = text.replace(/\s+/g, ' ')

  const config: ParsedConfig = {
    material: '', chassisMake: '', chassisModel: '', bodyLength: '', bodyHeight: '',
    bodyWidth: '', hoist: '', coupling: '', pto: '', controls: '', hydraulics: '',
    tarpSystem: '', axleCount: 0, axleMake: '', axleType: '', buildType: '',
    trailerModel: '', tailgateType: '', floorSheet: '', sideSheet: '', brakeCoupling: '',
  }

  // Material
  if (t.includes('hardox')) config.material = 'Hardox 500'
  else if (t.includes('alumin') || t.includes('alloy') || t.includes('ally')) config.material = 'Aluminium'
  else if (t.includes('steel')) config.material = 'Steel'

  // Build type
  const isTrailer = t.includes('trailer') || t.includes('dog') || t.includes('semi') || t.includes('axle dog') || t.includes('axle trailer')
  const isTruck = t.includes('truck body') || t.includes('tipper body') || t.includes('tipper to suit') || t.includes('tipping body')
  const isCombo = (isTruck && isTrailer) || t.includes('combo') || t.includes('truck and trailer') || t.includes('truck/trailer')

  if (isCombo) config.buildType = 'truck-and-trailer'
  else if (isTrailer && !isTruck) config.buildType = 'trailer'
  else config.buildType = 'truck-body'

  // Chassis make
  const makes = [
    'hino', 'isuzu', 'fuso', 'mercedes', 'merc', 'volvo', 'kenworth', 'mack',
    'daf', 'iveco', 'ud', 'scania', 'freightliner', 'western star', 'sitrak', 'sinotruk', 'sino'
  ]
  for (const make of makes) {
    if (t.includes(make)) {
      config.chassisMake = make.charAt(0).toUpperCase() + make.slice(1)
      if (make === 'merc') config.chassisMake = 'Mercedes'
      if (make === 'sino' || make === 'sinotruk') config.chassisMake = 'Sinotruk'
      break
    }
  }

  // Chassis model — look for patterns like "Hino 2848", "Actros 2646"
  const modelMatch = tOrig.match(/(?:Hino|Isuzu|Mercedes|Actros|Volvo|Kenworth|Mack|Fuso|UD|Freightliner|Sitrak)\s+([A-Z0-9]{2,10})/i)
  if (modelMatch) config.chassisModel = modelMatch[1]

  // Body dimensions
  const lenMatch = t.match(/length[:\s]*(?:up to\s*)?(\d{3,5})\s*mm/i) || t.match(/(\d{4,5})\s*mm\s*(?:long|length)/i)
  if (lenMatch) config.bodyLength = lenMatch[1]

  const heightMatch = t.match(/height[:\s]*(?:up to\s*)?(\d{3,5})\s*mm/i) || t.match(/(\d{3,4})\s*mm\s*(?:high|wall|height)/i)
  if (heightMatch) config.bodyHeight = heightMatch[1]

  const widthMatch = t.match(/width[:\s]*(?:up to\s*)?(\d{3,5})\s*mm/i) || t.match(/(\d{4})\s*mm\s*(?:wide|width|quarry)/i)
  if (widthMatch) config.bodyWidth = widthMatch[1]

  // Also check reference/title for body length like "8.3m" or "7.7m"
  const refLenMatch = tOrig.match(/(\d+\.?\d*)\s*[mM]\s/i)
  if (refLenMatch && !config.bodyLength) {
    config.bodyLength = String(Math.round(parseFloat(refLenMatch[1]) * 1000))
  }

  // Floor/side sheet
  const floorMatch = t.match(/floor\s*(?:sheet)?[:\s]*(\d+mm\s*(?:thick\s*)?(?:hardox|alumin|alloy|steel)[^\.]*)/)
  if (floorMatch) config.floorSheet = floorMatch[1].trim()
  const sideMatch = t.match(/side\s*(?:sheet)?[:\s]*(\d+mm\s*(?:thick\s*)?(?:hardox|alumin|alloy|steel)[^\.]*)/)
  if (sideMatch) config.sideSheet = sideMatch[1].trim()

  // Hoist
  if (t.includes('binotto')) {
    const binMatch = t.match(/binotto\s*(\d{4})?/i)
    config.hoist = binMatch?.[1] ? `Binotto ${binMatch[1]}` : 'Binotto 3190'
  } else if (t.includes('hyva')) {
    config.hoist = t.includes('092') ? 'Hyva Alpha 092' : t.includes('190') ? 'Hyva Alpha 190' : 'Hyva'
  } else if (t.includes('kröger') || t.includes('kroger') || t.includes('ph122')) {
    config.hoist = 'PH122 Kröger'
  }

  // Coupling
  if (t.includes('orlandi') || t.includes('v-0landi') || t.includes('v.orlandi')) config.coupling = 'V.Orlandi'
  else if (t.includes('bartlett')) config.coupling = 'Bartlett Ball 127mm'
  else if (t.includes('pintle')) config.coupling = 'Pintle Hook PH300 with Air Cushion'

  // PTO
  if (t.includes('pto') && (t.includes('gear') || t.includes('drive'))) config.pto = 'Gearbox PTO'
  else if (t.includes('engine pto')) config.pto = 'Engine PTO'

  // Controls
  if (t.includes('electric hand controller') || t.includes('ylz electric hand')) config.controls = 'Electric hand controller'
  else if (t.includes('in-cab') || t.includes('in cab')) config.controls = 'In-cab controller'

  // Hydraulics
  if (t.includes('chassis mounted')) config.hydraulics = 'Chassis Mounted'
  else if (t.includes('behind cab')) config.hydraulics = 'Behind Cab'
  else if (t.includes('split') && t.includes('tank')) config.hydraulics = 'Split Factory Tank'
  else if (t.includes('supply hydraulic tank')) config.hydraulics = 'Split Factory Tank'

  // Tarp
  if (t.includes('pvc') && t.includes('razor')) config.tarpSystem = 'Razor PVC Electric'
  else if (t.includes('mesh') && t.includes('razor')) config.tarpSystem = 'Razor Mesh Electric'
  else if (t.includes('pvc') && t.includes('electric')) config.tarpSystem = 'Razor PVC Electric'
  else if (t.includes('pvc') && t.includes('manual')) config.tarpSystem = 'Razor PVC Manual'
  else if (t.includes('pvc/mesh') || t.includes('pvc or mesh')) config.tarpSystem = 'Razor PVC/MESH Electric'
  else if (t.includes('tarp') && !t.includes('no tarp')) config.tarpSystem = 'Razor PVC/MESH Electric'

  // Tailgate
  if (t.includes('2 way') || t.includes('two way') || t.includes('2-way')) config.tailgateType = '2 Way'
  else if (t.includes('single drop')) config.tailgateType = 'Single Drop'
  else if (t.includes('bi-fold') || t.includes('bifold')) config.tailgateType = 'Bi-fold'

  // Axle info (trailer)
  if (isTrailer) {
    const axleMatch = t.match(/(\d)\s*(?:axle|\/a)/i)
    if (axleMatch) config.axleCount = parseInt(axleMatch[1])
    // Try from reference like "3 axle" or "4 Axle"
    if (!config.axleCount) {
      const refAxle = t.match(/(\d)\s*axle/i)
      if (refAxle) config.axleCount = parseInt(refAxle[1])
    }
    // Also "tri axle" = 3, "quad" = 4
    if (t.includes('tri axle') || t.includes('tri-axle')) config.axleCount = 3
    if (t.includes('quad')) config.axleCount = 4

    if (t.includes('saf')) config.axleMake = 'SAF'
    else if (t.includes('bpw')) config.axleMake = 'BPW'
    else if (t.includes('tmc')) config.axleMake = 'TMC'
    else config.axleMake = 'SAF' // default

    if (t.includes('disc')) config.axleType = 'Disc'
    else config.axleType = 'Drum' // default for most YLZ builds

    // Trailer model
    if (config.axleCount === 3 && t.includes('dog')) config.trailerModel = 'DT-3 (3-Axle Dog)'
    else if (config.axleCount === 4 && t.includes('dog')) config.trailerModel = 'DT-4 (4-Axle Dog)'
    else if (config.axleCount === 5 && t.includes('dog')) config.trailerModel = 'DT-5 (5-Axle Dog)'
    else if (config.axleCount === 3 && t.includes('semi')) config.trailerModel = 'ST-3 (3-Axle Semi)'
    else if (config.axleCount === 2 && t.includes('semi')) config.trailerModel = 'ST-2 (2-Axle Semi)'
  }

  // Brake coupling
  if (t.includes('duomatic')) config.brakeCoupling = 'Duomatic'
  if (t.includes('triomatic')) config.brakeCoupling = 'Triomatic'

  return config
}

// ── Parse CSV ────────────────────────────────────────────────────────────────

function parseCSV(text: string): XeroQuote[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  return lines.slice(1).map(line => {
    // Handle CSV with quoted fields
    const parts: string[] = []
    let current = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; continue }
      current += ch
    }
    parts.push(current.trim())
    return {
      quoteNumber: parts[0] || '',
      reference: parts[1] || '',
      customer: parts[2] || '',
      date: parts[3] || '',
      status: parts[4] || '',
      amount: parts[5] || '0',
      rawText: parts[1] || '', // Reference contains the build description
      parsedConfig: parseXeroText(parts[1] + ' ' + parts[2]),
    }
  }).filter(q => q.quoteNumber)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function XeroImportPage() {
  const [quotes, setQuotes] = useState<XeroQuote[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [bomList, setBomList] = useState<BomEntry[]>([])
  const [loadingBoms, setLoadingBoms] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imported, setImported] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detailText, setDetailText] = useState('')

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (file.name.endsWith('.csv')) {
          setQuotes(parseCSV(text))
        } else if (file.name.endsWith('.txt')) {
          // Single quote text file — parse it
          const parsed = parseXeroText(text)
          const qNum = text.match(/QU-\d+/)?.[0] || file.name.replace('.txt', '')
          const customer = text.match(/Customer(?:Customer)?([A-Za-z\s&\.]+?)(?:Issue|Quote)/)?.[1]?.trim() || ''
          setQuotes(prev => [...prev, {
            quoteNumber: qNum, reference: '', customer, date: '', status: '',
            amount: '0', rawText: text, parsedConfig: parsed,
          }])
        }
      }
      reader.readAsText(file)
    }
  }, [])

  // Resolve BOMs for a quote
  const resolveBoms = useCallback(async (idx: number) => {
    const q = quotes[idx]
    setSelectedIdx(idx)
    setLoadingBoms(true)
    setDetailText(q.rawText)

    // Build config object from parsed fields
    const cfg = q.parsedConfig
    const configPayload: Record<string, unknown> = {
      material: cfg.material,
      chassisMake: cfg.chassisMake,
      chassisModel: cfg.chassisModel,
      bodyLength: cfg.bodyLength,
      bodyHeight: cfg.bodyHeight,
      bodyWidth: cfg.bodyWidth,
      hoist: cfg.hoist,
      coupling: cfg.coupling,
      pto: cfg.pto,
      controls: cfg.controls,
      hydraulics: cfg.hydraulics,
      tarpSystem: cfg.tarpSystem,
      axleCount: cfg.axleCount,
      axleMake: cfg.axleMake,
      axleType: cfg.axleType,
      trailerModel: cfg.trailerModel,
      tailgateType: cfg.tailgateType,
      brakeCoupling: cfg.brakeCoupling,
    }

    try {
      // Use the resolver via a temporary quote creation + BOM endpoint
      // Or just call the resolver directly via a lightweight API
      const res = await fetch('/api/bom-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildType: cfg.buildType, configuration: configPayload }),
      })
      if (res.ok) {
        const data = await res.json()
        setBomList(data.bomList || [])
      } else {
        setBomList([])
      }
    } catch {
      setBomList([])
    }
    setLoadingBoms(false)
  }, [quotes])

  // Import quote into workshop app
  const importQuote = useCallback(async (idx: number) => {
    const q = quotes[idx]
    setImporting(true)
    const cfg = q.parsedConfig
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNumber: q.quoteNumber,
          status: 'draft',
          customerName: q.customer,
          buildType: cfg.buildType === 'truck-body' ? 'Truck Body' : cfg.buildType === 'trailer' ? 'Trailer' : 'Truck + Trailer',
          configuration: {
            material: cfg.material, chassisMake: cfg.chassisMake, chassisModel: cfg.chassisModel,
            bodyLength: cfg.bodyLength, bodyHeight: cfg.bodyHeight, bodyWidth: cfg.bodyWidth,
            hoist: cfg.hoist, coupling: cfg.coupling, pto: cfg.pto, controls: cfg.controls,
            hydraulics: cfg.hydraulics, tarpSystem: cfg.tarpSystem, axleCount: cfg.axleCount,
            axleMake: cfg.axleMake, axleType: cfg.axleType, trailerModel: cfg.trailerModel,
            buildType: cfg.buildType,
          },
          preparedBy: 'Xero Import',
          validDays: 30,
          lineItems: [{
            section: 'Build',
            description: q.reference || q.rawText.substring(0, 500),
            quantity: 1,
            unitPrice: parseFloat(q.amount) || 0,
            totalPrice: parseFloat(q.amount) || 0,
            sortOrder: 0,
          }],
          subtotal: parseFloat(q.amount) || 0,
          total: parseFloat(q.amount) || 0,
          margin: 0, overhead: 0, discount: 0,
          notes: `Imported from Xero ${q.quoteNumber}`,
        }),
      })
      if (res.ok) {
        setImported(prev => new Set(prev).add(q.quoteNumber))
      }
    } catch { /* ignore */ }
    setImporting(false)
  }, [quotes])

  // Copy BOMs
  const copyBoms = () => {
    const q = selectedIdx !== null ? quotes[selectedIdx] : null
    const header = q ? `${q.quoteNumber} — ${q.customer}\n${'─'.repeat(50)}\n` : ''
    const lines = bomList.map((b, i) => `${i + 1}.\t${b.code}\t${b.name}\t${b.section}`).join('\n')
    navigator.clipboard.writeText(header + lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const selected = selectedIdx !== null ? quotes[selectedIdx] : null

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.text3 }}>
          <a href="/engineering" style={{ color: C.text3, textDecoration: 'none' }}>← Engineering</a>
          {' / '}
          <a href="/engineering/mrp-ordering" style={{ color: C.text3, textDecoration: 'none' }}>MRP Ordering</a>
        </div>
        <h1 style={{ fontFamily: C.font, fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.text1, margin: '4px 0 0' }}>
          Xero Quote Import
        </h1>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
          Drop your Xero quotes CSV → auto-parse specs → get BOMs → import into workshop app
        </div>
      </div>

      {/* Drop zone (if no quotes loaded) */}
      {quotes.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? C.copper : C.border}`,
            borderRadius: 12, padding: '60px 40px', textAlign: 'center',
            background: dragOver ? C.copperDim : C.panel,
            transition: 'all 0.2s', cursor: 'pointer',
          }}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv,.txt'
            input.multiple = true
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files
              if (files) {
                const fakeEvent = { preventDefault: () => {}, dataTransfer: { files } } as unknown as React.DragEvent
                handleDrop(fakeEvent)
              }
            }
            input.click()
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>
            Drop Xero quotes here
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 8 }}>
            Accepts <strong>quotes-summary.csv</strong> from Xero export, or individual <strong>.txt</strong> quote files
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
            Or click to browse
          </div>
        </div>
      )}

      {/* Main layout */}
      {quotes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 16, alignItems: 'start' }}>

          {/* LEFT: Quote list */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.copper, textTransform: 'uppercase', letterSpacing: 1 }}>
                Xero Quotes ({quotes.length})
              </span>
              <button
                onClick={() => { setQuotes([]); setSelectedIdx(null); setBomList([]) }}
                style={{ background: 'none', border: 'none', color: C.text3, fontSize: 11, cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
            <div
              style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {quotes.map((q, idx) => (
                <button
                  key={q.quoteNumber + idx}
                  onClick={() => resolveBoms(idx)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '10px 14px', border: 'none', borderBottom: `1px solid ${C.border}`,
                    background: selectedIdx === idx ? C.copperDim : imported.has(q.quoteNumber) ? C.greenDim : 'transparent',
                    borderLeft: selectedIdx === idx ? `3px solid ${C.copper}` : imported.has(q.quoteNumber) ? `3px solid ${C.green}` : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: C.mono }}>{q.quoteNumber}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.copper }}>${Number(q.amount).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{q.customer}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{q.reference?.substring(0, 60) || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {q.parsedConfig.material && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: C.text2 }}>{q.parsedConfig.material}</span>}
                    {q.parsedConfig.buildType && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: C.text2 }}>{q.parsedConfig.buildType}</span>}
                    {q.parsedConfig.chassisMake && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: C.text2 }}>{q.parsedConfig.chassisMake}</span>}
                    {imported.has(q.quoteNumber) && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: C.greenDim, color: C.green, fontWeight: 700 }}>✓ Imported</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Parsed config + BOMs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {!selected ? (
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 40, textAlign: 'center', color: C.text3 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👈</div>
                <div style={{ fontSize: 13 }}>Click a Xero quote to parse specs and resolve BOMs</div>
              </div>
            ) : (
              <>
                {/* Parsed config */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 800, color: C.copper }}>{selected.quoteNumber}</span>
                      <span style={{ fontSize: 12, color: C.text2, marginLeft: 12 }}>{selected.customer}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!imported.has(selected.quoteNumber) && (
                        <button
                          onClick={() => importQuote(selectedIdx!)}
                          disabled={importing}
                          style={{
                            background: C.green, border: 'none', borderRadius: 6,
                            padding: '7px 14px', color: '#fff', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer', opacity: importing ? 0.5 : 1,
                          }}
                        >
                          {importing ? 'Importing…' : '↓ Import to Workshop App'}
                        </button>
                      )}
                      {bomList.length > 0 && (
                        <button
                          onClick={copyBoms}
                          style={{
                            background: copied ? C.green : C.copper, border: 'none', borderRadius: 6,
                            padding: '7px 14px', color: '#fff', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {copied ? '✓ Copied' : '📋 Copy BOMs'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parsed fields grid */}
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {Object.entries(selected.parsedConfig)
                      .filter(([, v]) => v && v !== '0' && v !== 0)
                      .map(([key, val]) => (
                        <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>
                          <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: C.text3 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginTop: 2 }}>{String(val)}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* BOM list */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.copper, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Resolved BOMs ({bomList.length})
                    </span>
                    {bomList.filter(b => b.code === 'TBD').length > 0 && (
                      <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>
                        {bomList.filter(b => b.code === 'TBD').length} items need manual check
                      </span>
                    )}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {loadingBoms ? (
                      <div style={{ padding: 30, textAlign: 'center', color: C.text3 }}>Resolving BOMs…</div>
                    ) : bomList.length === 0 ? (
                      <div style={{ padding: 30, textAlign: 'center', color: C.text3, fontSize: 12 }}>No BOMs resolved — check parsed config above</div>
                    ) : bomList.map((bom, i) => (
                      <div key={`${bom.code}-${i}`} style={{
                        display: 'grid', gridTemplateColumns: '30px 100px 1fr 120px', padding: '8px 16px',
                        borderBottom: `1px solid ${C.border}`, alignItems: 'center',
                        borderLeft: bom.code === 'TBD' ? `3px solid ${C.red}` : '3px solid transparent',
                        background: bom.code === 'TBD' ? 'rgba(192,57,43,0.06)' : 'transparent',
                      }}>
                        <div style={{ fontSize: 10, color: C.text3 }}>{i + 1}</div>
                        <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: bom.code === 'TBD' ? C.red : C.copper }}>{bom.code}</div>
                        <div style={{ fontSize: 12, color: C.text2 }}>{bom.name}</div>
                        <div style={{ fontSize: 10, color: C.text3 }}>{bom.section}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
