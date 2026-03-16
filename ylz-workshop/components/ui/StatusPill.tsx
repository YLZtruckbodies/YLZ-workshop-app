'use client'

import React from 'react'

interface StatusPillProps {
  label: string
  size?: 'sm' | 'md'
}

function getStatusColor(label: string): { color: string; bg: string } {
  const l = label.trim()
  const lower = l.toLowerCase()

  // Green statuses
  if (['arrived', 'yes', 'completed', 'received'].includes(lower)) {
    return { color: '#22d07a', bg: 'rgba(34,208,122,0.1)' }
  }

  // Blue statuses
  if (['issued', 'waiting', 'ordered'].includes(lower)) {
    return { color: '#3b9de8', bg: 'rgba(59,157,232,0.1)' }
  }

  // Amber statuses (was orange)
  if (['in progress', 'finished'].includes(lower)) {
    return { color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
  }

  // Red statuses
  if (['no', 'not started', 'to be done', 'to start'].includes(lower)) {
    return { color: '#e84560', bg: 'rgba(232,69,96,0.1)' }
  }

  // Grey / default
  return { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' }
}

export default function StatusPill({ label, size = 'sm' }: StatusPillProps) {
  const { color, bg } = getStatusColor(label)
  const fontSize = size === 'sm' ? '9px' : '10px'

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '2px',
        fontSize,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        lineHeight: '16px',
        color,
        backgroundColor: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {label || 'N/A'}
    </span>
  )
}
