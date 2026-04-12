'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDateAU } from '@/lib/vassData'

type Booking = Record<string, any>

export default function VassPrintPage() {
  const params = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/vass/bookings/${params.id}`).then(r => r.json()).then(b => {
      if (b.id) setBooking(b)
      else setError('Booking not found')
    }).catch(() => setError('Failed to load'))
  }, [params.id])

  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>{error}</div>
  if (!booking) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>

  const vassCodes: { code: string; description: string }[] = Array.isArray(booking.vassCodes) ? booking.vassCodes : []

  return (
    <>
      <style>{`
        @media print {
          .print-bar { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 10mm; size: A4; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; }
        .print-bar { background: #1a1a2e; padding: 10px 20px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .print-bar button { background: #E8681A; color: #fff; border: none; border-radius: 5px; padding: 7px 14px; font-weight: 700; font-size: 12px; cursor: pointer; }
        .form-page { max-width: 210mm; margin: 0 auto; padding: 14px 18px; }

        /* ── Header ── */
        .form-header { display: flex; justify-content: space-between; align-items: flex-start; border: 2px solid #000; padding: 8px 10px; margin-bottom: 4px; }
        .form-header-left { flex: 1; }
        .form-title { font-size: 18px; font-weight: 900; letter-spacing: 1px; line-height: 1; margin-bottom: 2px; }
        .form-subtitle { font-size: 10px; color: #333; }
        .form-email-block { text-align: right; font-size: 10px; line-height: 1.6; }
        .form-email-block a { color: #000; }

        /* ── Section wrapper ── */
        .section { border: 1px solid #000; margin-bottom: 4px; }
        .section-hdr { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #d0d0d0; padding: 3px 7px; letter-spacing: 0.5px; border-bottom: 1px solid #000; }

        /* ── Two-column request grid (3 rows × 2 cols) ── */
        .req-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .req-cell { padding: 4px 7px; border-right: 1px solid #000; border-bottom: 1px solid #000; }
        .req-cell:nth-child(2n) { border-right: none; }
        .req-cell:nth-last-child(-n+2) { border-bottom: none; }
        .cell-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #555; margin-bottom: 2px; }
        .cell-value { font-size: 11px; min-height: 14px; }

        /* ── Vehicle owners ── */
        .owners-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .owners-cell { padding: 4px 7px; border-right: 1px solid #000; border-bottom: 1px solid #000; }
        .owners-cell:nth-child(2n) { border-right: none; }
        .owners-cell.full { grid-column: 1 / -1; border-right: none; }
        .owners-cell:last-child { border-bottom: none; }

        /* ── Vehicle details two-column ── */
        .veh-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .veh-cell { padding: 4px 7px; border-right: 1px solid #000; border-bottom: 1px solid #000; }
        .veh-cell:nth-child(2n) { border-right: none; }
        .veh-cell.full { grid-column: 1 / -1; border-right: none; }
        .veh-cell:last-child, .veh-cell.last-row { border-bottom: none; }

        /* ── Lookup link row ── */
        .lookup-row { display: flex; gap: 12px; padding: 4px 7px; border-bottom: 1px solid #000; font-size: 9px; }
        .lookup-row a { color: #00e; }

        /* ── VASS codes ── */
        .codes-grid { display: grid; grid-template-columns: 52px 1fr; }
        .code-cell { padding: 3px 6px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; font-size: 9px; }
        .code-cell:nth-child(2n) { border-right: none; }
        .code-cell.hdr { font-weight: 700; background: #eee; }

        /* ── Description box ── */
        .desc-box { padding: 6px 7px; min-height: 60px; font-size: 11px; white-space: pre-wrap; }

        /* ── Instructions + Attachments ── */
        .inst-attach { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 4px; }
        .inst-col { padding: 6px 8px; border-right: 1px solid #000; font-size: 8.5px; line-height: 1.5; }
        .inst-col h4 { margin: 0 0 4px 0; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .attach-col { padding: 6px 8px; font-size: 8.5px; line-height: 1.5; }
        .attach-col h4 { margin: 0 0 4px 0; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #c00; }
        .attach-col ul { margin: 0; padding-left: 14px; }
        .attach-col li { margin-bottom: 2px; }
      `}</style>

      {/* Print bar */}
      <div className="print-bar">
        <button onClick={() => window.print()}>Print / Save PDF</button>
        <span style={{ color: '#fff', fontSize: 12, opacity: 0.7 }}>
          CVC eVASS Booking Request — {booking.jobNumber || 'Draft'}
        </span>
      </div>

      <div className="form-page">

        {/* ── Header ── */}
        <div className="form-header">
          <div className="form-header-left">
            <div className="form-title">VASS INSPECTION REQUEST</div>
            <div className="form-subtitle">Vehicle Assessment Signatory Scheme — VSB 6</div>
          </div>
          <div className="form-email-block">
            <div style={{ fontWeight: 700 }}>CVC Engineering</div>
            <div>
              Email to:{' '}
              <a href="mailto:Info@cvc.net.au">Info@cvc.net.au</a>
            </div>
            <div>Ph: (03) 9791 7575</div>
          </div>
        </div>

        {/* ── Request Details (3 rows × 2 cols) ── */}
        <div className="section">
          <div className="section-hdr">Request Details</div>
          <div className="req-grid">
            <div className="req-cell">
              <div className="cell-label">Date</div>
              <div className="cell-value">{formatDateAU(booking.bookingDate)}</div>
            </div>
            <div className="req-cell">
              <div className="cell-label">Inspection Date Requested</div>
              <div className="cell-value">{formatDateAU(booking.finishDate)}</div>
            </div>
            <div className="req-cell">
              <div className="cell-label">Name</div>
              <div className="cell-value">{booking.requestedBy}</div>
            </div>
            <div className="req-cell">
              <div className="cell-label">Email Address</div>
              <div className="cell-value">{booking.companyEmail}</div>
            </div>
            <div className="req-cell">
              <div className="cell-label">P/O Number</div>
              <div className="cell-value">{booking.poNumber}</div>
            </div>
            <div className="req-cell">
              <div className="cell-label">Job Number</div>
              <div className="cell-value">{booking.jobNumber}</div>
            </div>
          </div>
        </div>

        {/* ── Vehicle Owners Details ── */}
        <div className="section">
          <div className="section-hdr">Vehicle Owners Details</div>
          <div className="owners-grid">
            <div className="owners-cell">
              <div className="cell-label">Owners Email</div>
              <div className="cell-value">{booking.ownerEmail || booking.companyEmail}</div>
            </div>
            <div className="owners-cell">
              <div className="cell-label">Name</div>
              <div className="cell-value">{booking.ownerName}</div>
            </div>
            <div className="owners-cell full">
              <div className="cell-label">Address</div>
              <div className="cell-value">{booking.ownerAddress}</div>
            </div>
            <div className="owners-cell">
              <div className="cell-label">City / Suburb</div>
              <div className="cell-value">{booking.ownerCity}</div>
            </div>
            <div className="owners-cell" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRight: 'none', borderBottom: 'none', padding: 0 }}>
              <div style={{ padding: '4px 7px', borderRight: '1px solid #000' }}>
                <div className="cell-label">State</div>
                <div className="cell-value">{booking.ownerState}</div>
              </div>
              <div style={{ padding: '4px 7px' }}>
                <div className="cell-label">Postcode</div>
                <div className="cell-value">{booking.ownerPostcode}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Vehicle Details ── */}
        <div className="section">
          <div className="section-hdr">Vehicle Details</div>

          {/* Lookup links */}
          <div className="lookup-row">
            <span style={{ fontWeight: 700 }}>Check:</span>
            <a href="https://www.vicroads.vic.gov.au/registration/buy-sell-or-transfer-a-vehicle/check-vehicle-registration" target="_blank" rel="noopener noreferrer">VicRoad Rego Check</a>
            <a href="https://www.infrastructure.gov.au/vehicles/vehicle_regulation/bulletin/rvcs/" target="_blank" rel="noopener noreferrer">RVCS Lookup</a>
            <a href="https://rav.infrastructure.gov.au/" target="_blank" rel="noopener noreferrer">RAV Lookup</a>
          </div>

          <div className="veh-grid">
            <div className="veh-cell">
              <div className="cell-label">Make</div>
              <div className="cell-value">{booking.vehicleMake}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Model</div>
              <div className="cell-value">{booking.vehicleModel}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Engine Type &amp; Size</div>
              <div className="cell-value">{booking.engineType}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Engine Number</div>
              <div className="cell-value">{booking.engineNumber}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Registration Number</div>
              <div className="cell-value">{booking.rego}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Compliance Plate Date</div>
              <div className="cell-value">{booking.compPlateDate}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Odometer Reading</div>
              <div className="cell-value">{booking.odometer}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Seating Capacity</div>
              <div className="cell-value">{booking.seats}</div>
            </div>
            <div className="veh-cell full">
              <div className="cell-label">VIN Number</div>
              <div className="cell-value" style={{ fontFamily: 'monospace', letterSpacing: 1, fontSize: 12 }}>{booking.vinNumber}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">GVM (kg)</div>
              <div className="cell-value">{booking.gvm}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">GCM (kg)</div>
              <div className="cell-value">{booking.gcm}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Front Axle Rating (kg)</div>
              <div className="cell-value">{booking.frontAxleRating}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Rear Axle Rating (kg)</div>
              <div className="cell-value">{booking.rearAxleRating}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Front Tyres (qty)</div>
              <div className="cell-value">{booking.frontTyreCount}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Front Tyre Size</div>
              <div className="cell-value">{booking.frontTyreSize}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Rear Tyres (qty)</div>
              <div className="cell-value">{booking.rearTyreCount}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Rear Tyre Size</div>
              <div className="cell-value">{booking.rearTyreSize}</div>
            </div>
            <div className="veh-cell">
              <div className="cell-label">Extreme Axle Spacing (mm)</div>
              <div className="cell-value">{booking.extremeAxleSpacing}</div>
            </div>
            <div className="veh-cell last-row">
              <div className="cell-label">New Tare Weight (kg)</div>
              <div className="cell-value">{booking.newTareWeight}</div>
            </div>
          </div>
        </div>

        {/* ── VASS Modification Codes ── */}
        {vassCodes.length > 0 && (
          <div className="section">
            <div className="section-hdr">VASS Modification Codes</div>
            <div className="codes-grid">
              <div className="code-cell hdr">Code</div>
              <div className="code-cell hdr">Description</div>
              {vassCodes.map(c => (
                <>
                  <div key={`${c.code}-code`} className="code-cell" style={{ fontWeight: 700 }}>{c.code}</div>
                  <div key={`${c.code}-desc`} className="code-cell">{c.description}</div>
                </>
              ))}
            </div>
          </div>
        )}

        {/* ── Description of Modification ── */}
        <div className="section">
          <div className="section-hdr">Description of Modification</div>
          <div className="desc-box">{booking.modDescription || ''}</div>
        </div>

        {/* ── Instructions + Attachments ── */}
        <div className="inst-attach">
          <div className="inst-col">
            <h4>Instructions</h4>
            <p style={{ margin: '0 0 4px 0' }}>
              Please email this completed form along with all required attachments to{' '}
              <strong>Info@cvc.net.au</strong>.
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              Once received, CVC will confirm the inspection date and provide a purchase order number.
              Payment is required prior to or on the day of inspection.
            </p>
            <p style={{ margin: 0 }}>
              Ensure the vehicle is available at the agreed time and location. Any modifications must
              be complete and ready for inspection. Late cancellations (&lt;24 hrs) may incur a fee.
            </p>
          </div>
          <div className="attach-col">
            <h4>Attachments Required</h4>
            <ul>
              <li>Completed VASS Booking Request Form</li>
              <li>Engineering drawings / modification drawings</li>
              <li>Calculation sheets (if applicable)</li>
              <li>Photographs of the modification</li>
              <li>Copy of current registration certificate</li>
              <li>Any other supporting documentation</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888', borderTop: '1px solid #ccc', paddingTop: 5 }}>
          <span>YLZ Truck Bodies — CVC eVASS Booking Request</span>
          <span>Printed: {new Date().toLocaleDateString('en-AU')}</span>
        </div>

      </div>
    </>
  )
}
