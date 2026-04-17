'use client'

import { createContext, useContext, useEffect } from 'react'

const TestModeContext = createContext(false)

// Routes that should stay prefixed with /test/ when navigating
const TEST_ROUTE_PREFIXES = ['/quotes', '/engineering']

function prefixTestRoute(url: string): string {
  if (url.startsWith('/test/') || url === '/test') return url
  for (const prefix of TEST_ROUTE_PREFIXES) {
    if (url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
      return '/test' + url
    }
  }
  return url
}

export function TestModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ── Patch fetch to inject X-Test-Mode header on all API calls ──
    const origFetch = window.fetch
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const headers: Record<string, string> = {}
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v })
          } else {
            Object.assign(headers, init.headers as Record<string, string>)
          }
        }
        headers['X-Test-Mode'] = 'true'
        init = { ...init, headers }
      }
      return origFetch(input, init)
    }

    // ── Patch history to keep navigation inside /test/ ──
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)

    history.pushState = function (state: unknown, title: string, url?: string | URL | null) {
      if (typeof url === 'string') url = prefixTestRoute(url)
      return origPush(state, title, url)
    }
    history.replaceState = function (state: unknown, title: string, url?: string | URL | null) {
      if (typeof url === 'string') url = prefixTestRoute(url)
      return origReplace(state, title, url)
    }

    return () => {
      window.fetch = origFetch
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  return (
    <TestModeContext.Provider value={true}>
      {children}
    </TestModeContext.Provider>
  )
}

export const useTestMode = () => useContext(TestModeContext)
