import { NextRequest, NextResponse } from 'next/server'
import { listJobDriveFiles } from '@/lib/drive'

/**
 * GET /api/drive-files?jobNum=YLZ 1067
 * Lists all files from the Google Drive "Job Sheets" folder
 * that matches the given job number.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobNum = searchParams.get('jobNum')

  if (!jobNum) {
    return NextResponse.json(
      { error: 'jobNum query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const files = await listJobDriveFiles(jobNum)
    return NextResponse.json(files)
  } catch (error: any) {
    console.error('Drive files error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Drive files' },
      { status: 500 }
    )
  }
}
