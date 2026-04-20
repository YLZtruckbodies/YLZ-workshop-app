// One-time import of VIN plate records from Monday.com export
// Run with: npx tsx scripts/import-vin-plates.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function notes(status: string, dateVassed: string, invoiced: string): string {
  const parts: string[] = []
  if (status) parts.push(status)
  if (dateVassed) parts.push(`VASSED: ${dateVassed}`)
  if (invoiced === 'YES') parts.push('INVOICED')
  return parts.join(' | ')
}

const records = [
  // ── NEW VINS - NOT SUBMITTED ──
  { vin: '6K9D0GTRLTP841171', axleType: '6 AXLE',           hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '974',  customer: 'OAK GARDEN',                    notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841182', axleType: '4 AXLE',           hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '1067', customer: 'ALI SORN',                      notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841183', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841184', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841185', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841186', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841187', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841188', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841189', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLTP841190', axleType: '',                  hubConfiguration: '',               type: '',       jobNumber: '',     customer: '',                              notes: notes('PLATE NEEDED', '', 'NO') },

  // ── RAV SUBMITTED ──
  { vin: '6K9SEMTRLRP841077', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '678',  customer: 'YLZ stock - Alexandria truck show', notes: notes('SUBMITTED', '06/2024', 'NO') },
  { vin: '6K9D0GTRLRP841078', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '685',  customer: 'SCT+B - 3 Axle',               notes: notes('SUBMITTED', '05/2024', 'NO') },
  { vin: '6K9D0GTRLRP841079', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '687',  customer: 'cmv- clayton Volvo comb',       notes: notes('SUBMITTED', '05/2024', 'NO') },
  { vin: '6K9D0GTRLRP841080', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '691',  customer: 'Spence exca',                   notes: notes('SUBMITTED', '06/2024', 'NO') },
  { vin: '6K9D0GTRLRP841081', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '680',  customer: 'Stock build 8300',              notes: notes('SUBMITTED', '07/2024', 'NO') },
  { vin: '6K9SEMTRLRP841082', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '696',  customer: 'STOCK BODY',                    notes: notes('SUBMITTED', '07/2024', 'NO') },
  { vin: '6K9D0GTRLRP841083', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '701',  customer: 'Mega tipping - Kenworth',       notes: notes('SUBMITTED', '07/2024', 'NO') },
  { vin: '6K9D0GTRLRP841084', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '703',  customer: 'Mega tipping - Mack',           notes: notes('SUBMITTED', '08/2024', 'NO') },
  { vin: '6K9D0GTRLRP841085', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '705',  customer: 'Mega tipping - Mack',           notes: notes('SUBMITTED', '07/2024', 'NO') },
  { vin: '6K9D0GTRLRP841086', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '710',  customer: 'STOCK BODY',                    notes: notes('SUBMITTED', '05/2024', 'NO') },
  { vin: '6K9D0GTRLRP841088', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '724',  customer: 'Manseerat Family Trust 3 axle', notes: notes('SUBMITTED', '08/2024', 'NO') },
  { vin: '6K9D0GTRLRP841089', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '725',  customer: 'Gabbi trans 3 axle',            notes: notes('SUBMITTED', '08/2024', 'NO') },
  { vin: '6K9D0GTRLSP841090', axleType: '5 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '817',  customer: 'DAMLER',                        notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841091', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '723',  customer: 'STOCK BODY',                    notes: notes('SUBMITTED', '09/2024', 'NO') },
  { vin: '6K9D0GTRLRP841092', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '717',  customer: 'STOCK BODY',                    notes: notes('SUBMITTED', '08/2024', 'NO') },
  { vin: '6K9D0GTRLRP841093', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '730',  customer: 'Hallam truck',                  notes: notes('SUBMITTED', '09/2024', 'NO') },
  { vin: '6K9D0GTRLRP841094', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '707',  customer: 'CMV stock 4 axle',              notes: notes('SUBMITTED', '09/2024', 'NO') },
  { vin: '6K9D0GTRLRP841094', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '737',  customer: 'STOCK',                         notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841095', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '734',  customer: 'STOCK BODY',                    notes: notes('SUBMITTED', '09/2024', 'NO') },
  { vin: '6K9D0GTRLRP841096', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '802',  customer: 'SCIG',                          notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLSP841096', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '891',  customer: 'STOCK',                         notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841097', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '752',  customer: 'CMV HOLCIM',                    notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841098', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '753',  customer: 'CMV STOCK',                     notes: notes('SUBMITTED', '10/24', 'NO') },
  { vin: '6K9SEMTRLRP841099', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '755',  customer: 'CMV HOLCIM',                    notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9SEMTRLRP841100', axleType: 'DROP DECK 3 AXLE SEMI', hubConfiguration: 'SAF DRUM 285', type: 'ALLY', jobNumber: '768', customer: 'ROCKWORKS',                     notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9SEMTRLRP841101', axleType: 'DROP DECK 3 AXLE SEMI', hubConfiguration: 'SAF DRUM 285', type: 'ALLY', jobNumber: '770', customer: 'ROCKWORKS',                     notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9P1GTRLRP841102', axleType: 'TRI AXLE CONVERTOR', hubConfiguration: 'SAF DRUM 285', type: 'ALLY',  jobNumber: '769',  customer: 'ROCKWORKS',                     notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9SEMTRLRP841103', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '756',  customer: 'CMV HOLCIM',                    notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841104', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '757',  customer: 'SCIG',                          notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841105', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '750',  customer: 'S & R TRANSPORT',               notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9SEMTRLSP841108', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '827',  customer: 'CMV',                           notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9SEMTRLSP841109', axleType: 'SEMI 3 AXLE',       hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '878',  customer: 'CMV',                           notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLRP841110', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '801',  customer: 'SCIG',                          notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLRP841111', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '737',  customer: 'SCIG',                          notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLRP841112', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '778',  customer: 'MICKEY',                        notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLRP841113', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '786',  customer: 'SCIG',                          notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLRP841114', axleType: '5 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '783',  customer: 'KW 610',                        notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLRP841115', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '773',  customer: 'K&B Concrete',                  notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9P1GTRLRP841116', axleType: 'TWIN AXLE CONVERTOR DOLLY', hubConfiguration: 'SAF DISC 285', type: 'ALLY', jobNumber: '741', customer: 'STOCK',                    notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841118', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '791',  customer: 'TOLLAS',                        notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841119', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '805',  customer: 'Pheng',                         notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841120', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '814',  customer: 'Lim Nj Transport',              notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841121', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '825',  customer: 'Adam CMV',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841122', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '810',  customer: 'Bazpur Logistics',              notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841123', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '811',  customer: 'STOCK',                         notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841124', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'ALLY',   jobNumber: '780',  customer: 'TJ',                            notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLSP841124', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '',     customer: '',                              notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLSP841125', axleType: 'TANDAM PIG',        hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '793',  customer: 'LARSENS',                       notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841125', axleType: '4 AXLE',            hubConfiguration: 'TMC DISC 335',  type: 'ALLY',   jobNumber: '821',  customer: 'Joe and Lyna',                  notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841126', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '792',  customer: 'GG SANDU',                      notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLSP841127', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '812',  customer: 'RV',                            notes: notes('SUBMITTED', '', 'YES') },
  { vin: '6K9D0GTRLSP841128', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '795',  customer: 'CMV',                           notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841129', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '850',  customer: 'Bajwa',                         notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841130', axleType: '5 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '869',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841131', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '823',  customer: 'Sam',                           notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLSP841132', axleType: 'TWIN AXLE CONVERTOR DOLLY', hubConfiguration: 'SAF DRUM 285', type: '', jobNumber: '759', customer: '',                             notes: notes('PLATE NEEDED', '', 'NO') },
  { vin: '6K9D0GTRLSP841132', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '848',  customer: 'Bajwa',                         notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841134', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '873',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841135', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '875',  customer: 'Chris Hart',                    notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841136', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '866',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841137', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '892',  customer: 'SCT and B',                     notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841138', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '893',  customer: 'STOCK BODY',                    notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLSP841139', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '895',  customer: 'STOCK',                         notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841140', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '852',  customer: 'CSS',                           notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841141', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '915',  customer: 'Shane Sinclair',                notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841142', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '901',  customer: 'VISY',                          notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841143', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '907',  customer: 'SITRAX',                        notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841144', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '917',  customer: 'LARSENS',                       notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841145', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '945',  customer: 'Sandhu',                        notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841146', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '921',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841147', axleType: '5 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '942',  customer: 'Killa Bee',                     notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841148', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '949',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841149', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '951',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841150', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '953',  customer: 'Everstin',                      notes: notes('SUBMITTED', '', 'NO') },
  { vin: '6K9D0GTRLSP841151', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '968',  customer: 'SCT&B',                         notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841152', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '963',  customer: 'Everstin',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9SEMTRLSP841153', axleType: 'B DOUBLE LEAD',     hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '977',  customer: 'Simran - W.A Logistics',        notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9SEMTRLSP841155', axleType: 'DROP DECK 3 AXLE SEMI', hubConfiguration: 'SAF DISC 285', type: 'ALLY', jobNumber: '979', customer: 'Simran - W.A Logistics',        notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9SEMTRLSP841154', axleType: 'DROP DECK 3 AXLE SEMI', hubConfiguration: 'SAF DISC 285', type: 'ALLY', jobNumber: '978', customer: 'Simran - W.A Logistics',        notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLSP841103', axleType: 'TRI AXLE CONVERTOR', hubConfiguration: 'SAF DISC 285', type: '',      jobNumber: '976',  customer: 'Simran - W.A Logistics',        notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841156', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'HARDOX', jobNumber: '984',  customer: 'Larsens 4 axle',                notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841157', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '1012', customer: 'BCI Truck',                     notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841158', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '1023', customer: 'RV Transport',                  notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841159', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '1028', customer: 'Sam & Ly',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLSP841160', axleType: '4 AXLE',            hubConfiguration: 'DISC',           type: 'ALLY',   jobNumber: '986',  customer: 'Everstin',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841161', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '997',  customer: 'SCT&B',                         notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLTP841162', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '1009', customer: 'CMV Gippsland',                 notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841163', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '1016', customer: 'Gippsland Truck Centre',        notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841164', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'ALLY',   jobNumber: '1035', customer: 'AMR Haulage',                   notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841165', axleType: '3 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'ALLY',   jobNumber: '1031', customer: 'Manny - FGL',                   notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841166', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '992',  customer: 'Peter Mignanelli',              notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLTP841167', axleType: 'TANDAM PIG',        hubConfiguration: 'SAF DISC 335',  type: 'TRAY',   jobNumber: '1042', customer: 'INV 2133',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLTP841168', axleType: 'TANDAM PIG',        hubConfiguration: 'SAF DISC 335',  type: 'TRAY',   jobNumber: '1044', customer: 'INV 2135',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9P1GTRLTP841169', axleType: 'TANDAM PIG',        hubConfiguration: 'SAF DISC 335',  type: 'TRAY',   jobNumber: '1046', customer: 'INV 2134',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841170', axleType: '5 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '987',  customer: 'Everstin',                      notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841172', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '999',  customer: 'Larsens My Coll',               notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841173', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '1068', customer: 'PSI',                           notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLTP841174', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'HARDOX', jobNumber: '1065', customer: 'BCI',                           notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLTP841175', axleType: '3 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'ALLY',   jobNumber: '1033', customer: 'Manny - FGL',                   notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841176', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '993',  customer: 'Peter Mignanelli',              notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841177', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 285',  type: 'ALLY',   jobNumber: '994',  customer: 'Peter Mignanelli',              notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841178', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '1078', customer: 'SCTB',                          notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLTP841179', axleType: '4 AXLE',            hubConfiguration: 'SAF DISC 335',  type: 'HARDOX', jobNumber: '1080', customer: 'SCTB',                          notes: notes("KEITH'S DESK", '', 'NO') },
  { vin: '6K9D0GTRLTP841180', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 335',  type: 'ALLY',   jobNumber: '1103', customer: 'SOHAL ROADLINES',               notes: notes('ON TRAILER', '', 'NO') },
  { vin: '6K9D0GTRLTP841181', axleType: '4 AXLE',            hubConfiguration: 'SAF DRUM 285',  type: 'HARDOX', jobNumber: '1105', customer: 'NIMRIT PTY LTD',                notes: notes('ON TRAILER', '', 'NO') },
]

async function main() {
  console.log(`Importing ${records.length} VIN plate records...`)
  const result = await prisma.vinPlateRecord.createMany({ data: records, skipDuplicates: false })
  console.log(`✓ Created ${result.count} records`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
