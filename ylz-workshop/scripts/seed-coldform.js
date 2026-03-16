const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Coldform data from spreadsheet...')

  // Clear existing data
  await prisma.coldformKit.deleteMany()
  await prisma.coldformChassis.deleteMany()
  await prisma.coldformDelivery.deleteMany()

  // ============== HARDOX KITS (from spreadsheet "hardox" sheet) ==============
  const kits = [
    { size: '4000x1100', walls: '', tunnel: 'Y', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: 'N', allocatedTo: '', notes: '' },
    { size: '4770x1100', walls: '', tunnel: 'Y', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'Y', lightStrips: 'N', allocatedTo: '', notes: 'FM 1100 x4 (spare headboards)' },
    { size: '4770x1100', walls: '', tunnel: 'N', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'Y', lightStrips: 'N', allocatedTo: '', notes: '' },
    { size: '4660x1100', walls: '', tunnel: 'Y', floor: 'Y', headBoard: 'Y', tailGate: 'Y', splashGuards: 'Y', lightStrips: 'N', allocatedTo: 'YLZ 1000', notes: 'Top Shop' },
    { size: '4660x1000', walls: '', tunnel: 'N', floor: 'N', headBoard: 'Y', tailGate: 'Y', splashGuards: 'Y', lightStrips: 'N', allocatedTo: 'YLZ 1083', notes: '' },
    { size: '4660x1000', walls: '', tunnel: 'N', floor: 'N', headBoard: 'N', tailGate: 'Y', splashGuards: 'Y', lightStrips: 'N', allocatedTo: 'YLZ 1084', notes: '' },
    { size: '4660x1000', walls: '', tunnel: 'N', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: 'N', allocatedTo: 'YLZ 1085', notes: '' },
    { size: '4660x1000', walls: '', tunnel: '', floor: '', headBoard: 'Y', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1086', notes: 'Will need to order these ones' },
    { size: '4660x1000', walls: '', tunnel: '', floor: '', headBoard: 'N', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1087', notes: 'Will need to order these ones' },
    { size: '4660x1000', walls: '', tunnel: '', floor: '', headBoard: 'N', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1088', notes: 'Will need to order these ones' },
    { size: '450 high', walls: '', tunnel: 'N', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: 'N', allocatedTo: 'YLZ 972', notes: '1200 headboard/tailgate' },
    { size: '4300x1100', walls: '', tunnel: '', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: 'N', allocatedTo: 'YLZ 1063', notes: 'Top Shop' },
    { size: '7700x1100', walls: '', tunnel: '', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1065', notes: 'O/S' },
    { size: 'TBC', walls: '', tunnel: '', floor: '', headBoard: '', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1038', notes: 'Unconfirmed trailer body for earth cut' },
    { size: 'Waiting confirmation', walls: '', tunnel: '', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: '', allocatedTo: 'YLZ 1069', notes: '' },
    { size: '4660x1100', walls: '', tunnel: '', floor: 'Y', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: '', allocatedTo: 'YLZ 1072', notes: '' },
    { size: '4660x1100', walls: '', tunnel: '', floor: 'Y', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: '', allocatedTo: 'YLZ 1077', notes: 'Thu-Fri 5/3/26' },
    { size: '4660x1100', walls: '', tunnel: '', floor: 'N', headBoard: 'N', tailGate: 'N', splashGuards: 'N', lightStrips: '', allocatedTo: 'YLZ 1079', notes: 'Thu-Fri 5/3/27' },
    { size: '4600x1000', walls: '', tunnel: '', floor: '', headBoard: '', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1091', notes: '' },
    { size: '4600x1000', walls: '', tunnel: '', floor: '', headBoard: '', tailGate: '', splashGuards: '', lightStrips: '', allocatedTo: 'YLZ 1092', notes: '' },
  ]

  for (let i = 0; i < kits.length; i++) {
    await prisma.coldformKit.create({
      data: { ...kits[i], position: i },
    })
  }
  console.log(`Created ${kits.length} hardox kit entries`)

  // ============== TRAILER CHASSIS (from spreadsheet "trailer chassis" sheet) ==============
  const chassisItems = [
    { jobNo: 'YLZ 999', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Might be down bottom shop', dateNeeded: '', notes: '' },
    { jobNo: 'YLZ 1068', chassisLength: '7700', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: 'Possibly in stock' },
    { jobNo: 'YLZ 1033', chassisLength: '6100', dollyType: '3 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: 'Can we roll the flat at coldform?' },
    { jobNo: 'YLZ 994', chassisLength: '8300', dollyType: '4 axle +', drawbar: 'Need to check drawings', dateNeeded: '2026-03-05', notes: '' },
    { jobNo: 'YLZ 993', chassisLength: '8300', dollyType: '4 axle +', drawbar: 'Need to check drawings', dateNeeded: '2026-03-05', notes: 'Also can we cut alloy tunnels for these jobs' },
    { jobNo: 'YLZ 1067', chassisLength: '8300', dollyType: '4 axle -', drawbar: 'Need to check drawings', dateNeeded: '2026-03-05', notes: '' },
    { jobNo: 'YLZ 1014', chassisLength: '8300', dollyType: '4 axle -', drawbar: 'Need to check drawings', dateNeeded: '', notes: '' },
    { jobNo: 'YLZ 1065', chassisLength: '7700', dollyType: '4 axle -', drawbar: 'Need to check drawings', dateNeeded: '', notes: 'Chassis is up top!' },
    { jobNo: 'YLZ 1078', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: 'Please add these ones in and order material' },
    { jobNo: 'YLZ 1080', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: '' },
    { jobNo: 'YLZ 1074', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: '' },
    { jobNo: 'YLZ 1076', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: '' },
    { jobNo: 'YLZ 1082', chassisLength: '8300', dollyType: '4 axle', drawbar: 'Need to check drawings', dateNeeded: '', notes: '' },
  ]

  for (let i = 0; i < chassisItems.length; i++) {
    await prisma.coldformChassis.create({
      data: { ...chassisItems[i], position: i },
    })
  }
  console.log(`Created ${chassisItems.length} chassis entries`)

  // ============== DELIVERY SCHEDULE (from spreadsheet "Sheet3") ==============
  // Excel serial dates converted to ISO dates
  // The schedule starts from around 2026-03-09 (Mon)
  const deliveries = [
    { date: '2026-03-09', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-10', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-11', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-12', hardoxJobs: 'YLZ 1083', chassisJobs: '', alloyJobs: 'YLZ 994' },
    { date: '2026-03-13', hardoxJobs: 'YLZ 1084', chassisJobs: 'YLZ 994', alloyJobs: '' },
    { date: '2026-03-14', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-15', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-16', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-17', hardoxJobs: 'YLZ 1085', chassisJobs: '', alloyJobs: 'YLZ 998' },
    { date: '2026-03-18', hardoxJobs: 'YLZ 1091', chassisJobs: 'YLZ 1078', alloyJobs: '' },
    { date: '2026-03-19', hardoxJobs: 'YLZ 1092', chassisJobs: '', alloyJobs: 'YLZ 999' },
    { date: '2026-03-20', hardoxJobs: 'YLZ 1086', chassisJobs: 'YLZ 1080', alloyJobs: '' },
    { date: '2026-03-21', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-22', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-23', hardoxJobs: 'YLZ 1087', chassisJobs: 'YLZ 1067', alloyJobs: 'YLZ 1032' },
    { date: '2026-03-24', hardoxJobs: 'YLZ 1088', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-25', hardoxJobs: 'YLZ 1077', chassisJobs: 'YLZ 1074', alloyJobs: '' },
    { date: '2026-03-26', hardoxJobs: 'YLZ 1079', chassisJobs: '', alloyJobs: 'YLZ 1033' },
    { date: '2026-03-27', hardoxJobs: 'YLZ 1078', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-28', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-29', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-30', hardoxJobs: 'YLZ 1080', chassisJobs: '', alloyJobs: '' },
    { date: '2026-03-31', hardoxJobs: 'YLZ 972', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-01', hardoxJobs: 'YLZ 1020', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-02', hardoxJobs: 'YLZ 1090', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-03', hardoxJobs: 'YLZ 1081', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-04', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-05', hardoxJobs: '', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-06', hardoxJobs: 'YLZ 1094', chassisJobs: '', alloyJobs: '' },
    { date: '2026-04-07', hardoxJobs: 'YLZ 1095', chassisJobs: '', alloyJobs: '' },
  ]

  for (const d of deliveries) {
    await prisma.coldformDelivery.create({ data: d })
  }
  console.log(`Created ${deliveries.length} delivery schedule entries`)

  console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
