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
          @page { margin: 15mm; size: A4; }
        }
        body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; }
        .print-bar { background: #1a1a2e; padding: 12px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .print-bar button { background: #E8681A; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 700; font-size: 12px; cursor: pointer; }
        .form-page { max-width: 210mm; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin: 0 0 4px 0; letter-spacing: 1px; }
        .header h2 { font-size: 14px; margin: 0; font-weight: normal; color: #333; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; background: #f0f0f0; padding: 4px 8px; margin-bottom: 8px; border: 1px solid #ccc; letter-spacing: 0.5px; }
        .row { display: flex; gap: 8px; margin-bottom: 6px; }
        .field { flex: 1; }
        .field-label { font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .field-value { border-bottom: 1px solid #999; min-height: 16px; padding: 2px 4px; font-size: 11px; }
        .codes-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
        .codes-table th, .codes-table td { border: 1px solid #ccc; padding: 3px 6px; text-align: left; }
        .codes-table th { background: #f0f0f0; font-weight: 700; }
        .mod-box { border: 1px solid #999; min-height: 60px; padding: 6px 8px; font-size: 11px; white-space: pre-wrap; }
      `}</style>

      {/* Print bar */}
      <div className="print-bar">
        <button onClick={() => window.print()}>ð¨ï¸ Print / Save PDF</button>
        <span style={{ color: '#fff', fontSize: 12, opacity: 0.7 }}>CVC eVASS Booking Request â {booking.jobNumber || 'Draft'}</span>
      </div>

      <div className="form-page">
        {/* Header */}
        <div className="header">
          <h1>CVC eVASS BOOKING REQUEST</h1>
          <h2>Vehicle Assessment Signatory Scheme</h2>
        </div>

        {/* Booking Details */}
        <div className="section">
          <div className="section-title">Booking Details</div>
          <div className="row">
            <div className="field">
              <div className="field-label">Date</div>
              <div className="field-value">{formatDateAU(booking.bookingDate)}</div>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <div className="field-label">Requested By</div>
              <div className="field-value">{booking.requestedBy}</div>
            </div>
            <div className="field">
              <div className="field-label">P/O Number</div>
              <div className="field-value">{booking.poNumber}</div>
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <div className="field-label">Address</div>
              <div className="field-value">{booking.companyAddress}</div>
            </div>
            <div className="field">
              <div className="field-label">State</div>
              <div className="field-value">{booking.companyState}</div>
            </div>
            <div className="field">
              <div className="field-label">Postcode</div>
              <div className="field-value">{booking.companyPostcode}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">Email</div>
              <div className="field-value">{booking.companyEmail}</div>
            </div>
            <div className="field">
              <div className="field-label">Phone</div>
              <div className="field-value">{booking.companyPhone}</div>
            </div>
            <div className="field">
              <div className="field-label">Finish Date</div>
              <div className="field-value">{formatDateAU(booking.finishDate)}</div>
            </div>
          </div>
        </div>

        {/* Vehicle Owner */}
        <div className="section">
          <div className="section-title">Vehicle Owner Details</div>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <div className="field-label">Name</div>
              <div className="field-value">{booking.ownerName}</div>
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <div className="field-label">Address</div>
              <div className="field-value">{booking.ownerAddress}</div>
            </div>
            <div className="field">
              <div className="field-label">City</div>
              <div className="field-value">{booking.ownerCity}</div>
            </div>
            <div className="field" style={{ flex: 0.5 }}>
              <div className="field-label">State</div>
              <div className="field-value">{booking.ownerState}</div>
            </div>
            <div className="field" style={{ flex: 0.5 }}>
              <div className="field-label">P/Code</div>
              <div className="field-value">{booking.ownerPostcode}</div>
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="section">
          <div className="section-title">Vehicle Details</div>
          <div className="row">
            <div className="field">
              <div className="field-label">Make</div>
              <div className="field-value">{booking.vehicleMake}</div>
            </div>
            <div className="field">
              <div className="field-label">Model</div>
              <div className="field-value">{booking.vehicleModel}</div>
            </div>
            <div className="field">
              <div className="field-label">Engine Type & Size</div>
              <div className="field-value">{booking.engineType}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">Engine #</div>
              <div className="field-value">{booking.engineNumber}</div>
            </div>
            <div className="field">
              <div className="field-label">Rego</div>
              <div className="field-value">{booking.rego}</div>
            </div>
            <div className="field">
              <div className="field-label">Compliance Plate Date</div>
              <div className="field-value">{booking.compPlateDate}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">Odometer</div>
              <div className="field-value">{booking.odometer}</div>
            </div>
            <div className="field">
              <div className="field-label">Seating Capacity</div>
              <div className="field-value">{booking.seats}</div>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <div className="field-label">VIN #</div>
              <div className="field-value" style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{booking.vinNumber}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">GVM (kg)</div>
              <div className="field-value">{booking.gvm}</div>
            </div>
            <div className="field">
              <div className="field-label">GCM (kg)</div>
              <div className="field-value">{booking.gcm}</div>
            </div>
            <div className="field">
              <div className="field-label">Front Axle Rating (kg)</div>
              <div className="field-value">{booking.frontAxleRating}</div>
            </div>
            <div className="field">
              <div className="field-label">Rear Axle Rating (kg)</div>
              <div className="field-value">{booking.rearAxleRating}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">Front Tyres (qty)</div>
              <div className="field-value">{booking.frontTyreCount}</div>
            </div>
            <div className="field">
              <div className="field-label">Front Tyre Size</div>
              <div className="field-value">{booking.frontTyreSize}</div>
            </div>
            <div className="field">
              <div className="field-label">Rear Tyres (qty)</div>
              <div className="field-value">{booking.rearTyreCount}</div>
            </div>
            <div className="field">
              <div className="field-label">Rear Tyre Size</div>
              <div className="field-value">{booking.rearTyreSize}</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="field-label">Extreme Axle Spacing (mm)</div>
              <div className="field-value">{booking.extremeAxleSpacing}</div>
            </div>
            <div className="field">
              <div className="field-label">New Tare Weight (kg)</div>
              <div className="field-value">{booking.newTareWeight}</div>
            </div>
            <div className="field" style={{ flex: 2 }}></div>
          </div>
        </div>

        {/* VASS Modification Codes */}
        {vassCodes.length > 0 && (
          <div className="section">
            <div className="section-title">VASS Modification Codes</div>
            <table className="codes-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {vassCodes.map(c => (
                  <tr key={c.code}>
                    <td style={{ fontWeight: 700 }}>{c.code}</td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Description of Modification */}
        <div className="section">
          <div className="section-title">Description of Modification</div>
          <div className="mod-box">{booking.modDescription || 'â'}</div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#999', borderTop: '1px solid #ccc', paddingTop: 8 }}>
          <span>YLZ Truck Bodies â CVC eVASS Booking Request</span>
          <span>Generated: {new Date().toLocaleDateString('en-AU')}</span>
        </div>
      </div>
    </>
  )
}
