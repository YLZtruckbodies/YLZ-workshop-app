'use client'

import { useEffect, useState } from 'react'

interface LineItem {
  id: string
  section: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sortOrder: number
}

interface Quote {
  id: string
  quoteNumber: string
  customerName: string
  dealerName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  buildType: string
  total: number
  overridePrice: number | null
  overrideNote: string | null
  preparedBy: string
  validDays: number
  notes: string
  terms: string
  lineItems: LineItem[]
  createdAt: string
}

// ─── YLZ company constants ────────────────────────────────────────────────────
const CO = {
  entity:    'YLZ Truck Bodies Pty Ltd',
  trading:   'YLZ Truck Bodies & Trailers',
  attention: 'Peter Sim',
  address:   '29 SOUTHEAST BOULEVARD',
  suburb:    'PAKENHAM VIC 3810',
  country:   'AUSTRALIA',
  tel:       '03 5940 7620',
  abn:       '39 615 324 546',
  web:       'ylztruckbodies.com.au',
}

// ─── Standard terms (matches Xero template) ───────────────────────────────────
const STANDARD_TERMS = `Purchase Order Requirement
Acceptance of this quote confirms your intention to proceed with the order. A valid Purchase Order (PO) must be provided at the time of acceptance. No production or scheduling will commence until the PO has been received.

Quote Validity
This quote is valid for 30 days from the date of issue unless otherwise agreed in writing. After this period, pricing and availability may be subject to change.

Pricing
All prices quoted are exclusive of GST unless otherwise stated. Prices may be revised if specifications or quantities change after acceptance.

Lead Times
Production timelines begin only after receipt of the Purchase Order and any required deposit or approvals.

Cancellations & Amendments
Orders changed or cancelled after PO submission may incur additional costs, depending on the progress of production.`

// ─── Product image by build type ──────────────────────────────────────────────

function buildTypeImage(buildType: string): string | null {
  const bt = (buildType || '').toLowerCase()
  if (bt.includes('truck') && bt.includes('trailer')) return '/images/combos/alloy-truck-dog.jpg'
  if (bt.includes('trailer'))                          return '/images/trailers/dog-trailer-4axle.jpg'
  if (bt.includes('truck'))                            return '/images/truck-bodies/hardox-tipper.jpg'
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Parse terms text → [{heading, body}] — first line of each paragraph = heading
function parseTerms(text: string): { heading: string; body: string }[] {
  const src = text?.trim() || STANDARD_TERMS
  return src
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.trim().split('\n')
      return { heading: lines[0], body: lines.slice(1).join('\n').trim() }
    })
    .filter((p) => p.heading)
}

// Group line items preserving original section order
function groupBySection(items: LineItem[]): Array<{ section: string; items: LineItem[] }> {
  const groups: Array<{ section: string; items: LineItem[] }> = []
  for (const item of items) {
    const sec = item.section || ''
    const last = groups[groups.length - 1]
    if (!last || last.section !== sec) {
      groups.push({ section: sec, items: [item] })
    } else {
      last.items.push(item)
    }
  }
  return groups
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotePrintPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [printReady, setPrintReady] = useState(false)

  function loadQuote() {
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    fetch(`/api/quotes/${params.id}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then((data) => {
        clearTimeout(timeout)
        if (data.error) throw new Error(data.error)
        setQuote(data)
        setLoading(false)
      })
      .catch((err) => {
        clearTimeout(timeout)
        setError(err.name === 'AbortError' ? 'Request timed out — check your connection and try again.' : (err.message || 'Failed to load quote'))
        setLoading(false)
      })
  }

  useEffect(() => { loadQuote() }, [params.id])

  useEffect(() => {
    if (quote && printReady) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [quote, printReady])

  if (loading) return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#666', textAlign: 'center' }}>
      <div style={{ marginBottom: 8 }}>Loading quote…</div>
      <div style={{ fontSize: 12, color: '#999' }}>Connecting to server</div>
    </div>
  )

  if (error || !quote) return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#c00', fontWeight: 700, marginBottom: 8 }}>
        {error || 'Quote not found'}
      </div>
      {error && (
        <button
          onClick={loadQuote}
          style={{ background: '#E8681A', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
        >
          Retry
        </button>
      )}
    </div>
  )

  const effectiveTotal = quote.overridePrice ?? quote.total
  const gst            = effectiveTotal * 0.1
  const totalAud       = effectiveTotal + gst
  const groups         = groupBySection(quote.lineItems)
  const termsParas     = parseTerms(quote.terms)

  // Customer block: show dealer name if set, otherwise customer name
  const customerLine   = quote.dealerName || quote.customerName

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; font-size: 10pt; line-height: 1.4; }

        /* ── Page wrapper ── */
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 16mm; position: relative; }

        /* ── Logo (top-right) ── */
        .logo-box {
          position: absolute; top: 14mm; right: 16mm;
          width: 110px; height: 55px;
          display: flex; align-items: center; justify-content: center;
        }
        .logo-box img { width: 100%; height: 100%; object-fit: contain; filter: invert(1); }

        /* ── Header: 3-column layout ── */
        .header {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 0 24px;
          align-items: start;
          margin-bottom: 32px;
          padding-right: 72px; /* clear logo */
        }

        .quote-word {
          font-size: 42pt; font-weight: 900; color: #1a1a1a;
          line-height: 1; letter-spacing: -2px;
        }
        .customer-block {
          margin-top: 10px;
          margin-left: 30px;
          font-size: 9.5pt; color: #1a1a1a; line-height: 1.55;
        }

        .meta-col { font-size: 9pt; min-width: 130px; }
        .meta-label { font-weight: 700; margin-top: 9px; }
        .meta-label:first-child { margin-top: 0; }
        .meta-value { color: #1a1a1a; margin-top: 1px; }

        .company-col { font-size: 9pt; color: #1a1a1a; line-height: 1.55; white-space: nowrap; }

        /* ── Product image ── */
        .product-img-wrap {
          width: 100%; margin-bottom: 20px; text-align: center;
        }
        .product-img-wrap img {
          max-height: 160px; max-width: 100%;
          object-fit: cover; border-radius: 4px;
        }

        /* ── Line items table ── */
        .items-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }

        /* Header row */
        .items-table thead th {
          padding: 5px 6px 6px 0;
          font-weight: 700; font-size: 9.5pt;
          text-align: left;
          border-bottom: 1.5px solid #1a1a1a;
        }
        .items-table thead th.r { text-align: right; }

        /* Column widths */
        .col-desc { width: 52%; }
        .col-qty  { width: 10%; }
        .col-up   { width: 13%; }
        .col-gst  { width: 8%; }
        .col-amt  { width: 17%; }

        /* Section header row (e.g. OPTIONAL EXTRAS) */
        .sec-hdr td {
          padding: 10px 0 3px;
          font-size: 9.5pt; font-weight: 400;
          border: none;
        }

        /* Separator row between groups */
        .grp-sep td { border-top: 0.5px solid #ccc; padding: 0; height: 0; }

        /* Data rows */
        .item-row td {
          padding: 6px 6px 6px 0;
          vertical-align: top;
          border-top: 0.5px solid #d8d8d8;
        }
        /* Remove top border on very first item row — header already has one */
        .item-row.first-item td { border-top: 1px solid #1a1a1a; }

        .desc-td { white-space: pre-line; line-height: 1.55; }
        .num-td  { text-align: right; white-space: nowrap; }

        /* Totals section */
        .totals-sep td { border-top: 0.5px solid #1a1a1a; padding: 0; }

        .tot-row td {
          padding: 3px 6px 3px 0;
          text-align: right;
          border: none;
          font-size: 9.5pt;
        }
        .tot-row.tot-final td {
          font-weight: 700;
          padding-top: 5px;
          border-top: 1.5px solid #1a1a1a;
        }

        /* ── Terms ── */
        .terms-wrap { margin-top: 32px; }
        .terms-heading { font-weight: 700; font-size: 9.5pt; margin-bottom: 5px; }
        .terms-rule { border: none; border-top: 1px solid #1a1a1a; margin-bottom: 10px; }
        .term-block { margin-bottom: 9px; }
        .term-title { font-size: 9pt; font-weight: 400; }
        .term-body  { font-size: 9pt; color: #1a1a1a; line-height: 1.55; }

        /* ── Print bar (hidden when printing) ── */
        .print-bar {
          background: #1a1a1a; color: #fff;
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .print-bar button {
          background: #E8681A; color: #fff; border: none;
          padding: 8px 20px; border-radius: 4px; font-weight: 700;
          cursor: pointer; font-size: 13px;
        }
        .print-bar a { color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none; }

        @media print {
          .print-bar { display: none !important; }
          .page { padding: 12mm 14mm; }
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .logo-box { top: 12mm; right: 14mm; }
        }
      `}</style>

      {/* ── Print bar ── */}
      <div className="print-bar">
        <a href={`/quotes/builder?id=${params.id}`}>← Back to quote</a>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{quote.quoteNumber} — {customerLine}</span>
        <button onClick={() => { setPrintReady(true); setTimeout(() => window.print(), 100) }}>Print / Save PDF</button>
      </div>

      <div className="page">

        {/* YZ logo */}
        <div className="logo-box"><img src="/images/ylz-logo.webp" alt="YLZ" /></div>

        {/* ── Header ── */}
        <div className="header">

          {/* Left — QUOTE + customer */}
          <div>
            <div className="quote-word">QUOTE</div>
            <div className="customer-block">
              {customerLine}
              {quote.contactName  && <><br />{quote.contactName}</>}
              {quote.contactEmail && <><br />{quote.contactEmail}</>}
              {quote.contactPhone && <><br />{quote.contactPhone}</>}
            </div>
          </div>

          {/* Middle — meta labels */}
          <div className="meta-col">
            <div className="meta-label">Date</div>
            <div className="meta-value">{fmtDate(quote.createdAt)}</div>
            <div className="meta-label">Quote Number</div>
            <div className="meta-value">{quote.quoteNumber}</div>
            <div className="meta-label">Reference</div>
            <div className="meta-value">{quote.buildType}</div>
            <div className="meta-label">ABN</div>
            <div className="meta-value">{CO.abn}</div>
          </div>

          {/* Right — YLZ company info */}
          <div className="company-col">
            {CO.entity}<br />
            T/A {CO.trading}<br />
            Attention: {CO.attention}<br />
            {CO.address}<br />
            {CO.suburb}<br />
            {CO.country}<br />
            TEL: {CO.tel}<br />
            {CO.web}
          </div>

        </div>

        {/* ── Product image ── */}
        {buildTypeImage(quote.buildType) && (
          <div className="product-img-wrap">
            <img src={buildTypeImage(quote.buildType)!} alt={quote.buildType} />
          </div>
        )}

        {/* ── Line items table ── */}
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-desc">Description</th>
              <th className="r col-qty">Quantity</th>
              <th className="r col-up">Unit Price</th>
              <th className="r col-gst">GST</th>
              <th className="r col-amt">Amount AUD</th>
            </tr>
          </thead>
          <tbody>

            {groups.map((group, gi) => {
              // Show section header for every group except the very first generic one
              const showHeader = group.section &&
                !(gi === 0 && ['build', 'Build', '', 'main', 'Main'].includes(group.section))

              return (
                <>
                  {showHeader && (
                    <tr key={`h-${gi}`} className="sec-hdr">
                      <td colSpan={5}>{group.section.toUpperCase()}</td>
                    </tr>
                  )}

                  {group.items.map((item, ii) => (
                    <tr
                      key={item.id || `${gi}-${ii}`}
                      className={`item-row${gi === 0 && ii === 0 ? ' first-item' : ''}`}
                    >
                      <td className="desc-td">{item.description}</td>
                      <td className="num-td">{item.quantity.toFixed(2)}</td>
                      <td className="num-td">{fmt(item.unitPrice)}</td>
                      <td className="num-td">10%</td>
                      <td className="num-td">{fmt(item.totalPrice)}</td>
                    </tr>
                  ))}
                </>
              )
            })}

            {/* ── Separator before totals ── */}
            <tr className="totals-sep"><td colSpan={5} /></tr>

            {/* Subtotal */}
            <tr className="tot-row">
              <td colSpan={4} style={{ paddingRight: 20 }}>Subtotal</td>
              <td>{fmt(effectiveTotal)}</td>
            </tr>

            {/* TOTAL GST 10% */}
            <tr className="tot-row">
              <td colSpan={4} style={{ paddingRight: 20 }}>TOTAL&nbsp;&nbsp;GST&nbsp;&nbsp;10%</td>
              <td>{fmt(gst)}</td>
            </tr>

            {/* TOTAL AUD */}
            <tr className="tot-row tot-final">
              <td colSpan={4} style={{ paddingRight: 20 }}>TOTAL AUD</td>
              <td>{fmt(totalAud)}</td>
            </tr>

          </tbody>
        </table>

        {/* ── Terms ── */}
        {termsParas.length > 0 && (
          <div className="terms-wrap">
            <div className="terms-heading">Terms</div>
            <hr className="terms-rule" />
            {termsParas.map((p, i) => (
              <div key={i} className="term-block">
                <div className="term-title">{p.heading}</div>
                {p.body && <div className="term-body">{p.body}</div>}
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}
