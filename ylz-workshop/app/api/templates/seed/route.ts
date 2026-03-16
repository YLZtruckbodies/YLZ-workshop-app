import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SEED_TEMPLATES = [
  {
    name: 'Hardox Tipper Body - Truck',
    category: 'truck-body',
    description: 'Standard Hardox 450/500 tipper body for truck chassis',
    configuration: {
      buildType: 'truck-body',
      material: 'Hardox 450',
      bodyType: 'Tipper',
      defaultLength: '5400mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1200mm',
    },
    basePrice: 0,
    sortOrder: 1,
  },
  {
    name: 'Aluminium Tipper Body - Truck',
    category: 'truck-body',
    description: 'Lightweight aluminium tipper body for truck chassis',
    configuration: {
      buildType: 'truck-body',
      material: 'Aluminium',
      bodyType: 'Tipper',
      defaultLength: '5400mm',
      defaultWidth: '2290mm Alloy',
      defaultHeight: '1200mm',
    },
    basePrice: 0,
    sortOrder: 2,
  },
  {
    name: '3-Axle Dog Trailer - Hardox',
    category: 'trailer',
    description: 'DT-3 three axle dog trailer in Hardox',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'DT-3 (3-Axle Dog)',
      trailerType: 'P Beam',
      material: 'Hardox 450',
      defaultLength: '7700mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1100mm',
    },
    basePrice: 0,
    sortOrder: 3,
  },
  {
    name: '4-Axle Dog Trailer - Hardox',
    category: 'trailer',
    description: 'DT-4 four axle dog trailer in Hardox',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'DT-4 (4-Axle Dog)',
      trailerType: 'P Beam',
      material: 'Hardox 450',
      defaultLength: '8300mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1100mm',
    },
    basePrice: 0,
    sortOrder: 4,
  },
  {
    name: '5-Axle Dog Trailer - Hardox',
    category: 'trailer',
    description: 'DT-5 five axle dog trailer in Hardox',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'DT-5 (5-Axle Dog)',
      trailerType: 'P Beam',
      material: 'Hardox 450',
      defaultLength: '9200mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1100mm',
    },
    basePrice: 0,
    sortOrder: 5,
  },
  {
    name: '2-Axle Semi Trailer - Hardox',
    category: 'trailer',
    description: 'ST-2 two axle semi trailer in Hardox',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'ST-2 (2-Axle Semi)',
      trailerType: 'I Beam',
      material: 'Hardox 450',
      defaultLength: '9600mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1410mm',
    },
    basePrice: 0,
    sortOrder: 6,
  },
  {
    name: '3-Axle Semi Trailer - Hardox',
    category: 'trailer',
    description: 'ST-3 three axle semi trailer in Hardox',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'ST-3 (3-Axle Semi)',
      trailerType: 'I Beam',
      material: 'Hardox 450',
      defaultLength: '10400mm',
      defaultWidth: '2250mm Steel',
      defaultHeight: '1410mm',
    },
    basePrice: 0,
    sortOrder: 7,
  },
  {
    name: 'Convertor Dolly - 2 Axle',
    category: 'trailer',
    description: 'CD-2 two axle convertor dolly',
    configuration: {
      buildType: 'trailer',
      trailerModel: 'CD-2 (2-Axle Convertor Dolly)',
      trailerType: 'Converter Dolly',
      material: 'Steel',
    },
    basePrice: 0,
    sortOrder: 8,
  },
  {
    name: 'Truck & 3-Axle Dog Combo',
    category: 'truck-and-trailer',
    description: 'Truck body + 3-axle dog trailer combination build',
    configuration: {
      buildType: 'truck-and-trailer',
      truckConfig: {
        material: 'Hardox 450',
        bodyType: 'Tipper',
        defaultLength: '5400mm',
        defaultWidth: '2250mm Steel',
        defaultHeight: '1200mm',
      },
      trailerConfig: {
        trailerModel: 'DT-3 (3-Axle Dog)',
        trailerType: 'P Beam',
        material: 'Hardox 450',
        defaultLength: '7700mm',
        defaultWidth: '2250mm Steel',
        defaultHeight: '1100mm',
      },
    },
    basePrice: 0,
    sortOrder: 9,
  },
  {
    name: 'Truck & 4-Axle Dog Combo',
    category: 'truck-and-trailer',
    description: 'Truck body + 4-axle dog trailer combination build',
    configuration: {
      buildType: 'truck-and-trailer',
      truckConfig: {
        material: 'Hardox 450',
        bodyType: 'Tipper',
        defaultLength: '5400mm',
        defaultWidth: '2250mm Steel',
        defaultHeight: '1200mm',
      },
      trailerConfig: {
        trailerModel: 'DT-4 (4-Axle Dog)',
        trailerType: 'P Beam',
        material: 'Hardox 450',
        defaultLength: '8300mm',
        defaultWidth: '2250mm Steel',
        defaultHeight: '1100mm',
      },
    },
    basePrice: 0,
    sortOrder: 10,
  },
]

export async function POST() {
  const existing = await prisma.productTemplate.count()
  if (existing > 0) {
    return NextResponse.json({ message: `Already seeded (${existing} templates exist)`, count: existing })
  }

  const results = await prisma.productTemplate.createMany({
    data: SEED_TEMPLATES.map((t) => ({
      ...t,
      configuration: t.configuration as any,
    })),
  })

  return NextResponse.json({ message: `Seeded ${results.count} templates`, count: results.count }, { status: 201 })
}
