import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SYSTEM_PROMPT = `You are a VIN plate reader for Australian trucks and trailers. Extract all visible information from the compliance/VIN plate photo.

Return ONLY a JSON object with these fields (use empty string if not visible):
{
  "vin": "full 17-character VIN",
  "make": "vehicle manufacturer (e.g. Isuzu, Hino, Fuso, UD, Volvo, Kenworth)",
  "model": "model designation (e.g. FVZ 240-300, FD 1124, FM 2628)",
  "engineNumber": "engine serial number",
  "gvm": "Gross Vehicle Mass in kg (numbers only)",
  "gcm": "Gross Combination Mass in kg (numbers only)",
  "frontAxleRating": "front axle rating in kg (numbers only)",
  "rearAxleRating": "rear axle rating in kg (numbers only)",
  "seats": "seating capacity (number only)",
  "tareWeight": "tare/unladen mass in kg (numbers only)",
  "complianceDate": "compliance plate date in YYYY-MM format if visible",
  "manufactureDate": "manufacture date if different from compliance",
  "engineType": "engine model/type if visible"
}

Important:
- GVM is sometimes labelled "Gross Vehicle Mass" or "GVM"
- GCM is sometimes labelled "Gross Combination Mass" or "GCM"
- Axle ratings may be labelled "Front Axle", "Rear Axle", "Axle 1", "Axle 2"
- Extract numbers only for weight fields (no "kg" suffix)
- If multiple rear axles, sum them or use the highest
- Return valid JSON only, no markdown or explanation`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const driveUrl = formData.get('driveUrl') as string | null

    let imageData: string
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      imageData = buffer.toString('base64')
      const mime = file.type || 'image/jpeg'
      mediaType = mime as typeof mediaType
    } else if (driveUrl) {
      // Download from Google Drive via our proxy
      const fileId = driveUrl.replace(/.*\/d\//, '').replace(/\/.*/, '')
      const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/drive-files/${fileId}`)
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to download from Drive' }, { status: 400 })
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      imageData = buffer.toString('base64')
      mediaType = (res.headers.get('content-type') || 'image/jpeg') as typeof mediaType
    } else {
      return NextResponse.json({ error: 'No file or driveUrl provided' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: 'Read this VIN/compliance plate and extract all information. Return JSON only.',
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse VIN plate', raw: text }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('VIN plate OCR error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to read VIN plate' },
      { status: 500 }
    )
  }
}
