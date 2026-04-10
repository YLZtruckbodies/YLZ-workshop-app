// VASS modification codes — VSB 6 Vehicle Assessment Signatory Scheme
export const VASS_CODES: { code: string; description: string }[] = [
  { code: 'A1', description: 'Engine Substitution' },
  { code: 'A2', description: 'Air Cleaner Substitution or Additional Fitment' },
  { code: 'A3', description: 'Turbocharger Installation' },
  { code: 'A4', description: 'Exhaust System Alterations' },
  { code: 'A5', description: 'Road Speed Limiter Installation' },
  { code: 'B1', description: 'Transmission Substitution or Additional Fitment' },
  { code: 'C1', description: 'Tailshaft Alterations' },
  { code: 'D1', description: 'Rear Axle/s Installation' },
  { code: 'D2', description: 'Differential Substitution' },
  { code: 'E1', description: 'Front Axle Installation' },
  { code: 'E2', description: 'Steering System Alteration' },
  { code: 'F1', description: 'Suspension Substitution' },
  { code: 'F2', description: 'Trailer Suspension Modification' },
  { code: 'G1', description: 'Air Brake System — Repositioning of Controls, Valves and Pipe work' },
  { code: 'G2', description: 'Fitting of Trailer Brake Connections and Controls on Prime Movers' },
  { code: 'G3', description: 'Trailer Brake System Upgrading' },
  { code: 'G4', description: 'Brake System Certification' },
  { code: 'G5', description: 'Auxiliary Brake Installation' },
  { code: 'G6', description: 'Air Operated Accessories' },
  { code: 'G7', description: 'Brake System Substitution' },
  { code: 'G8', description: 'Trailer Brake System Upgrade — Non-standard Trailers' },
  { code: 'H1', description: 'Wheelbase Extension Greater than 1st Manufacturer\'s Option' },
  { code: 'H2', description: 'Wheelbase Reduction Less Than 1st Manufacturer\'s Option' },
  { code: 'H3', description: 'Wheelbase Extension or Reduction Within 1st Manufacturer\'s Option' },
  { code: 'H4', description: 'Chassis Frame Alteration' },
  { code: 'H5', description: 'Trailer Chassis Frame Modification' },
  { code: 'J1', description: 'Body Mounting' },
  { code: 'K1', description: 'Seating Capacity Alterations and Seat Belt Alteration' },
  { code: 'K2', description: 'Seat Anchorage Certification and Seat Belt Anchorage Certification' },
  { code: 'K3', description: 'Cabin Conversion' },
  { code: 'K5', description: 'Wheelchair Restraint Installation' },
  { code: 'K6', description: 'Child Restraint Installation' },
  { code: 'M1', description: 'Fuel Tank Re-positioning or Additional Fitting' },
  { code: 'P1', description: 'Tow Coupling Installation — Vehicle greater than 4.5 tonne GVM' },
  { code: 'P2', description: 'Fifth Wheel and King Pin Installation' },
  { code: 'Q1', description: 'Installation of Truck Mounted Lifting Systems — Slewing' },
  { code: 'R1', description: 'Goods Loading Device Installation' },
  { code: 'R2', description: 'Wheelchair Loader Installation' },
  { code: 'S1', description: 'Gross Vehicle Mass Rating Within Manufacturers Specifications' },
  { code: 'S2', description: 'Gross Vehicle Mass Rating for Non-Standard Vehicles' },
  { code: 'S3', description: 'Gross Combination Mass Rating' },
  { code: 'S4', description: 'Rigid Omnibus Mass Rating' },
  { code: 'S5', description: 'Articulated Omnibus Mass Rating' },
  { code: 'S7', description: 'Trailer Rating' },
  { code: 'S8', description: 'Road Train Prime Mover Rating' },
  { code: 'S9', description: 'B-Double Rating' },
  { code: 'S11', description: 'Road Train Trailer Rating' },
  { code: 'S12', description: 'Aggregate Trailer Mass Rating — Certification of Non-Standard Trailers' },
  { code: 'T1', description: 'Construction of Tow Trucks' },
  { code: 'T2', description: 'Design of Tow Trucks' },
]

// Vehicle categories
export const VEHICLE_CATEGORIES = [
  { code: 'NA', description: 'Light commercial vehicles under 3.5 tonne rating' },
  { code: 'NB1', description: 'Vehicles above 3.5 and below 4.5 tonne rating' },
  { code: 'NB2', description: 'Vehicles above 4.5 and below 12 tonne rating' },
  { code: 'NC', description: 'Vehicles above 12 tonne rating' },
  { code: 'TD', description: 'Trailers above 4.5 tonne rating' },
]

// Default YLZ company details for booking forms
export const YLZ_DEFAULTS = {
  requestedBy: 'Nathan Whiles',
  companyName: 'YLZ Truck Bodies Pty Ltd',
  companyAddress: '29 Southeast Boulevard, Pakenham VIC 3810',
  companyState: 'VIC',
  companyPostcode: '3810',
  companyEmail: 'admin@ylztruckbodies.com.au',
  companyPhone: '03 5940 7620',
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
