export interface VinPlateConfig {
  variant: string
  makeModel: string
  vta: string
  manufacturer: string
  atm: string
  gtm: string
  fb1: string
  fb2: string
  ss1: string
  ss2: string
  cs1: string
  cs2: string
}

export const VIN_PLATE_LOOKUP: Record<string, VinPlateConfig> = {
  '3-SAF-DISC': { variant: '3008', makeModel: 'YLZ TRUCK BODIES - DT3', vta: '060439', manufacturer: 'YLZ PTY LTD', atm: '26000', gtm: '26000', fb1: '050514 - FB', fb2: '050514 - FB', ss1: '011857 - SS', ss2: '011858 - SS', cs1: '035391 - CS', cs2: '035391 - CS' },
  '3-SAF-DRUM': { variant: '3009', makeModel: 'YLZ TRUCK BODIES - DT3', vta: '060439', manufacturer: 'YLZ PTY LTD', atm: '26000', gtm: '26000', fb1: '046507 - FB', fb2: '046507 - FB', ss1: '011857 - SS', ss2: '011858 - SS', cs1: '035391 - CS', cs2: '035391 - CS' },
  '3-TMC-DISC': { variant: '3002', makeModel: 'YLZ TRUCK BODIES - DT3', vta: 'TBC',    manufacturer: 'YLZ PTY LTD', atm: '26000', gtm: '26000', fb1: '035045 - FB', fb2: '035045 - FB', ss1: '060058 - SS', ss2: '060063 - SS', cs1: '035391 - CS', cs2: '035391 - CS' },
  '3-TMC-DRUM': { variant: '3003', makeModel: 'YLZ TRUCK BODIES - DT3', vta: 'TBC',    manufacturer: 'YLZ PTY LTD', atm: '26000', gtm: '26000', fb1: '028815 - FB', fb2: '028815 - FB', ss1: '060058 - SS', ss2: '060063 - SS', cs1: '035391 - CS', cs2: '035391 - CS' },
  '4-SAF-DISC': { variant: '4007', makeModel: 'YLZ TRUCK BODIES - DT4', vta: '060442', manufacturer: 'YLZ PTY LTD', atm: '35000', gtm: '35000', fb1: '050514 - FB', fb2: '050514 - FB', ss1: '011858 - SS', ss2: '011858 - SS', cs1: '033261 - CS', cs2: '033261 - CS' },
  '4-SAF-DRUM': { variant: '4008', makeModel: 'YLZ TRUCK BODIES - DT4', vta: '060442', manufacturer: 'YLZ PTY LTD', atm: '35000', gtm: '35000', fb1: '046507 - FB', fb2: '046507 - FB', ss1: '011858 - SS', ss2: '011858 - SS', cs1: '033261 - CS', cs2: '033261 - CS' },
  '4-TMC-DISC': { variant: '4006', makeModel: 'YLZ TRUCK BODIES - DT4', vta: '060442', manufacturer: 'YLZ PTY LTD', atm: '35000', gtm: '35000', fb1: '035045 - FB', fb2: '035045 - FB', ss1: '060060 - SS', ss2: '060060 - SS', cs1: '033261 - CS', cs2: '033261 - CS' },
  '4-TMC-DRUM': { variant: '4004', makeModel: 'YLZ TRUCK BODIES - DT4', vta: '060442', manufacturer: 'YLZ PTY LTD', atm: '35000', gtm: '35000', fb1: '028815 - FB', fb2: '028815 - FB', ss1: '060060 - SS', ss2: '060060 - SS', cs1: '033261 - CS', cs2: '033261 - CS' },
  '5-SAF-DISC': { variant: '5003', makeModel: 'YLZ TRUCK BODIES - DT5', vta: '060946', manufacturer: 'YLZ PTY LTD', atm: '40500', gtm: '40500', fb1: '050514 - FB', fb2: '050514 - FB', ss1: '011858 - SS', ss2: '011859 - SS', cs1: '047495 - CS', cs2: '047495 - CS' },
  '5-SAF-DRUM': { variant: '5000', makeModel: 'YLZ TRUCK BODIES - DT5', vta: 'TBC',    manufacturer: 'YLZ PTY LTD', atm: '40500', gtm: '40500', fb1: '046507 - FB', fb2: '046507 - FB', ss1: '011858 - SS', ss2: '011859 - SS', cs1: 'TBC - CS',    cs2: 'TBC - CS'    },
  '6-SAF-DISC': { variant: '6002', makeModel: 'YLZ TRUCK BODIES - DT6', vta: '065654', manufacturer: 'YLZ PTY LTD', atm: '47000', gtm: '47000', fb1: '050514 - FB', fb2: '050514 - FB', ss1: '011859 - SS', ss2: '011859 - SS', cs1: '047497 - CS', cs2: '047497 - CS' },
  '6-SAF-DRUM': { variant: '6000', makeModel: 'YLZ TRUCK BODIES - DT6', vta: 'TBC',    manufacturer: 'YLZ PTY LTD', atm: '45000', gtm: '45000', fb1: '036593 - FB', fb2: '036593 - FB', ss1: '011859 - SS', ss2: '011859 - SS', cs1: '047497 - CS', cs2: '047497 - CS' },
}

/** Normalise axleMake → 'SAF' | 'TMC' */
export function normaliseBrand(axleMake: string): string {
  const m = (axleMake || '').toUpperCase()
  if (m.includes('TMC')) return 'TMC'
  if (m.includes('SAF')) return 'SAF'
  return m
}

/** Normalise axleType → 'DISC' | 'DRUM' */
export function normaliseBrake(axleType: string): string {
  const t = (axleType || '').toUpperCase()
  if (t.includes('DISC')) return 'DISC'
  if (t.includes('DRUM')) return 'DRUM'
  return t
}
