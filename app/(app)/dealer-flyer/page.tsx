'use client'

import { useEffect } from 'react'

export default function DealerFlyerPage() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        .app-topbar, .app-sidebar, .app-reorder-btn { display: none !important; }
        body, html { overflow: visible !important; height: auto !important; }
        iframe { position: fixed !important; top: 0; left: 0; width: 100vw !important; height: auto !important; min-height: 100vh; overflow: visible !important; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  return (
    <iframe
      src="/dealer-flyer-generator.html"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      title="Dealer Flyer Generator"
    />
  )
}
