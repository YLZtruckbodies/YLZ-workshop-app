const MONDAY_API_URL = 'https://api.monday.com/v2'

// Monday.com group title → prodGroup mapping (matched case-insensitively)
const GROUP_PROD_MAP: Record<string, string> = {
  'jobs issued to floor': 'issued',
  'current jobs with go': 'goahead',
}

// Monday.com column title → Job field mapping
const COLUMN_FIELD_MAP: Record<string, string> = {
  'Body/Trailer Type': 'type',
  'Dealer': 'dealer',
  'Customer': 'customer',
  'Truck On Site': 'site',
  'Job Sheet': 'sheet',
  "DWG's": 'dwg',
  'MRP': 'mrp',
  'Parts Ord': 'parts',
  'Parts Order': 'parts',
  'EBS File': 'ebs',
  'Vass process co': 'vass',
  'Notes': 'notes',
  'Truck/Trailer Make & Mo': 'make',
  'Truck/Trailer Make & Model': 'make',
  'PO No. / Invoice No.': 'po',
  'PO No. / Invoice N': 'po',
  'Body Dimensi': 'dims',
  'Body Dimensions': 'dims',
  'VIN': 'vin',
}

export interface MondayItem {
  mondayId: string
  name: string
  prodGroup: string
  fields: Record<string, string>
}

async function mondayQuery(query: string, variables?: Record<string, any>): Promise<any> {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) throw new Error('MONDAY_API_TOKEN not configured in .env')

  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Monday.com API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  if (data.errors?.length) {
    throw new Error(`Monday.com GraphQL error: ${data.errors[0].message}`)
  }
  return data.data
}

export async function fetchBoardMetadata() {
  const boardId = process.env.MONDAY_BOARD_ID || '1905554165'
  const data = await mondayQuery(`
    query {
      boards(ids: [${boardId}]) {
        columns { id title type }
        groups { id title }
      }
    }
  `)
  return data.boards[0]
}

export async function fetchMondayItems(): Promise<MondayItem[]> {
  const boardId = process.env.MONDAY_BOARD_ID || '1905554165'
  const metadata = await fetchBoardMetadata()

  // Build column ID → field name mapping
  const colIdToField: Record<string, string> = {}
  for (const col of metadata.columns) {
    // Try exact match first, then partial match for truncated titles
    const fieldName = COLUMN_FIELD_MAP[col.title] ||
      Object.entries(COLUMN_FIELD_MAP).find(([title]) =>
        col.title.toLowerCase().startsWith(title.toLowerCase())
      )?.[1]
    if (fieldName) {
      colIdToField[col.id] = fieldName
    }
  }

  // Find target group IDs
  const targetGroupIds: string[] = []
  const groupIdToProdGroup: Record<string, string> = {}
  for (const group of metadata.groups) {
    const titleLower = group.title.toLowerCase()
    for (const [pattern, prodGroup] of Object.entries(GROUP_PROD_MAP)) {
      if (titleLower.includes(pattern)) {
        targetGroupIds.push(group.id)
        groupIdToProdGroup[group.id] = prodGroup
        break
      }
    }
  }

  if (targetGroupIds.length === 0) {
    throw new Error('No matching groups found on Monday.com board. Expected "jobs issued to floor" and "CURRENT JOBS With GO"')
  }

  // Fetch items from target groups
  const items: MondayItem[] = []

  for (const groupId of targetGroupIds) {
    let cursor: string | null = null
    let hasMore = true

    while (hasMore) {
      const cursorArg = cursor ? `cursor: "${cursor}"` : ''
      const data = await mondayQuery(`
        query {
          boards(ids: [${boardId}]) {
            groups(ids: ["${groupId}"]) {
              id
              items_page(limit: 100 ${cursorArg ? ', ' + cursorArg : ''}) {
                cursor
                items {
                  id
                  name
                  column_values {
                    id
                    text
                  }
                }
              }
            }
          }
        }
      `)

      const group = data.boards[0].groups[0]
      if (!group) break

      const page = group.items_page
      for (const item of page.items) {
        const fields: Record<string, string> = {}
        for (const cv of item.column_values) {
          const fieldName = colIdToField[cv.id]
          if (fieldName && cv.text) {
            fields[fieldName] = cv.text
          }
        }

        items.push({
          mondayId: item.id,
          name: item.name,
          prodGroup: groupIdToProdGroup[groupId],
          fields,
        })
      }

      cursor = page.cursor
      hasMore = !!cursor && page.items.length === 100
    }
  }

  return items
}

export function normalizeJobNum(name: string): string {
  // "YLZ 1069" → "YLZ1069", trim whitespace
  return name.replace(/\s+/g, '').trim()
}
