'use client'

import { useState, useRef } from 'react'
import { useNotes, createNote, uploadJobPhoto } from '@/lib/hooks'
import { mutate } from 'swr'

interface Props {
  jobId: string
  jobNum: string
  userId: string
  userName: string
  userColor: string
}

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  holdup: 'Hold-up',
  resolved: 'Resolved',
  photo: 'Photo',
  automation: 'System',
  signoff: 'Sign-off',
}

const TYPE_COLOR: Record<string, string> = {
  note: 'rgba(255,255,255,0.6)',
  holdup: '#f97316',
  resolved: '#22d07a',
  photo: '#3b9de8',
  automation: 'rgba(255,255,255,0.3)',
  signoff: '#a855f7',
}

function timeAgo(date: string | Date) {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function JobActivityFeed({ jobId, jobNum, userId, userName, userColor }: Props) {
  const { data: notes, isLoading } = useNotes({ jobId })
  const [message, setMessage] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'holdup'>('note')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const sorted = Array.isArray(notes)
    ? [...notes].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      await createNote({ jobId, authorId: userId, authorName: userName, type: noteType, message: message.trim() })
      setMessage('')
      mutate(`/api/notes?jobId=${jobId}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadJobPhoto(jobId, file, userId, userName)
      mutate(`/api/notes?jobId=${jobId}`)
    } finally {
      setUploading(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Composer */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['note', 'holdup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setNoteType(t)}
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 3, cursor: 'pointer', border: '1px solid',
                borderColor: noteType === t ? TYPE_COLOR[t] : 'rgba(255,255,255,0.15)',
                background: noteType === t ? `${TYPE_COLOR[t]}22` : 'transparent',
                color: noteType === t ? TYPE_COLOR[t] : 'rgba(255,255,255,0.4)',
                transition: '0.1s',
              }}
            >
              {t === 'holdup' ? '⚠ Hold-up' : '✏ Note'}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder={noteType === 'holdup' ? 'Describe the hold-up...' : 'Add a note...'}
          rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'inherit',
            resize: 'none', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: '7px 16px',
              borderRadius: 4, cursor: 'pointer', border: 'none',
              background: message.trim() ? '#E8681A' : 'rgba(255,255,255,0.1)',
              color: message.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: '0.1s', minHeight: 34,
            }}
          >
            {submitting ? '...' : 'Post'}
          </button>
          <button
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
            title="Attach photo"
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: '7px 14px',
              borderRadius: 4, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', transition: '0.1s', minHeight: 34,
            }}
          >
            {uploading ? '...' : '📷 Photo'}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
            ⌘↵ to post
          </span>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 24 }}>Loading...</div>
        )}
        {!isLoading && sorted.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', padding: 24 }}>No activity yet</div>
        )}
        {sorted.map((note: any) => (
          <div key={note.id} style={{ display: 'flex', gap: 10 }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              background: note.authorId === 'system' ? 'rgba(255,255,255,0.1)' : userColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {note.authorId === 'system' ? '⚙' : (note.authorName?.[0] || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{note.authorName || 'System'}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                  color: TYPE_COLOR[note.type] || 'rgba(255,255,255,0.4)',
                }}>
                  {TYPE_LABEL[note.type] || note.type}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', flexShrink: 0 }}>
                  {timeAgo(note.createdAt)}
                </span>
              </div>
              {note.message && (
                <p style={{ margin: 0, fontSize: 13, color: note.type === 'automation' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                  {note.message}
                </p>
              )}
              {note.photoUrl && (
                <img
                  src={note.photoUrl}
                  alt={note.photoName || 'Photo'}
                  onClick={() => setLightboxUrl(note.photoUrl)}
                  style={{
                    marginTop: 6, maxWidth: '100%', maxHeight: 200, borderRadius: 6,
                    objectFit: 'cover', cursor: 'zoom-in', border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          <img src={lightboxUrl} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}
