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
          @page { margin: 12mm; size: A4; }
        }
        body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; }
        .print-bar { background: #1a1a2e; padding: 12px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .print-bar button { border: none; border-radius: 6px; padding: 8px 16px; font-weight: 700; font-size: 12px; cursor: pointer; }
        .form-page { max-width: 210mm; margin: 0 auto; padding: 16px 20px; }

        /* CVC Header */
        .cvc-header { text-align: center; border: 2px solid #000; padding: 12px; margin-bottom: 12px; }
        .cvc-header .company-name { font-size: 16px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 2px 0; }
        .cvc-header .form-title { font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 4px 0; color: #000; }
        .cvc-header .email-line { font-size: 11px; color: #333; margin: 4px 0 0 0; }

        /* Sections */
        .section { margin-bottom: 10px; }
        .section-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          background: #000; color: #fff; padding: 4px 8px; margin-bottom: 0;
          letter-spacing: 0.5px;
        }
        .section-body { border: 1px solid #000; border-top: none; padding: 8px; }

        /* Fields */
        .row { display: flex; gap: 0; margin-bottom: 0; }
        .field { flex: 1; display: flex; align-items: baseline; padding: 3px 4px; }
        .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; margin-right: 6px; min-width: fit-content; }
        .field-value { border-bottom: 1px solid #666; flex: 1; min-height: 14px; padding: 1px 4px; font-size: 11px; }
        .field-value.mono { font-family: 'Courier New', monospace; letter-spacing: 1.5px; }

        /* VASS codes table */
        .codes-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .codes-table th, .codes-table td { border: 1px solid #000; padding: 3px 6px; text-align: left; }
        .codes-table th { background: #e0e0e0; font-weight: 700; font-size: 9px; text-transform: uppercase; }

        /* Mod description box */
        .mod-box { border: 1px solid #000; min-height: 50px; padding: 6px 8px; font-size: 11px; white-space: pre-wrap; }

        /* Attachments */
        .attach-box { border: 1px solid #000; padding: 8px; font-size: 10px; }

        /* Links bar */
        .links-bar { margin-top: 10px; padding: 6px 8px; background: #f5f5f5; border: 1px solid #ccc; font-size: 10px; display: flex; gap: 20px; flex-wrap: wrap; }
        .links-bar a { color: #0066cc; text-decoration: none; }
        .links-bar a:hover { text-decoration: underline; }

        /* Footer */
        .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 9px; color: #999; border-top: 1px solid #ccc; padding-top: 6px; }
      `}</style>

      {/* Print bar */}
      <div className="print-bar">
        <button onClick={() => window.print()} style={{ background: '#E8681A', color: '#fff' }}>Print / Save PDF</button>
        <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Back</button>
        <span style={{ color: '#fff', fontSize: 12, opacity: 0.7 }}>CVC eVASS Booking Request — {booking.jobNumber || 'Draft'}</span>
      </div>

      <div className="form-page">
        {/* CVC Header */}
        <div className="cvc-header">
          <div className="company-name">Commercial Vehicle Compliance Pty Ltd</div>
          <div className="form-title">VASS Inspection Request</div>
          <div className="email-line">Email to: <strong>Info@cvc.net.au</strong></div>
        </div>

        {/* Section 1: Request Details */}
        <div className="section">
          <div className="section-title">Section 1 — Request Details</div>
          <div className="section-body">
            <div className="row">
              <div className="field">
                <span className="field-label">Date:</span>
                <span className="field-value">{formatDateAU(booking.bookingDate)}</span>
              </div>
              <div className="field" style={{ flex: 2 }}>
                <span className="field-label">Name:</span>
                <span className="field-value">{booking.requestedBy}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">P/O Number:</span>
                <span className="field-value">{booking.poNumber}</span>
              </div>
              <div className="field">
                <span className="field-label">Inspection Date:</span>
                <span className="field-value">{formatDateAU(booking.inspectionDate)}</span>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <span className="field-label">Email Address:</span>
                <span className="field-value">{booking.companyEmail}</span>
              </div>
              <div className="field">
                <span className="field-label">Job Number:</span>
                <span className="field-value">{booking.jobNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Owner Details */}
        <div className="section">
          <div className="section-title">Section 2 — Vehicle Owners Details</div>
          <div className="section-body">
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <span className="field-label">Owners Email:</span>
                <span className="field-value">{booking.ownerEmail}</span>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <span className="field-label">Owners Name:</span>
                <span className="field-value">{booking.ownerName}</span>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 3 }}>
                <span className="field-label">Address:</span>
                <span className="field-value">{booking.ownerAddress}</span>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <span className="field-label">City:</span>
                <span className="field-value">{booking.ownerCity}</span>
              </div>
              <div className="field">
                <span className="field-label">State:</span>
                <span className="field-value">{booking.ownerState}</span>
              </div>
              <div className="field">
                <span className="field-label">Post Code:</span>
                <span className="field-value">{booking.ownerPostcode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Vehicle Details */}
        <div className="section">
          <div className="section-title">Section 3 — Vehicle Details</div>
          <div className="section-body">
            <div className="row">
              <div className="field">
                <span className="field-label">Make:</span>
                <span className="field-value">{booking.vehicleMake}</span>
              </div>
              <div className="field">
                <span className="field-label">Model:</span>
                <span className="field-value">{booking.vehicleModel}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Engine Type & Size:</span>
                <span className="field-value">{booking.engineType}</span>
              </div>
              <div className="field">
                <span className="field-label">Engine #:</span>
                <span className="field-value">{booking.engineNumber}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Rego:</span>
                <span className="field-value">{booking.rego}</span>
              </div>
              <div className="field">
                <span className="field-label">Plate Date:</span>
                <span className="field-value">{booking.compPlateDate}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Odometer:</span>
                <span className="field-value">{booking.odometer}</span>
              </div>
              <div className="field">
                <span className="field-label">No of Seats Including Driver:</span>
                <span className="field-value">{booking.seats}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">GVM:</span>
                <span className="field-value">{booking.gvm}</span>
              </div>
              <div className="field">
                <span className="field-label">GCM:</span>
                <span className="field-value">{booking.gcm}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Front Axle Rating:</span>
                <span className="field-value">{booking.frontAxleRating}</span>
              </div>
              <div className="field">
                <span className="field-label">Rear Axle Rating:</span>
                <span className="field-value">{booking.rearAxleRating}</span>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 3 }}>
                <span className="field-label">VIN Number:</span>
                <span className="field-value mono">{booking.vinNumber}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Front Tyres:</span>
                <span className="field-value">{booking.frontTyreCount}</span>
              </div>
              <div className="field">
                <span className="field-label">Size:</span>
                <span className="field-value">{booking.frontTyreSize}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Rear Tyres:</span>
                <span className="field-value">{booking.rearTyreCount}</span>
              </div>
              <div className="field">
                <span className="field-label">Size:</span>
                <span className="field-value">{booking.rearTyreSize}</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <span className="field-label">Extreme Wheelbase:</span>
                <span className="field-value">{booking.extremeAxleSpacing}</span>
              </div>
              <div className="field">
                <span className="field-label">New Tare Weight:</span>
                <span className="field-value">{booking.newTareWeight}</span>
              </div>
            </div>
          </div>
        </div>

        {/* VASS Modification Codes */}
        {vassCodes.length > 0 && (
          <div className="section">
            <div className="section-title">VASS Modification Codes</div>
            <div className="section-body" style={{ padding: 0 }}>
              <table className="codes-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Code</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {vassCodes.map((c: { code: string; description: string }) => (
                    <tr key={c.code}>
                      <td style={{ fontWeight: 700 }}>{c.code}</td>
                      <td>{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Description of Modification */}
        <div className="section">
          <div className="section-title">Section 4 — Description of Modification</div>
          <div className="mod-box">{booking.modDescription || '\u2014'}</div>
        </div>

        {/* Section 5: Attachments */}
        <div className="section">
          <div className="section-title">Section 5 — Attachments</div>
          <div className="attach-box">
            <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Required attachments:</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              You must add photos of the <strong>VIN Stamp</strong>, <strong>Vehicle Compliance Plate / ID Plate</strong>,{' '}
              <strong>Front</strong>, <strong>Left</strong>, <strong>Right</strong>, <strong>Rear Sides</strong>,{' '}
              <strong>Modification</strong>, <strong>Seat Layout Drawing</strong>, <strong>Purchase Order</strong>,{' '}
              <strong>WeighBridge Docket</strong> and whatever else can be provided.
            </p>
          </div>
        </div>

        {/* Reference Links */}
        <div className="links-bar">
          <span style={{ fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#666' }}>Reference Links:</span>
          <a href="https://www.vicroads.vic.gov.au/registration/limited-registration/vehicle-registration-check" target="_blank" rel="noopener noreferrer">VicRoads Rego Lookup</a>
          <a href="https://www.infrastructure.gov.au/infrastructure-transport-vehicles/vehicles/rvcs" target="_blank" rel="noopener noreferrer">RVCS Lookup</a>
          <a href="https://www.infrastructure.gov.au/infrastructure-transport-vehicles/vehicles/vehicle-safety-research/register-approved-vehicles-rav" target="_blank" rel="noopener noreferrer">RAV Lookup</a>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>YLZ Truck Bodies — CVC eVASS Inspection Request</span>
          <span>Generated: {new Date().toLocaleDateString('en-AU')}</span>
        </div>
      </div>
    </>
  )
}
