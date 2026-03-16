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
