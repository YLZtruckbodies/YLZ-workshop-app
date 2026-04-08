import * as JSZip from 'jszip'

// ─── TEBS configuration data per axle/brand/brake combination ───

interface TEBSConfig {
  brakeSarn: string
  frontAxles: string
  rearAxles: string
  teeth1: string
  teeth2: string
  suspSarnF: string
  suspSarnR: string
  suspMakeF: string
  suspMakeR: string
  suspModelF: string
  suspModelR: string
  rideHeightF: string
  rideHeightR: string
  airbagF: string
  airbagR: string
  axleSarnF: string
  axleSarnR: string
  axleMakeF: string
  axleMakeR: string
  axleModelF: string
  axleModelR: string
  tyreF: string
  tyreR: string
  boosterBrand: string[]
  boosterSize: string[]
  sal: string[]
  utmF: string
  ladenF: string
  utmR: string
  ladenR: string
  sensors: {
    cd: number[]
    ef: number[]
    mod: number[]
    lift: number[]
    steer: number[]
  }
  features: string
}

const TEBS_DATA: Record<string, TEBSConfig> = {
  '3-SAF-DISC': {
    brakeSarn: '35391 CS', frontAxles: '1', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011857', suspSarnR: '011858',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADISC', suspModelR: 'INTRADISC',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '050514', axleSarnR: '050514',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SBS-2220', axleModelR: 'SBS-2220',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','','',''],
    boosterSize: ['22','12/16','12/16','','',''],
    sal: ['88','88','88','','',''],
    utmF: '1', ladenF: '8', utmR: '2', ladenR: '18',
    sensors: {
      cd: [0,0,1,0,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,0,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '3-SAF-DRUM': {
    brakeSarn: '35391 CS', frontAxles: '1', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011857', suspSarnR: '011858',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADRUM', suspModelR: 'INTRADRUM',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '046507', axleSarnR: '046507',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SNK-4218', axleModelR: 'SNK-4218',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','','',''],
    boosterSize: ['30','24/30','24/30','','',''],
    sal: ['127','127','127','','',''],
    utmF: '1', ladenF: '8', utmR: '2', ladenR: '18',
    sensors: {
      cd: [0,0,1,0,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,0,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '3-TMC-DISC': {
    brakeSarn: '35391 CS', frontAxles: '1', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '060058', suspSarnR: '060063',
    suspMakeF: 'TMC', suspMakeR: 'TMC',
    suspModelF: 'SINGLE MECH', suspModelR: 'TANDEM MECH',
    rideHeightF: '-', rideHeightR: '-',
    airbagF: 'N/A', airbagR: 'N/A',
    axleSarnF: '035045', axleSarnR: '035045',
    axleMakeF: 'TMC', axleMakeR: 'TMC',
    axleModelF: 'PFRD-U90', axleModelR: 'PFRD-U90',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['BPW','BPW','BPW','','',''],
    boosterSize: ['16','14/24','14/24','','',''],
    sal: ['69','69','69','','',''],
    utmF: '1', ladenF: '8', utmR: '2', ladenR: '18',
    sensors: {
      cd: [0,0,1,0,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,0,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '3-TMC-DRUM': {
    brakeSarn: '35391 CS', frontAxles: '1', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '060058', suspSarnR: '060063',
    suspMakeF: 'TMC', suspMakeR: 'TMC',
    suspModelF: 'SINGLE MECH', suspModelR: 'TANDEM MECH',
    rideHeightF: '-', rideHeightR: '-',
    airbagF: 'N/A', airbagR: 'N/A',
    axleSarnF: '028815', axleSarnR: '028815',
    axleMakeF: 'TMC', axleMakeR: 'TMC',
    axleModelF: 'PFRD-225', axleModelR: 'PFRD-225',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['BPW','BPW','BPW','','',''],
    boosterSize: ['24','20/24','20/24','','',''],
    sal: ['152','152','152','','',''],
    utmF: '1', ladenF: '8', utmR: '2', ladenR: '18',
    sensors: {
      cd: [0,0,1,0,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,0,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '4-SAF-DISC': {
    brakeSarn: '33261 CS', frontAxles: '2', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011858', suspSarnR: '011858',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADISC', suspModelR: 'INTRADISC',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '050514', axleSarnR: '050514',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SBS-2220', axleModelR: 'SBS-2220',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','',''],
    boosterSize: ['22','22','12/16','12/16','',''],
    sal: ['88','88','88','88','',''],
    utmF: '2.5', ladenF: '17.5', utmR: '2.5', ladenR: '17.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,1,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '4-SAF-DRUM': {
    brakeSarn: '33261 CS', frontAxles: '2', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011858', suspSarnR: '011858',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADRUM', suspModelR: 'INTRADRUM',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '046507', axleSarnR: '046507',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SNK-4218', axleModelR: 'SNK-4218',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','',''],
    boosterSize: ['30','30/30','24/30','24/30','',''],
    sal: ['152','152','127','127','',''],
    utmF: '2.5', ladenF: '17.5', utmR: '2.5', ladenR: '17.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,1,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '4-TMC-DISC': {
    brakeSarn: '33261 CS', frontAxles: '2', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '060060', suspSarnR: '060060',
    suspMakeF: 'TMC', suspMakeR: 'TMC',
    suspModelF: 'TANDEM AIR', suspModelR: 'TANDEM AIR',
    rideHeightF: '-', rideHeightR: '-',
    airbagF: 'N/A', airbagR: 'N/A',
    axleSarnF: '035045', axleSarnR: '035045',
    axleMakeF: 'TMC', axleMakeR: 'TMC',
    axleModelF: 'PFRD-U90', axleModelR: 'PFRD-U90',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['BPW','BPW','BPW','BPW','',''],
    boosterSize: ['30','30','24/30','24/30','',''],
    sal: ['127','127','127','127','',''],
    utmF: '3', ladenF: '17.5', utmR: '2', ladenR: '17.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,1,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '4-TMC-DRUM': {
    brakeSarn: '33261 CS', frontAxles: '2', rearAxles: '2',
    teeth1: '100', teeth2: '100',
    suspSarnF: '060060', suspSarnR: '060060',
    suspMakeF: 'TMC', suspMakeR: 'TMC',
    suspModelF: 'TANDEM AIR', suspModelR: 'TANDEM AIR',
    rideHeightF: '-', rideHeightR: '-',
    airbagF: 'N/A', airbagR: 'N/A',
    axleSarnF: '035045', axleSarnR: '035045',
    axleMakeF: 'TMC', axleMakeR: 'TMC',
    axleModelF: 'PFRD-U90', axleModelR: 'PFRD-U90',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['BPW','BPW','BPW','BPW','',''],
    boosterSize: ['18','18/24','14/24','14/24','',''],
    sal: ['69','69','69','69','',''],
    utmF: '3', ladenF: '17.5', utmR: '2', ladenR: '17.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,1,1,0,0,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '5-SAF-DISC': {
    brakeSarn: '47495 CS', frontAxles: '2', rearAxles: '3',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011858', suspSarnR: '011859',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADISC', suspModelR: 'INTRADISC',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '050514', axleSarnR: '050514',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SBS-2220', axleModelR: 'SBS-2220',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','SAF',''],
    boosterSize: ['24','24','12/16','12/16','12/16',''],
    sal: ['88','88','88','88','88',''],
    utmF: '3', ladenF: '17', utmR: '3', ladenR: '23.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,0,1,0,1,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '5-SAF-DRUM': {
    brakeSarn: '47495 CS', frontAxles: '2', rearAxles: '3',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011858', suspSarnR: '011859',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADRUM', suspModelR: 'INTRADRUM',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '046507', axleSarnR: '046507',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SNK-4218', axleModelR: 'SNK-4218',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','SAF',''],
    boosterSize: ['24','24','20/24','20/24','20/24',''],
    sal: ['178','178','152','152','152',''],
    utmF: '2', ladenF: '17', utmR: '3', ladenR: '23.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,0,1,0,1,0], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '6-SAF-DISC': {
    brakeSarn: '47497 CS', frontAxles: '3', rearAxles: '3',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011859', suspSarnR: '011859',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADISC', suspModelR: 'INTRADISC',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '050514', axleSarnR: '050514',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'SBS-2220', axleModelR: 'SBS-2220',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','SAF','SAF'],
    boosterSize: ['22','22','22','12/16','12/16','12/16'],
    sal: ['88','88','88','88','88','88'],
    utmF: '4', ladenF: '23.5', utmR: '3', ladenR: '22.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,0,1,0,0,1], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
  '6-SAF-DRUM': {
    brakeSarn: '47497 CS', frontAxles: '3', rearAxles: '3',
    teeth1: '100', teeth2: '100',
    suspSarnF: '011859', suspSarnR: '011859',
    suspMakeF: 'SAF', suspMakeR: 'SAF',
    suspModelF: 'INTRADRUM', suspModelR: 'INTRADRUM',
    rideHeightF: '370mm', rideHeightR: '370mm',
    airbagF: '350mm', airbagR: '350mm',
    axleSarnF: '036593', axleSarnR: '036593',
    axleMakeF: 'SAF', axleMakeR: 'SAF',
    axleModelF: 'K1202', axleModelR: 'K1202',
    tyreF: '11R22.5', tyreR: '11R22.5',
    boosterBrand: ['SAF','SAF','SAF','SAF','SAF','SAF'],
    boosterSize: ['30','30','30/30','24/30','24/30','24/30'],
    sal: ['127','127','127','127','127','127'],
    utmF: '4', ladenF: '22.5', utmR: '3', ladenR: '22.5',
    sensors: {
      cd: [0,0,0,1,0,0], ef: [1,0,0,0,0,0], mod: [1,0,0,0,0,0],
      lift: [0,0,1,0,0,1], steer: [0,0,0,0,0,0]
    },
    features: 'Front pressure sensor, Lift Up Axle (GIO2), Hardox body'
  },
}

// ─── Public interface ───

export interface TEBSInput {
  axleCount: number | string
  axleMake: string   // 'SAF' | 'TMC'
  axleType: string   // 'Disc' | 'Drum'
  vin?: string
  jobNumber?: string
}

export function getTEBSKey(input: TEBSInput): string | null {
  const count = typeof input.axleCount === 'string' ? parseInt(input.axleCount, 10) : input.axleCount
  if (isNaN(count) || count < 3) return null
  const brand = input.axleMake?.toUpperCase()
  const brake = input.axleType?.toUpperCase()
  if (!brand || !brake) return null
  const key = `${count}-${brand}-${brake}`
  return TEBS_DATA[key] ? key : null
}

export function hasTEBSData(input: TEBSInput): boolean {
  return getTEBSKey(input) !== null
}

export async function generateTEBSDocx(input: TEBSInput): Promise<Blob | null> {
  const key = getTEBSKey(input)
  if (!key) return null

  const tebs = TEBS_DATA[key]

  // Fetch the DOCX template
  const templateRes = await fetch('/tebs-template.docx')
  if (!templateRes.ok) return null
  const templateBuf = await templateRes.arrayBuffer()

  const zip = await JSZip.loadAsync(templateBuf)
  const docFile = zip.file('word/document.xml')
  if (!docFile) return null
  let docXml = await docFile.async('string')

  const replacements: Record<string, string> = {
    '{{BRAKE_SARN}}': tebs.brakeSarn,
    '{{FRONT_AXLE_COUNT}}': tebs.frontAxles,
    '{{REAR_AXLE_COUNT}}': tebs.rearAxles,
    '{{TEETH_1}}': tebs.teeth1,
    '{{TEETH_2}}': tebs.teeth2,
    '{{SUSP_SARN_F}}': tebs.suspSarnF,
    '{{SUSP_SARN_R}}': tebs.suspSarnR,
    '{{SUSP_MAKE_F}}': tebs.suspMakeF,
    '{{SUSP_MAKE_R}}': tebs.suspMakeR,
    '{{SUSP_MODEL_F}}': tebs.suspModelF,
    '{{SUSP_MODEL_R}}': tebs.suspModelR,
    '{{RIDE_HEIGHT_F}}': tebs.rideHeightF,
    '{{RIDE_HEIGHT_R}}': tebs.rideHeightR,
    '{{AIRBAG_F}}': tebs.airbagF,
    '{{AIRBAG_R}}': tebs.airbagR,
    '{{AXLE_SARN_F}}': tebs.axleSarnF,
    '{{AXLE_SARN_R}}': tebs.axleSarnR,
    '{{AXLE_MAKE_F}}': tebs.axleMakeF,
    '{{AXLE_MAKE_R}}': tebs.axleMakeR,
    '{{AXLE_MODEL_F}}': tebs.axleModelF,
    '{{AXLE_MODEL_R}}': tebs.axleModelR,
    '{{TYRE_F}}': tebs.tyreF,
    '{{TYRE_R}}': tebs.tyreR,
    '{{MFR_NAME}}': 'YLZ Truck Bodies',
    '{{FEATURES}}': tebs.features,
    '{{UTM_F}}': tebs.utmF,
    '{{LADEN_F}}': tebs.ladenF,
    '{{UTM_R}}': tebs.utmR,
    '{{LADEN_R}}': tebs.ladenR,
    '{{VIN}}': input.vin || '',
    '{{PROD_DATE}}': new Date().toLocaleDateString('en-AU', { month: '2-digit', year: '2-digit' }),
    '{{DECL_NAME}}': '',
    '{{DECL_SIG}}': '',
    '{{DECL_DATE}}': new Date().toLocaleDateString('en-AU', { month: '2-digit', year: '2-digit' }),
  }

  // Booster info per axle (1-6)
  for (let i = 0; i < 6; i++) {
    replacements[`{{BOOSTER_BRAND_${i + 1}}}`] = tebs.boosterBrand[i] || ''
    replacements[`{{BOOSTER_SIZE_${i + 1}}}`] = tebs.boosterSize[i] || ''
    replacements[`{{SAL_${i + 1}}}`] = tebs.sal[i] || ''
  }

  // Sensor checkmarks
  const sensorRows = ['cd', 'ef', 'mod', 'lift', 'steer'] as const
  for (const row of sensorRows) {
    const vals = tebs.sensors[row]
    for (let i = 0; i < 6; i++) {
      replacements[`{{${row.toUpperCase()}_AX${i + 1}}}`] = vals[i] ? '\u2611' : ''
    }
  }

  // Apply all replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    docXml = docXml.split(placeholder).join(value)
  }

  zip.file('word/document.xml', docXml)
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function downloadTEBSBlob(blob: Blob, jobNumber?: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TEBS-Datasheet${jobNumber ? `-${jobNumber}` : ''}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
