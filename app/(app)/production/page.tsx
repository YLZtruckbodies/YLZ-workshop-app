'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductionRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/jobboard')
  }, [router])
  return (
    <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>
      Redirecting to Job Board...
    </div>
  )
}
