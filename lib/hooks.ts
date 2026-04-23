'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useJobs(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return useSWR(`/api/jobs${query}`, fetcher, { refreshInterval: 30000 })
}

export function useWorkers() {
  return useSWR('/api/workers', fetcher, { refreshInterval: 30000 })
}

export function useTimesheets(date?: string) {
  const query = date ? `?date=${date}` : ''
  return useSWR(`/api/timesheets${query}`, fetcher, { refreshInterval: 30000 })
}

export function useUsers() {
  return useSWR('/api/users', fetcher, { refreshInterval: 60000 })
}

export function useTarps() {
  return useSWR('/api/tarps', fetcher, { refreshInterval: 30000 })
}

export async function advanceJob(jobId: string): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/advance`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to advance job')
  return res.json()
}

export async function createJob(data: any): Promise<any> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create job')
  return res.json()
}

export async function reorderJobs(items: { id: string; sortOrder: number; prodGroup?: string }[]): Promise<any> {
  const res = await fetch('/api/jobs/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Failed to reorder jobs')
  return res.json()
}

export async function updateJob(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update job')
  return res.json()
}

export async function addWorkerJob(workerId: string, data: any): Promise<any> {
  const res = await fetch(`/api/workers/${workerId}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add worker job')
  return res.json()
}

export async function updateWorkerJobs(workerId: string, jobs: any[]): Promise<any> {
  const res = await fetch(`/api/workers/${workerId}/jobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobs }),
  })
  if (!res.ok) throw new Error('Failed to update worker jobs')
  return res.json()
}

export async function deleteWorkerJob(workerId: string, jobId: string): Promise<any> {
  const res = await fetch(`/api/workers/${workerId}/jobs?jobId=${jobId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete worker job')
  return res.json()
}

export async function submitTimesheet(data: any): Promise<any> {
  const res = await fetch('/api/timesheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit timesheet')
  return res.json()
}

export function useNotes(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return useSWR(`/api/notes${query}`, fetcher, { refreshInterval: 15000 })
}

export async function createNote(data: {
  jobId: string
  authorId: string
  authorName: string
  type: string
  message: string
}): Promise<any> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create note')
  return res.json()
}

export async function deleteNote(noteId: string): Promise<void> {
  const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch {}
    throw new Error(`Failed to delete note (${res.status})${detail ? ': ' + detail.slice(0, 200) : ''}`)
  }
}

export async function exportTimesheets(date?: string): Promise<Blob> {
  const res = await fetch('/api/timesheets/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })
  if (!res.ok) throw new Error('Failed to export')
  return res.blob()
}

export function useFiles(jobId?: string) {
  const query = jobId ? `?jobId=${jobId}` : ''
  return useSWR(jobId ? `/api/files${query}` : null, fetcher, { refreshInterval: 30000 })
}

export function useAllFiles() {
  return useSWR('/api/files', fetcher, { refreshInterval: 30000 })
}

export function useWorkOrder(jobId: string | null) {
  return useSWR(
    jobId ? `/api/work-orders?jobId=${jobId}` : null,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  )
}

export async function approveWorkOrder(orderId: string, approvedBy: string): Promise<any> {
  const res = await fetch(`/api/work-orders/${orderId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  })
  if (!res.ok) throw new Error('Failed to approve work order')
  return res.json()
}

export async function updateWorkOrderPart(orderId: string, partId: string, data: Record<string, unknown>): Promise<any> {
  const res = await fetch(`/api/work-orders/${orderId}/parts/${partId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update part')
  return res.json()
}

export function useDriveFiles(jobNum: string | null) {
  return useSWR(
    jobNum ? `/api/drive-files?jobNum=${encodeURIComponent(jobNum)}` : null,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  )
}

export async function uploadFile(jobId: string, file: File, uploadedBy: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('jobId', jobId)
  formData.append('uploadedBy', uploadedBy)

  const res = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to upload file')
  return res.json()
}

export async function deleteFile(fileId: string): Promise<any> {
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete file')
  return res.json()
}

// Repair Jobs hooks
export function useRepairJobs(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return useSWR(`/api/repairs${query}`, fetcher, { refreshInterval: 30000 })
}

export async function createRepairJob(data: any): Promise<any> {
  const res = await fetch('/api/repairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create repair job')
  return res.json()
}

export async function updateRepairJob(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/repairs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update repair job')
  return res.json()
}

export async function deleteRepairJob(id: string): Promise<any> {
  const res = await fetch(`/api/repairs/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete repair job')
  return res.json()
}

// Cashflow Deliveries hooks
export function useDeliveries() {
  return useSWR('/api/deliveries', fetcher, { refreshInterval: 30000 })
}

export async function createDelivery(data: any): Promise<any> {
  const res = await fetch('/api/deliveries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create delivery')
  return res.json()
}

export async function updateDelivery(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/deliveries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update delivery')
  return res.json()
}

export async function deleteDelivery(id: string): Promise<any> {
  const res = await fetch(`/api/deliveries/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete delivery')
  return res.json()
}

// Monday.com sync
export async function syncFromMonday(): Promise<any> {
  const res = await fetch('/api/monday/sync', { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Sync failed')
  }
  return res.json()
}

// Google Sheets sync
export async function populateKeithSchedule(): Promise<any> {
  const res = await fetch('/api/keith/populate', { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Populate failed')
  }
  return res.json()
}

export async function syncFromSheets(workerId?: string): Promise<any> {
  const res = await fetch('/api/sheets/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerId ? { workerId } : {}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Sheets sync failed')
  }
  return res.json()
}

export function useSyncLogs() {
  return useSWR('/api/sheets/sync', fetcher, { refreshInterval: 30000 })
}

// ── Activity Log ──
export function useJobActivity(jobId: string | null) {
  return useSWR(jobId ? `/api/jobs/${jobId}/activity` : null, fetcher, { refreshInterval: 15000 })
}

// ── Job Tasks ──
export function useJobTasks(jobId: string | null) {
  return useSWR(jobId ? `/api/jobs/${jobId}/tasks` : null, fetcher, { refreshInterval: 10000 })
}

export async function createJobTask(jobId: string, data: { title: string; assignedTo?: string; dueDate?: string }): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create task')
  return res.json()
}

export async function updateJobTask(jobId: string, taskId: string, data: any): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}

export async function deleteJobTask(jobId: string, taskId: string): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/tasks/${taskId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete task')
  return res.json()
}

// ── Notifications ──
export function useNotifications(userId: string | null, unreadOnly = false) {
  const query = new URLSearchParams()
  if (userId) query.set('userId', userId)
  if (unreadOnly) query.set('unreadOnly', 'true')
  return useSWR(userId ? `/api/notifications?${query}` : null, fetcher, { refreshInterval: 15000 })
}

export async function markNotificationRead(id: string): Promise<any> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ read: true }),
  })
  if (!res.ok) throw new Error('Failed to mark notification read')
  return res.json()
}

export async function markAllNotificationsRead(userId: string): Promise<any> {
  const res = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Failed to mark all read')
  return res.json()
}

export async function createNotification(data: { userId: string; jobId?: string; jobNum?: string; type: string; message: string }): Promise<any> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create notification')
  return res.json()
}

// ── Job Dependencies ──
export function useJobDependencies(jobId: string | null) {
  return useSWR(jobId ? `/api/jobs/${jobId}/dependencies` : null, fetcher, { refreshInterval: 30000 })
}

export async function createJobDependency(jobId: string, blockedById: string): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockedById }),
  })
  if (!res.ok) throw new Error('Failed to create dependency')
  return res.json()
}

export async function removeJobDependency(jobId: string, blockedById: string): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/dependencies?blockedById=${encodeURIComponent(blockedById)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove dependency')
  return res.json()
}

// Coldform hooks
export function useColdformKits() {
  return useSWR('/api/coldform/kits', fetcher, { refreshInterval: 30000 })
}

export function useColdformChassis() {
  return useSWR('/api/coldform/chassis', fetcher, { refreshInterval: 30000 })
}

export function useColdformDeliveries() {
  return useSWR('/api/coldform/deliveries', fetcher, { refreshInterval: 30000 })
}

export async function createColdformKit(data: any): Promise<any> {
  const res = await fetch('/api/coldform/kits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create kit')
  return res.json()
}

export async function updateColdformKit(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/coldform/kits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update kit')
  return res.json()
}

export async function deleteColdformKit(id: string): Promise<any> {
  const res = await fetch(`/api/coldform/kits/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete kit')
  return res.json()
}

export async function createColdformChassis(data: any): Promise<any> {
  const res = await fetch('/api/coldform/chassis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create chassis')
  return res.json()
}

export async function updateColdformChassis(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/coldform/chassis/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update chassis')
  return res.json()
}

export async function deleteColdformChassis(id: string): Promise<any> {
  const res = await fetch(`/api/coldform/chassis/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete chassis')
  return res.json()
}

export async function createColdformDelivery(data: any): Promise<any> {
  const res = await fetch('/api/coldform/deliveries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create delivery')
  return res.json()
}

export async function updateColdformDelivery(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/coldform/deliveries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update delivery')
  return res.json()
}

export async function deleteColdformDelivery(id: string): Promise<any> {
  const res = await fetch(`/api/coldform/deliveries/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete delivery')
  return res.json()
}

// ── Kanban stage move ──
export async function moveJobStage(jobId: string, stage: string, userId = '', userName = ''): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, userId, userName }),
  })
  if (!res.ok) throw new Error('Failed to move job stage')
  return res.json()
}

// ── Image compression (client-side) ──
// Resizes a File to fit within maxEdge pixels on its longest side and re-encodes as JPEG.
// Keeps photos small enough to store as base64 data URLs in Postgres without blowing the row size.
export async function compressImageToDataUrl(file: File, maxEdge = 1600, quality = 0.75): Promise<string> {
  if (typeof window === 'undefined') throw new Error('compressImageToDataUrl must run in the browser')
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Could not read ${file.name} — unsupported format (try JPG or PNG).`))
      image.src = objectUrl
    })
    if (!img.width || !img.height) throw new Error(`Invalid image ${file.name}`)
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported in this browser')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// ── Job photo upload ──
export async function uploadJobPhoto(jobId: string, file: File, authorId: string, authorName: string, caption = '', noteType = 'photo'): Promise<any> {
  const dataUrl = await compressImageToDataUrl(file)
  const formData = new FormData()
  formData.append('dataUrl', dataUrl)
  formData.append('filename', file.name)
  formData.append('authorId', authorId)
  formData.append('authorName', authorName)
  formData.append('caption', caption)
  formData.append('noteType', noteType)
  const res = await fetch(`/api/jobs/${jobId}/photos`, { method: 'POST', body: formData })
  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch {}
    throw new Error(`Failed to upload photo (${res.status})${detail ? ': ' + detail.slice(0, 200) : ''}`)
  }
  return res.json()
}

// ── Checklist ──
export function useJobChecklist(jobId: string | null, stage: string | null) {
  return useSWR(
    jobId && stage ? `/api/jobs/${jobId}/checklist?stage=${encodeURIComponent(stage)}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )
}

export async function updateChecklistItem(jobId: string, templateId: string, checked: boolean, checkedBy: string): Promise<any> {
  const res = await fetch(`/api/jobs/${jobId}/checklist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, checked, checkedBy }),
  })
  if (!res.ok) throw new Error('Failed to update checklist')
  return res.json()
}

export function useChecklistTemplates(stage?: string) {
  const query = stage ? `?stage=${encodeURIComponent(stage)}` : ''
  return useSWR(`/api/checklist-templates${query}`, fetcher, { refreshInterval: 60000 })
}

// ── Delivery sign-offs ──
export function useSignoffs(jobId: string | null) {
  return useSWR(jobId ? `/api/signoffs?jobId=${jobId}` : null, fetcher, { refreshInterval: 30000 })
}

export async function createSignoff(data: {
  jobId: string
  signedBy: string
  signerRole: string
  signatureDataUrl: string
  driverName?: string
  notes?: string
}): Promise<any> {
  const res = await fetch('/api/signoffs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create signoff')
  return res.json()
}
