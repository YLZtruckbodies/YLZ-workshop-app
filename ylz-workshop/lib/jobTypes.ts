export const STAGES = ['Requires Sales', 'Requires Engineering', 'Ready to Start', 'Fab', 'Paint', 'Fitout', 'QC', 'Dispatch'] as const
export type Stage = (typeof STAGES)[number]

export function nextStage(current: string): string | null {
  const idx = STAGES.indexOf(current as Stage)
  if (idx === -1 || idx === STAGES.length - 1) return null
  return STAGES[idx + 1]
}

export function stageIndex(stage: string): number {
  return STAGES.indexOf(stage as Stage)
}

export function deriveBtype(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('hardox') && t.includes('trailer')) return 'hardox-trailer'
  if (t.includes('hardox')) return 'hardox-body'
  if ((t.includes('alloy') || t.includes('ally')) && t.includes('trailer')) return 'ally-trailer'
  if (t.includes('alloy') || t.includes('ally')) return 'ally-body'
  if (t.includes('wheelbase')) return 'wheelbase'
  if (t.includes('beavertail')) return 'beavertail'
  if (t.includes('repair') || t.includes('warranty')) return 'repairs'
  if (t.includes('tray')) return 'flat-tray'
  if (t.includes('dolly')) return 'dolly'
  if (t.includes('dropside')) return 'dropside'
  if (t.includes('locking bar')) return 'repairs'
  return ''
}

export function stageToBuildProgress(stage: string): { label: string; color: string } {
  switch (stage) {
    case 'Requires Sales':
      return { label: 'Requires Sales', color: '#eab308' }
    case 'Requires Engineering':
      return { label: 'Requires Engineering', color: '#f97316' }
    case 'Ready to Start':
      return { label: 'Ready to Start', color: '#06b6d4' }
    case 'Fab':
      return { label: 'Fabrication', color: '#e84560' }
    case 'Paint':
      return { label: 'Paint', color: '#3b9de8' }
    case 'Fitout':
      return { label: 'Fitout', color: '#f5a623' }
    case 'QC':
      return { label: 'Quality Check', color: '#a855f7' }
    case 'Dispatch':
      return { label: 'Dispatch', color: '#22d07a' }
    default:
      return { label: 'Unknown', color: 'rgba(255,255,255,0.15)' }
  }
}

/**
 * Auto-derive prod group from job stage.
 * - Requires Engineering → goahead (Jobs in Engineering)
 * - Ready to Start through QC → issued (Jobs in Production)
 * - Dispatch → finished
 */
export function deriveProdGroup(stage: string): string {
  switch (stage) {
    case 'Requires Sales':
      return 'pending'
    case 'Requires Engineering':
      return 'goahead'
    case 'Ready to Start':
    case 'Fab':
    case 'Paint':
    case 'Fitout':
    case 'QC':
      return 'issued'
    case 'Dispatch':
      return 'finished'
    default:
      return 'issued'
  }
}

/**
 * Map stage to the section/team that should be notified.
 */
export function stageToNotifyTarget(stage: string): { role: string; section?: string } | null {
  switch (stage) {
    case 'Requires Sales':
      return { role: 'sales' }  // Pete
    case 'Ready to Start':
      return { role: 'scheduler' }  // Keith
    case 'Fab':
      return { role: 'supervisor', section: 'fab' }
    case 'Paint':
      return { role: 'supervisor', section: 'paint' }
    case 'Fitout':
      return { role: 'supervisor', section: 'fitout' }
    case 'QC':
      return { role: 'supervisor', section: 'qc' }  // Matt
    case 'Dispatch':
      return { role: 'accounts' }  // Wendy
    default:
      return null
  }
}

export const PROD_GROUPS = [
  { key: 'issued', label: 'Jobs in Production', color: '#e84560' },
  { key: 'goahead', label: 'Jobs in Engineering', color: '#3b9de8' },
  { key: 'pending', label: 'Jobs Waiting on Sales Team', color: '#f5a623' },
  { key: 'stock', label: 'Stock', color: '#22d07a' },
  { key: 'finished', label: 'Finished / Ready to Invoice', color: '#22d07a' },
] as const
