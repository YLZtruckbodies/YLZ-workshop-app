import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing existing data...')
  await prisma.workerJob.deleteMany()
  await prisma.worker.deleteMany()
  await prisma.tarp.deleteMany()
  await prisma.timesheet.deleteMany()
  await prisma.completedOrder.deleteMany()
  await prisma.job.deleteMany()
  await prisma.user.deleteMany()

  console.log('Hashing PINs...')
  const salt = await bcrypt.genSalt(10)
  const pin1234 = await bcrypt.hash('1234', salt)
  const pin2345 = await bcrypt.hash('2345', salt)
  const pin3456 = await bcrypt.hash('3456', salt)
  const pin4444 = await bcrypt.hash('4444', salt)
  const pin5555 = await bcrypt.hash('5555', salt)
  const pin6666 = await bcrypt.hash('6666', salt)
  const pin7777 = await bcrypt.hash('7777', salt)
  const pin8888 = await bcrypt.hash('8888', salt)
  const pin9999 = await bcrypt.hash('9999', salt)
  const pin0000 = await bcrypt.hash('0000', salt)
  const pin1111 = await bcrypt.hash('1111', salt)

  // ── USERS (9) ──────────────────────────────────────────────────────────────
  console.log('Seeding users...')
  await prisma.user.createMany({
    data: [
      {
        id: 'nathan',
        name: 'Nathan',
        role: 'Director',
        section: null,
        color: '#E8681A',
        pin: pin1234,
        access: ['dashboard', 'analytics', 'floor', 'qa', 'coldform', 'mrp-tools', 'cashflow', 'notifications', 'timesheet', 'production', 'keithschedule', 'jobs', 'reports', 'quotes', 'customers', 'sales', 'engineering'],
        canAdvance: true,
        canEdit: true,
        fullAdmin: true,
        defaultScreen: 'dashboard',
      },
      {
        id: 'keith',
        name: 'Keith',
        role: 'Production Manager',
        section: null,
        color: '#22d07a',
        pin: pin2345,
        access: ['dashboard', 'analytics', 'keithschedule', 'production', 'floor', 'qa', 'coldform', 'notifications', 'timesheet'],
        canAdvance: false,
        canEdit: true,
        fullAdmin: false,
        defaultScreen: 'keithschedule',
      },
      {
        id: 'pete',
        name: 'Pete',
        role: 'Sales Manager',
        section: null,
        color: '#3b9de8',
        pin: pin3456,
        access: ['dashboard', 'analytics', 'keithschedule', 'production', 'floor', 'qa', 'coldform', 'cashflow', 'notifications', 'timesheet', 'jobs', 'reports', 'quotes', 'customers', 'sales', 'engineering'],
        canAdvance: true,
        canEdit: true,
        fullAdmin: true,
        defaultScreen: 'production',
      },
      {
        id: 'matt',
        name: 'Matt',
        role: 'Subframes & Fitout Supervisor',
        section: 'Fitout',
        color: '#a78bfa',
        pin: pin4444,
        access: ['dashboard', 'floor', 'qa', 'notifications', 'timesheet', 'production'],
        canAdvance: true,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'floor',
      },
      {
        id: 'ben',
        name: 'Ben',
        role: 'Alloy Supervisor',
        section: 'Alloy',
        color: '#3b9de8',
        pin: pin5555,
        access: ['dashboard', 'floor', 'qa', 'notifications', 'timesheet', 'production'],
        canAdvance: true,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'floor',
      },
      {
        id: 'simon',
        name: 'Simon',
        role: 'R&D / Steel',
        section: 'Steel',
        color: '#a78bfa',
        pin: pin6666,
        access: ['dashboard', 'floor', 'qa', 'coldform', 'notifications', 'timesheet', 'production'],
        canAdvance: true,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'floor',
      },
      {
        id: 'liz',
        name: 'Liz',
        role: 'MRPeasy / Admin',
        section: null,
        color: '#f5a623',
        pin: pin7777,
        access: ['dashboard', 'mrp-tools', 'production', 'notifications', 'jobs', 'timesheet'],
        canAdvance: false,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'production',
      },
      {
        id: 'wendy',
        name: 'Wendy',
        role: 'Accounts / Xero',
        section: null,
        color: '#f5a623',
        pin: pin8888,
        access: ['dashboard', 'cashflow', 'production', 'notifications', 'jobs', 'timesheet'],
        canAdvance: false,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'production',
      },
      {
        id: 'dom',
        name: 'Dom',
        role: 'Parts Manager',
        section: null,
        color: '#22d07a',
        pin: pin9999,
        access: ['dashboard', 'production', 'notifications', 'jobs'],
        canAdvance: false,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'production',
      },
      {
        id: 'coldform',
        name: 'Coldform',
        role: 'Coldform / Cut Parts',
        section: null,
        color: '#22d07a',
        pin: pin0000,
        access: ['dashboard', 'floor', 'qa', 'coldform', 'notifications', 'timesheet', 'production'],
        canAdvance: true,
        canEdit: false,
        fullAdmin: false,
        defaultScreen: 'coldform',
      },
    ],
  })
  console.log('  10 users created.')

  // ── JOBS (47) ──────────────────────────────────────────────────────────────
  console.log('Seeding jobs...')
  await prisma.job.createMany({
    data: [
      // ISSUED TO FLOOR
      { id: '1061', num: 'YLZ1061', type: 'Wheelbase Reduction', customer: 'Wei', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'wheelbase', dealer: 'Sitrak Dandenong', site: 'ARRIVED', sheet: 'N/A', dwg: 'finished', mrp: '', parts: 'N/A', ebs: 'NA', notes: 'Subframe shortening. Need details*', make: '', po: '*AWAITING P.O', dims: '', vin: 'LZZ8ACMJ4SC692429', prodGroup: 'issued' },
      { id: '987', num: 'YLZ987', type: 'Ally Trailer', customer: 'Everstin Group', stage: 'Fitout', flag: false, pairedId: null, due: '', btype: 'ally-trailer', dealer: 'CMV T&B Derrimut (Steve)', site: 'N/A', sheet: 'ISSUED', dwg: '', mrp: '', parts: 'Completed', ebs: 'To Be Done', notes: 'Coupled with YLZ973', make: '5-Axle Dog Trailer', po: '', dims: '9200x1400', vin: '6K9D0GTRLTP841170', prodGroup: 'issued' },
      { id: '992', num: 'YLZ992', type: 'Ally Trailer', customer: 'Peter Mignanelli', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-trailer', dealer: 'South Central T&B Adelaide', site: 'N/A', sheet: 'WAITING', dwg: '', mrp: '', parts: 'To start', ebs: 'Received', notes: 'with YLZ1006/1007, PBS 285 disc, 19m', make: '4-Axle Dog Trailer', po: '', dims: '7700x1400', vin: '6K9D0GTRLTP841166', prodGroup: 'issued' },
      { id: '1000', num: 'YLZ1000', type: 'Hardox Rigid Body', customer: 'Stock build', stage: 'QC', flag: false, pairedId: null, due: '09/03/26', btype: 'hardox-body', dealer: 'CMV Dandenong - Mark Brennan', site: 'ARRIVED', sheet: 'ISSUED', dwg: 'finished', mrp: 'YES', parts: 'N/A', ebs: 'To Be Done', notes: 'Truck dropped off 11/02/26', make: 'UD Quon CW26460KAA', po: 'P9053363', dims: '4660x1100', vin: 'JNCMCJ0D9TU113650', prodGroup: 'issued' },
      { id: '1063', num: 'YLZ1063', type: 'Hardox Rigid Body', customer: "Mitchell's Transport", stage: 'Paint', flag: false, pairedId: null, due: '09/03/26', btype: 'hardox-body', dealer: 'Glen Cameron', site: 'ARRIVED', sheet: 'ISSUED', dwg: 'finished', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: '', make: 'Volvo FH', po: 'Truck arriving 16/02/26', dims: '4300x1100', vin: 'YV5AG40D6DD137459', prodGroup: 'issued' },
      { id: '1018', num: 'YLZ1018', type: 'Hardox Rigid Body', customer: 'AMC', stage: 'Fitout', flag: false, pairedId: null, due: '16/03/26', btype: 'hardox-body', dealer: 'SC T&B (Jarrod.W)', site: 'ARRIVED', sheet: 'ISSUED', dwg: 'finished', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: 'Hoist, rear ladder and front mount tool box.', make: 'UD Quon CW26460KAA', po: 'Waiting on P.O', dims: '4770x1100', vin: 'JNCMCJ0D0TU116064', prodGroup: 'issued' },
      { id: '1019', num: 'YLZ1019', type: 'Hardox Rigid Body', customer: 'S.A FORM WORK? TBC', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'SC T&B (Jarrod.W)', site: 'NO', sheet: 'ISSUED', dwg: 'finished', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: 'Hoist, rear ladder and front mount tool box.', make: 'UD Quon CW26460KAA', po: 'Waiting on P.O', dims: '4770x1100', vin: '', prodGroup: 'issued' },
      { id: '1072', num: 'YLZ1072', type: 'Hardox Truck Body', customer: 'Stock', stage: 'Paint', flag: false, pairedId: '1071', due: '12/03/26', btype: 'hardox-body', dealer: 'CMV Gippsland - Josh Bailey', site: 'ARRIVED', sheet: 'ISSUED', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: 'UD Quon CW26460KAA', po: '*AWAITING P.O/Approval.', dims: '4660x1100', vin: 'JNCMCJ0D5TU115010', prodGroup: 'issued' },
      { id: '1083', num: 'YLZ1083', type: 'Hardox Rigid Body', customer: 'GTC - Canberra', stage: 'Fab', flag: false, pairedId: null, due: '10/03/26', btype: 'hardox-body', dealer: 'Larsens Truck sales', site: 'ARRIVED', sheet: 'FINISHED', dwg: 'finished', mrp: '', parts: 'N/A', ebs: 'NA', notes: 'Subframe/hoist body only', make: 'Mack Granite', po: '', dims: '4660x1000', vin: '6FMN12H56GD807878', prodGroup: 'issued' },
      { id: '1091', num: 'YLZ1091', type: 'Locking Bar 1000mm', customer: 'GTC', stage: 'Fab', flag: false, pairedId: null, due: '10/03/26', btype: 'hardox-body', dealer: 'Larsens Truck sales', site: 'N/A', sheet: 'FINISHED', dwg: 'finished', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: 'Iveco Stralis 460', po: '', dims: '', vin: '', prodGroup: 'issued' },
      { id: '994', num: 'YLZ994', type: 'Dog Trailer Chassis', customer: 'Peter Mignanelli', stage: 'Fitout', flag: false, pairedId: '993', due: '13/03/26', btype: 'ally-trailer', dealer: 'South Central T&B Adelaide', site: 'N/A', sheet: 'ISSUED', dwg: 'finished', mrp: '', parts: 'Completed', ebs: 'Received', notes: 'Coupled with YLZ1006', make: '4 axle 8.3', po: '', dims: '8300x1410', vin: '6K9D0GTRLTP841177', prodGroup: 'issued' },
      { id: '954', num: 'YLZ954', type: 'Ally Truck Body', customer: 'Stock truck', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'Sitrak Australia', site: 'ARRIVED', sheet: 'ISSUED', dwg: 'finished', mrp: '', parts: 'To start', ebs: 'NA', notes: '', make: 'Sitrak Sinotruck C7H', po: '', dims: '4700x1500', vin: '', prodGroup: 'issued' },
      { id: '1071', num: 'YLZ1071', type: 'Alloy Rigid Body', customer: 'TRS Earthworks', stage: 'Paint', flag: false, pairedId: '1072', due: '12/03/26', btype: 'ally-body', dealer: 'Turnbulls', site: 'N/A', sheet: 'ISSUED', dwg: '', mrp: '', parts: 'Completed', ebs: 'NA', notes: 'Body to suit 5 axle CBB Trailer', make: 'Freightliner Cascadia 126', po: '', dims: '4600x1500', vin: '', prodGroup: 'issued' },
      { id: '993', num: 'YLZ993', type: 'Alloy Trailer (8300)', customer: 'Hansen Quarries', stage: 'Fitout', flag: true, pairedId: '994', due: '13/03/26', btype: 'ally-trailer', dealer: 'South Central T&B Adelaide', site: 'N/A', sheet: 'ISSUED', dwg: '', mrp: '', parts: 'Completed', ebs: 'Received', notes: 'Coupled with YLZ1007', make: '4 axle 8.3', po: '', dims: '8300x1410', vin: '6K9D0GTRLTP841176', prodGroup: 'issued' },
      { id: '998', num: 'YLZ998', type: 'Ally Truck Body', customer: 'My Coll - Adam/Steve', stage: 'Fab', flag: false, pairedId: '999', due: '13/03/26', btype: 'ally-body', dealer: 'Larsens Truck Sales (Dave)', site: 'ARRIVED', sheet: 'FINISHED', dwg: '', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: 'Coupled with YLZ999, PBS, 20M.', make: 'Kenworth T659', po: '*AWAITING P.O/Approval.', dims: '4550x1500', vin: '', prodGroup: 'issued' },
      { id: '999', num: 'YLZ999', type: 'Alloy Trailer (8300)', customer: 'My Coll - Adam/Steve', stage: 'Fab', flag: false, pairedId: '998', due: '13/03/26', btype: 'ally-trailer', dealer: 'Larsens Truck Sales (Dave)', site: 'N/A', sheet: 'FINISHED', dwg: '', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: 'PBS 285/DISC, LINER, 20M.', make: '4-Axle Dog Trailer', po: '*AWAITING P.O/Approval.', dims: '8300x1410', vin: '6K9D0GTRLTP841172', prodGroup: 'issued' },
      { id: '1093', num: 'YLZ1093', type: 'Wheelbase Reduction', customer: 'Mitch Hynd', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'wheelbase', dealer: 'Turnbulls Gippsland', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: '', ebs: '', notes: 'Subframe shortening. Need details*', make: '', po: '', dims: '', vin: '', prodGroup: 'issued' },
      // GO AHEAD
      { id: '1032', num: 'YLZ1032', type: 'Rigid Body - Ally 4700', customer: 'Elgin Quarries', stage: 'Fab', flag: false, pairedId: null, due: '27/03/26', btype: 'ally-body', dealer: '', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: '', ebs: '', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'goahead' },
      { id: '1033', num: 'YLZ1033', type: 'Alloy Trailer (6100)', customer: 'Metro Waste', stage: 'Fab', flag: true, pairedId: null, due: '20/03/26', btype: 'ally-trailer', dealer: '', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: '', ebs: '', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'goahead' },
      // PENDING
      { id: '1069', num: 'YLZ1069', type: 'Hardox Truck Body', customer: 'KNN Transport - MICK', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'Private', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1039', num: 'YLZ1039', type: 'Hardox Truck Body', customer: 'Jake Larsen', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: "Larsen's Truck Sales (Jake)", site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1049', num: 'YLZ1049', type: 'Hardox Truck Body', customer: 'SPARE', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'SPARE', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1024', num: 'YLZ1024', type: 'Hardox Truck Body', customer: 'Shane', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'STG Global', site: 'NO', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1055', num: 'YLZ1055', type: 'Ally Truck Body', customer: 'Oak Garden Supplies', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'CMV T&B Derrimut (Nick.A)', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '974', num: 'YLZ974', type: 'Ally Trailer', customer: 'Oak Gardens.', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-trailer', dealer: 'CMV T&B Derrimut (Steve)', site: 'N/A', sheet: 'FINISHED', dwg: '', mrp: 'NO', parts: 'To start', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1064', num: 'YLZ1064', type: 'Hardox Truck Body', customer: '', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'SCAVATE', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1062', num: 'YLZ1062', type: 'Ally Truck Body', customer: '', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'North East Isuzu Shepparton', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1048', num: 'YLZ1048', type: 'Dropside Tipper', customer: 'Brian Earl', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'dropside', dealer: 'Patterson Cheney - Jason Bailey', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1029', num: 'YLZ1029', type: 'Hardox Truck Body', customer: 'Darren White', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'Gippsland Truck Centre', site: 'NO', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1014', num: 'YLZ1014', type: 'Ally Trailer', customer: 'Bajwa Services', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-trailer', dealer: 'CMV T&B Dandenong (Nawaz)', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'To Be Done', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      { id: '1013', num: 'YLZ1013', type: 'Ally Truck Body', customer: 'Bajwa Services', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'CMV T&B Dandenong (Nawaz)', site: 'NO', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'pending' },
      // STOCK
      { id: '1006', num: 'YLZ1006', type: 'Ally Truck Body', customer: 'TBC - Stock build', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'SC T&B (Peter Miganelli)', site: 'ARRIVED', sheet: 'FINISHED', dwg: '', mrp: '', parts: 'Completed', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '1007', num: 'YLZ1007', type: 'Ally Truck Body', customer: 'TBC - Stock build', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'SC T&B (Peter Miganelli)', site: 'ARRIVED', sheet: 'FINISHED', dwg: '', mrp: '', parts: 'Completed', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '741', num: 'YLZ741', type: 'Dolly Convertor', customer: 'Stock', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'dolly', dealer: 'YLZ', site: 'N/A', sheet: '', dwg: '', mrp: '', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '896', num: 'YLZ896', type: 'Flat Tray', customer: 'Stock', stage: 'Dispatch', flag: false, pairedId: null, due: '', btype: 'flat-tray', dealer: 'YLZ', site: 'ARRIVED', sheet: 'N/A', dwg: '', mrp: 'NO', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '907', num: 'YLZ907', type: 'Ally Trailer', customer: 'Stock', stage: 'Dispatch', flag: false, pairedId: null, due: '', btype: 'ally-trailer', dealer: 'Sitrak Australia', site: 'N/A', sheet: 'ISSUED', dwg: '', mrp: 'YES', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '909', num: 'YLZ909', type: 'Ally Truck Body', customer: 'Stock', stage: 'Dispatch', flag: false, pairedId: null, due: '', btype: 'ally-body', dealer: 'Sitrak Australia', site: 'ARRIVED', sheet: 'ISSUED', dwg: '', mrp: 'YES', parts: 'N/A', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '996', num: 'YLZ996', type: 'Hardox Truck Body', customer: 'Stock build', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-body', dealer: 'SC T&B (Jarrod.W)', site: 'ARRIVED', sheet: 'FINISHED', dwg: '', mrp: '', parts: 'Completed', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      { id: '997', num: 'YLZ997', type: 'Hardox Trailer', customer: 'Stock build', stage: 'Fab', flag: false, pairedId: null, due: '', btype: 'hardox-trailer', dealer: 'SC T&B (Jarrod.W)', site: 'N/A', sheet: 'FINISHED', dwg: '', mrp: '', parts: 'Completed', ebs: 'Prepared', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'stock' },
      // DISPATCHED
      { id: '1084', num: 'YLZ1084', type: 'Hardox Rigid Body', customer: 'GTC Fleet', stage: 'Dispatch', flag: false, pairedId: null, due: '09/03/26', btype: 'hardox-body', dealer: 'CMV Dandenong', site: 'ARRIVED', sheet: 'ISSUED', dwg: 'finished', mrp: 'YES', parts: 'Completed', ebs: 'NA', notes: '', make: '', po: '', dims: '', vin: '', prodGroup: 'issued' },
    ],
  })
  console.log('  40 jobs created.')

  // ── WORKERS (20) ───────────────────────────────────────────────────────────
  console.log('Seeding workers...')

  // Darwin
  await prisma.worker.create({
    data: {
      id: 'darwin',
      name: 'Darwin',
      role: 'Aluminium',
      section: 'alloy',
      color: '#3b9de8',
      hdr: 'alloy',
      jobs: {
        create: [
          { jobNo: '999', type: 'Ally Trailer 8300', start: '10/03/26', days: 3, position: 0 },
          { jobNo: '1033', type: 'Ally Trailer 6100', start: '', days: 3, position: 1 },
          { jobNo: '1032', type: 'Rigid Ally 4700', start: '', days: 3, position: 2 },
        ],
      },
    },
  })

  // Julio
  await prisma.worker.create({
    data: {
      id: 'julio',
      name: 'Julio',
      role: 'Aluminium',
      section: 'alloy',
      color: '#3b9de8',
      hdr: 'alloy',
      jobs: {
        create: [
          { jobNo: '999', type: 'Ally Trailer 8300', start: '10/03/26', days: 3, position: 0 },
          { jobNo: '1033', type: 'Ally Trailer 6100', start: '', days: 3, position: 1 },
          { jobNo: '1032', type: 'Rigid Ally 4700', start: '', days: 3, position: 2 },
        ],
      },
    },
  })

  // Ben (alloy worker)
  await prisma.worker.create({
    data: {
      id: 'ben_alloy',
      name: 'Ben',
      role: 'Alloy + Fitout',
      section: 'alloy',
      color: '#3b9de8',
      hdr: 'alloy',
      jobs: {
        create: [
          { jobNo: '999', type: 'Ally Trailer 8300', start: '10/03/26', days: 3, position: 0 },
          { jobNo: '993', type: 'Ally Body Fitout', start: '', days: 1, position: 1 },
          { jobNo: '1018', type: 'Hardox Fitout', start: '', days: 1, position: 2 },
        ],
      },
    },
  })

  // Simon (worker)
  await prisma.worker.create({
    data: {
      id: 'simon',
      name: 'Simon',
      role: 'Steel / R&D',
      section: 'alloy',
      color: '#a78bfa',
      hdr: 'steel',
      jobs: {
        create: [
          { jobNo: '1091', type: 'LB/TG/RF 1000mm', start: '06/03/26', days: 3, position: 0 },
          { jobNo: '1092', type: 'LB/TG/RF 1000mm', start: '', days: 1, position: 1 },
          { jobNo: '994', type: 'Dolly 4 Axle', start: '', days: 0, position: 2 },
        ],
      },
    },
  })

  // Rav
  await prisma.worker.create({
    data: {
      id: 'rav',
      name: 'Rav',
      role: 'Steel / Hardox',
      section: 'hardox',
      color: '#E8681A',
      hdr: 'hardox',
      jobs: {
        create: [
          { jobNo: '1083', type: 'Hardox Rigid Body', start: '06/03/26', days: 2, position: 0 },
          { jobNo: '1084', type: 'Hardox Rigid Body', start: '', days: 1, position: 1 },
          { jobNo: '1091', type: 'Hardox Rigid Body', start: '', days: 1, position: 2 },
        ],
      },
    },
  })

  // JD
  await prisma.worker.create({
    data: {
      id: 'jd',
      name: 'JD',
      role: 'Hardox Body',
      section: 'hardox',
      color: '#E8681A',
      hdr: 'hardox',
      jobs: {
        create: [
          { jobNo: '1083', type: 'Hardox Rigid Body', start: '06/03/26', days: 2, position: 0 },
          { jobNo: '1084', type: 'Hardox Rigid Body', start: '', days: 1, position: 1 },
          { jobNo: '1091', type: 'Hardox Rigid Body', start: '', days: 1, position: 2 },
        ],
      },
    },
  })

  // Kabaj
  await prisma.worker.create({
    data: {
      id: 'kabaj',
      name: 'Kabaj',
      role: 'Chassis',
      section: 'chassis',
      color: '#22d07a',
      hdr: 'chassis',
      jobs: {
        create: [
          { jobNo: '999', type: '4 Axle Dog — Ally', start: '05/03/26', days: 3, position: 0 },
          { jobNo: '1078', type: '4 Axle Dog — Hardox', start: '', days: 2, position: 1 },
          { jobNo: '1080', type: '4 Axle Dog — Hardox', start: '', days: 2, position: 2 },
        ],
      },
    },
  })

  // Mohit
  await prisma.worker.create({
    data: {
      id: 'mohit',
      name: 'Mohit',
      role: 'Chassis',
      section: 'chassis',
      color: '#22d07a',
      hdr: 'chassis',
      jobs: {
        create: [
          { jobNo: '999', type: '4 Axle Dog — Ally', start: '05/03/26', days: 3, position: 0 },
          { jobNo: '1067', type: '4 Axle Dog — Ally', start: '', days: 2, position: 1 },
        ],
      },
    },
  })

  // Bailey
  await prisma.worker.create({
    data: {
      id: 'bailey',
      name: 'Bailey',
      role: 'Fitout',
      section: 'fitout',
      color: '#8aaec6',
      hdr: 'fitout',
      jobs: {
        create: [
          { jobNo: '1063', type: 'Hardox Rigid Body', start: '05/03/26', days: 0, position: 0 },
          { jobNo: '1071', type: 'Rigid Ally', start: '', days: 1, position: 1 },
          { jobNo: '993', type: 'Ally Trailer 8300', start: '', days: 0, position: 2 },
        ],
      },
    },
  })

  // Dan
  await prisma.worker.create({
    data: {
      id: 'dan',
      name: 'Dan',
      role: 'Fitout',
      section: 'fitout',
      color: '#8aaec6',
      hdr: 'fitout',
    },
  })

  // Tony
  await prisma.worker.create({
    data: {
      id: 'tony',
      name: 'Tony',
      role: 'Fitout / Paint',
      section: 'fitout',
      color: '#f5a623',
      hdr: 'paint',
      jobs: {
        create: [
          { jobNo: '998/1070', type: 'Subframe', start: '06/03/26', days: 1, position: 0 },
          { jobNo: '1072', type: 'Hardox Body', start: '', days: 1, position: 1 },
        ],
      },
    },
  })

  // Emma
  await prisma.worker.create({
    data: {
      id: 'emma',
      name: 'Emma',
      role: 'Paint',
      section: 'fitout',
      color: '#f5a623',
      hdr: 'paint',
      jobs: {
        create: [
          { jobNo: '1000', type: 'Hardox Rigid Body', start: '04/03/26', days: 1, position: 0 },
          { jobNo: '994', type: 'Dolly', start: '', days: 0, position: 1 },
          { jobNo: '993', type: 'Ally Trailer', start: '', days: 0, position: 2 },
        ],
      },
    },
  })

  // Mark
  await prisma.worker.create({
    data: {
      id: 'mark',
      name: 'Mark',
      role: 'Fitout — Trailer Chassis',
      section: 'trailerfit',
      color: '#a78bfa',
      hdr: 'fitout',
      jobs: {
        create: [
          { jobNo: '993', type: 'Alloy Trailer 8300 Fitout', start: '10/03/26', days: 2, position: 0 },
          { jobNo: '999', type: 'Alloy Trailer 8300 Fitout', start: '', days: 2, position: 1 },
          { jobNo: '1072', type: 'Dog Trailer Fitout', start: '', days: 1, position: 2 },
        ],
      },
    },
  })

  // Arvi
  await prisma.worker.create({
    data: {
      id: 'arvi',
      name: 'Arvi',
      role: 'Fitout — Trailer Chassis',
      section: 'trailerfit',
      color: '#a78bfa',
      hdr: 'fitout',
      jobs: {
        create: [
          { jobNo: '993', type: 'Alloy Trailer 8300 Fitout', start: '10/03/26', days: 2, position: 0 },
          { jobNo: '999', type: 'Alloy Trailer 8300 Fitout', start: '', days: 2, position: 1 },
        ],
      },
    },
  })

  // Nathan (worker - subframes)
  await prisma.worker.create({
    data: {
      id: 'nathan_w',
      name: 'Nathan',
      role: 'Fitout — Subframes',
      section: 'subfit',
      color: '#E8681A',
      hdr: 'chassis',
      jobs: {
        create: [
          { jobNo: '1063', type: 'Hardox Subframe Fitout', start: '05/03/26', days: 1, position: 0 },
          { jobNo: '1083', type: 'Hardox Subframe Fitout', start: '', days: 1, position: 1 },
          { jobNo: '1033', type: 'Alloy Subframe Fitout', start: '', days: 1, position: 2 },
        ],
      },
    },
  })

  // Extra chassis workers (no jobs in prototype)
  await prisma.worker.create({
    data: { id: 'herson', name: 'Herson', role: 'Chassis', section: 'chassis', color: '#22d07a', hdr: 'chassis' },
  })
  await prisma.worker.create({
    data: { id: 'rob', name: 'Rob', role: 'Chassis', section: 'chassis', color: '#22d07a', hdr: 'chassis' },
  })
  await prisma.worker.create({
    data: { id: 'andres', name: 'Andres', role: 'Chassis', section: 'chassis', color: '#22d07a', hdr: 'chassis' },
  })
  await prisma.worker.create({
    data: { id: 'dennis', name: 'Dennis', role: 'Chassis', section: 'chassis', color: '#22d07a', hdr: 'chassis' },
  })
  console.log('  19 workers created (15 with data + 4 empty chassis workers).')

  // ── TARPS (3) ──────────────────────────────────────────────────────────────
  console.log('Seeding tarps...')
  await prisma.tarp.createMany({
    data: [
      { jobNo: '993', type: '4 Axle Dog — Ally', susp: 'arrived', tyres: 'ordered', tarp: 'pending' },
      { jobNo: '994', type: '4 Axle Dog — Ally', susp: 'pending', tyres: 'pending', tarp: 'pending' },
      { jobNo: '1078', type: '4 Axle Dog — Hardox', susp: 'arrived', tyres: 'arrived', tarp: 'na' },
    ],
  })
  console.log('  3 tarps created.')

  // ── COMPLETED ORDERS (3) ───────────────────────────────────────────────────
  console.log('Seeding completed orders...')
  await prisma.completedOrder.createMany({
    data: [
      { jobNo: '1000', name: 'Hardox Rigid Body', fab: 'RAV & JD — 04/03', paint: 'Tony 05/03', fitout: '', date: '' },
      { jobNo: '1084', name: 'LB / Tailgate / R-Frame', fab: 'Simon 05/03', paint: '', fitout: '', date: '' },
      { jobNo: '1085', name: 'LB / Tailgate / R-Frame', fab: 'Simon 05/03', paint: '', fitout: '', date: '' },
    ],
  })
  console.log('  3 completed orders created.')

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
