export function parseDate(s: string): Date | null {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  let y = parseInt(p[2])
  if (y < 100) y += 2000
  const d = new Date(y, parseInt(p[1]) - 1, parseInt(p[0]))
  return isNaN(d.getTime()) ? null : d
}

export function fmtDate(d: Date | null): string {
  if (!d) return ''
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
}

export function addWorkdays(date: Date, days: number): Date {
  if (!date || isNaN(days) || days < 0) return date
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const w = d.getDay()
    if (w !== 0 && w !== 6) added++
  }
  return d
}

export function nextWorkday(d: Date): Date {
  const n = new Date(d)
  n.setDate(n.getDate() + 1)
  while (n.getDay() === 0 || n.getDay() === 6) {
    n.setDate(n.getDate() + 1)
  }
  return n
}

export function compDate(start: string, days: number): string {
  const s = parseDate(start)
  if (!s) return ''
  return fmtDate(addWorkdays(s, days || 0))
}
