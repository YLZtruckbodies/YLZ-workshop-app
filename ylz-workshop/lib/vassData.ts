// VASS modification codes â sourced from CVC eVASS scheme
export const VASS_CODES: { code: string; description: string }[] = [
  { code: 'A1', description: 'Engine Substitution' },
  { code: 'A2', description: 'Engine Modification' },
  { code: 'B1', description: 'Transmission Substitution' },
  { code: 'B2', description: 'Transmission Modification' },
  { code: 'C1', description: 'Driveline Substitution' },
  { code: 'C2', description: 'Driveline Modification' },
  { code: 'D1', description: 'Steering Substitution' },
  { code: 'D2', description: 'Steering Modification' },
  { code: 'E1', description: 'Suspension Substitution (Front)' },
  { code: 'E2', description: 'Suspension Modification (Front)' },
  { code: 'E3', description: 'Suspension Substitution (Rear)' },
  { code: 'E4', description: 'Suspension Modification (Rear)' },
  { code: 'F1', description: 'Brake Substitution' },
  { code: 'F2', description: 'Brake Modification' },
  { code: 'G1', description: 'Chassis Substitution' },
  { code: 'G2', description: 'Chassis Modification' },
  { code: 'H1', description: 'Wheel & Tyre Modification' },
  { code: 'J1', description: 'Body Mounting' },
  { code: 'J2', description: 'Body Modification' },
  { code: 'J3', description: 'Body Removal' },
  { code: 'K1', description: 'Fuel System Substitution' },
  { code: 'K2', description: 'Fuel System Modification' },
  { code: 'K3', description: 'LPG / CNG Installation' },
  { code: 'L1', description: 'Exhaust System Modification' },
  { code: 'M1', description: 'Electrical System Modification' },
  { code: 'N1', description: 'Coupling / Towbar Installation' },
  { code: 'N2', description: 'Coupling / Towbar Modification' },
  { code: 'N3', description: '5th Wheel Coupling Installation' },
  { code: 'N4', description: '5th Wheel Coupling Modification' },
  { code: 'P1', description: 'Seating / Seatbelt Installation' },
  { code: 'P2', description: 'Seating / Seatbelt Modification' },
  { code: 'Q1', description: 'Rollover Protection Installation' },
  { code: 'Q2', description: 'Rollover Protection Modification' },
  { code: 'R1', description: 'Wheelchair Access Installation' },
  { code: 'R2', description: 'Wheelchair Access Modification' },
  { code: 'S1', description: 'Gross Vehicle Mass Rating Within Manufacturers Specifications' },
  { code: 'S2', description: 'Gross Vehicle Mass Rating Outside Manufacturers Specifications' },
  { code: 'S3', description: 'Gross Combination Mass Rating Modification' },
  { code: 'T1', description: 'Axle Rating Within Manufacturers Specifications' },
  { code: 'T2', description: 'Axle Rating Outside Manufacturers Specifications' },
]

// Default YLZ company details for booking forms
export const YLZ_DEFAULTS = {
  requestedBy: 'Nathan Yarnold',
  companyAddress: '31 Gatwick Rd, Bayswater North VIC 3153',
  companyState: 'VIC',
  companyPostcode: '3153',
  companyEmail: 'nathan@ylztruckbodies.com',
  companyPhone: '03 9720 1038',
}

// Helper: get next Wednesday from a given date
export function getNextWednesday(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()
  const daysUntilWed = (3 - day + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilWed)
  return d.toISOString().split('T')[0]
}

// Helper: format date as DD/MM/YYYY
export function formatDateAU(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
