'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UndoAction {
  label: string
  execute: () => Promise<void> | void
}

interface UndoContextType {
  canUndo: boolean
  undoLabel: string | null
  pushUndo: (action: UndoAction) => void
  undo: () => Promise<void>
  clearUndo: () => void
}

const UndoContext = createContext<UndoContextType>({
  canUndo: false,
  undoLabel: null,
  pushUndo: () => {},
  undo: async () => {},
  clearUndo: () => {},
})

export function UndoProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<UndoAction[]>([])

  const pushUndo = useCallback((action: UndoAction) => {
    setStack((prev) => [...prev, action])
  }, [])

  const undo = useCallback(async () => {
    setStack((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      // Execute undo outside of setState
      Promise.resolve(last.execute()).catch(() => {})
      return prev.slice(0, -1)
    })
  }, [])

  const clearUndo = useCallback(() => {
    setStack([])
  }, [])

  const canUndo = stack.length > 0
  const undoLabel = stack.length > 0 ? stack[stack.length - 1].label : null

  return (
    <UndoContext.Provider value={{ canUndo, undoLabel, pushUndo, undo, clearUndo }}>
      {children}
    </UndoContext.Provider>
  )
}

export function useUndo() {
  return useContext(UndoContext)
}
