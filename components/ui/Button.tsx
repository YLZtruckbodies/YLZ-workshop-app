'use client'

import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const baseStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  borderRadius: '3px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  whiteSpace: 'nowrap',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className,
  type = 'button',
}: ButtonProps) {
  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { minHeight: '32px', padding: '6px 14px' }
      : { minHeight: '44px', padding: '10px 20px' }

  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--btn-primary)',
          color: '#f7f7f7',
          border: '1.5px solid rgba(255,255,255,0.12)',
        }
      case 'secondary':
        return {
          background: 'transparent',
          color: 'var(--text2)',
          border: '1.5px solid var(--border2)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text3)',
          border: '1.5px solid transparent',
        }
      default:
        return {}
    }
  })()

  const disabledStyle: React.CSSProperties = disabled
    ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }
    : {}

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const el = e.currentTarget
    switch (variant) {
      case 'primary':
        el.style.background = 'var(--btn-primary-hover)'
        el.style.borderColor = 'rgba(255,255,255,0.2)'
        break
      case 'secondary':
        el.style.borderColor = '#fff'
        el.style.color = '#fff'
        break
      case 'ghost':
        el.style.color = '#fff'
        break
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const el = e.currentTarget
    switch (variant) {
      case 'primary':
        el.style.background = 'var(--btn-primary)'
        el.style.borderColor = 'rgba(255,255,255,0.12)'
        break
      case 'secondary':
        el.style.borderColor = 'var(--border2)'
        el.style.color = 'var(--text2)'
        break
      case 'ghost':
        el.style.color = 'var(--text3)'
        break
    }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...baseStyle, ...sizeStyle, ...variantStyle, ...disabledStyle }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  )
}
