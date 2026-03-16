'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface NavItem {
  key: string
  label: string
  icon: string
  href: string
}

const BOARDS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '\uD83D\uDCCA', href: '/dashboard' },
  { key: 'analytics', label: 'Analytics', icon: '\uD83D\uDCC8', href: '/analytics' },
  { key: 'keithschedule', label: "Keith's Schedule", icon: '\uD83D\uDCCB', href: '/keithschedule' },
  { key: 'production', label: 'Production Board', icon: '\uD83C\uDFED', href: '/production' },
]

const TOOLS: NavItem[] = [
  { key: 'floor', label: 'Workshop Floor', icon: '\uD83D\uDD27', href: '/floor' },
  { key: 'timesheet', label: 'Time Logging', icon: '\u23F1', href: '/timesheet' },
  { key: 'jobs', label: 'Jobs List', icon: '\uD83D\uDCD1', href: '/jobs' },
  { key: 'reports', label: 'Reports', icon: '\uD83D\uDCCB', href: '/reports' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const access = session?.user?.access || []

  const filterByAccess = (items: NavItem[]) =>
    items.filter((item) => access.includes(item.key))

  const visibleBoards = filterByAccess(BOARDS)
  const visibleTools = filterByAccess(TOOLS)

  return (
    <nav
      style={{
        width: '220px',
        background: 'var(--dark2)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {/* BOARDS section */}
      {visibleBoards.length > 0 && (
        <>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text3)',
              padding: '8px 18px 6px',
            }}
          >
            Boards
          </div>
          {visibleBoards.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <SidebarItem key={item.key} item={item} active={!!isActive} />
            )
          })}
        </>
      )}

      {/* TOOLS section */}
      {visibleTools.length > 0 && (
        <>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text3)',
              padding: '16px 18px 6px',
            }}
          >
            Tools
          </div>
          {visibleTools.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <SidebarItem key={item.key} item={item} active={!!isActive} />
            )
          })}
        </>
      )}
    </nav>
  )
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 18px',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--text)' : 'var(--text3)',
        textDecoration: 'none',
        borderLeft: active ? '3px solid #fff' : '3px solid transparent',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text2)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text3)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span style={{ fontSize: '14px', lineHeight: 1 }}>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  )
}
