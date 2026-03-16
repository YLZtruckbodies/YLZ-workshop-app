/**
 * Google Apps Script — bound to the "Workshop Daily Schedule" spreadsheet
 *
 * SETUP INSTRUCTIONS:
 * 1. Open the spreadsheet in Google Sheets
 * 2. Go to Extensions > Apps Script
 * 3. Delete everything in Code.gs and paste this entire file
 * 4. Update APP_URL below with your Vercel URL
 * 5. Click Save (Ctrl+S)
 * 6. Click Run on "setupMenu" once to authorize
 * 7. Reload the spreadsheet — a "YLZ Sync" menu will appear
 *
 * OPTIONAL AUTO-SYNC:
 * 8. Go to Triggers (clock icon on left sidebar)
 * 9. Click "+ Add Trigger"
 * 10. Choose: onEditTrigger | Head | From spreadsheet | On edit
 * 11. Add another trigger: autoSync | Head | Time-driven | Minutes timer | Every 5 minutes
 * 12. Save and authorize when prompted
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — UPDATE THESE
// ══════════════════════════════════════════════════════════════════════════════

var APP_URL = 'https://ylz-workshop.vercel.app'
var SECRET  = 'ylz-sheets-webhook-secret-2026'
var TAB_NAME = 'Workshop schedule'

// ══════════════════════════════════════════════════════════════════════════════
// WORKER BLOCK MAPPING — matches the app's sheets-config.ts
// Each block defines where a worker's data lives in the sheet
// ══════════════════════════════════════════════════════════════════════════════

var WORKER_BLOCKS = [
  // ── TOP BAND (rows 2-15) ──
  { workerId: 'darwin',    header: 'DARWIN - ALUMINIUM',     dataStartRow: 4,  dataEndRow: 15, colJobNo: 1,  colType: 2,  colStart: 3,  colComp: 4,  colDays: 5  }, // A-E
  { workerId: 'julio',     header: 'JULIO - ALUMINIUM',      dataStartRow: 4,  dataEndRow: 15, colJobNo: 7,  colType: 8,  colStart: 9,  colComp: 10, colDays: 11 }, // G-K
  { workerId: 'ben_alloy', header: 'BEN - ALUMINIUM',        dataStartRow: 4,  dataEndRow: 15, colJobNo: 13, colType: 14, colStart: 15, colComp: 16, colDays: 17 }, // M-Q
  { workerId: 'ben_alloy', header: 'BEN - QC (FITOUT)',      dataStartRow: 4,  dataEndRow: 15, colJobNo: 19, colType: 20, colStart: 21, colComp: 22, colDays: 23 }, // S-W
  // ── BOTTOM BAND (rows 17-35) ──
  { workerId: 'rav',       header: 'RAV - STEEL/HARDOX BODY', dataStartRow: 19, dataEndRow: 35, colJobNo: 1,  colType: 2,  colStart: 3,  colComp: 4,  colDays: 5  }, // A-E
  { workerId: 'jd',        header: 'JD - RAV/HARDOX BODY',    dataStartRow: 19, dataEndRow: 35, colJobNo: 7,  colType: 8,  colStart: 9,  colComp: 10, colDays: 11 }, // G-K
  { workerId: 'kabaj',     header: 'KABAJ - CHASSIS',         dataStartRow: 19, dataEndRow: 35, colJobNo: 13, colType: 14, colStart: 15, colComp: 16, colDays: 17 }, // M-Q
  { workerId: 'mohit',     header: 'MOHIT - CHASSIS',         dataStartRow: 19, dataEndRow: 35, colJobNo: 19, colType: 20, colStart: 21, colComp: 22, colDays: 23 }, // S-W
]

// ══════════════════════════════════════════════════════════════════════════════
// MENU — adds "YLZ Sync" to the spreadsheet menu bar
// ══════════════════════════════════════════════════════════════════════════════

function onOpen() {
  setupMenu()
}

function setupMenu() {
  SpreadsheetApp.getActiveSpreadsheet().addMenu('YLZ Sync', [
    { name: 'Push Sheet to App',  functionName: 'pushToApp' },
    { name: 'Pull App to Sheet',  functionName: 'pullFromApp' },
    { name: '---',                functionName: 'noop' },
    { name: 'Full Sync (both)',   functionName: 'fullSync' },
    { name: '---',                functionName: 'noop' },
    { name: 'Test Connection',    functionName: 'testConnection' },
  ])
}

function noop() {}

// ══════════════════════════════════════════════════════════════════════════════
// PUSH: Sheet → App  (reads sheet, sends data to /api/sheets/push)
// ══════════════════════════════════════════════════════════════════════════════

function pushToApp() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NAME)
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Tab "' + TAB_NAME + '" not found!')
    return
  }

  // Group blocks by workerId to merge multi-block workers
  var workerJobs = {}

  for (var b = 0; b < WORKER_BLOCKS.length; b++) {
    var block = WORKER_BLOCKS[b]
    var wId = block.workerId

    if (!workerJobs[wId]) workerJobs[wId] = []

    for (var row = block.dataStartRow; row <= block.dataEndRow; row++) {
      var jobNo = sheet.getRange(row, block.colJobNo).getValue().toString().trim()
      if (!jobNo) continue

      var type  = sheet.getRange(row, block.colType).getValue().toString().trim()
      var start = sheet.getRange(row, block.colStart).getValue().toString().trim()
      var days  = parseInt(sheet.getRange(row, block.colDays).getValue()) || 1

      // Convert date if it's a Date object
      if (sheet.getRange(row, block.colStart).getValue() instanceof Date) {
        var d = sheet.getRange(row, block.colStart).getValue()
        start = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + (d.getFullYear() % 100).toString().padStart(2, '0')
      } else if (start.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
        // Convert "11-Mar" format to dd/mm/yy
        start = sheetDateToApp(start)
      }

      workerJobs[wId].push({ jobNo: jobNo, type: type, start: start, days: days })
    }
  }

  // Build payload
  var workers = []
  for (var id in workerJobs) {
    workers.push({ workerId: id, jobs: workerJobs[id] })
  }

  var payload = { secret: SECRET, workers: workers }

  try {
    var response = UrlFetchApp.fetch(APP_URL + '/api/sheets/push', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    })

    var code = response.getResponseCode()
    var data = JSON.parse(response.getContentText())

    if (code === 200 && data.success) {
      var s = data.summary
      SpreadsheetApp.getUi().alert(
        '✅ Push complete!\n\n' +
        s.created + ' new jobs added\n' +
        s.updated + ' jobs updated\n' +
        s.deleted + ' jobs removed'
      )
    } else {
      SpreadsheetApp.getUi().alert('❌ Push failed: ' + (data.error || 'Unknown error'))
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Push failed: ' + err.toString())
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PULL: App → Sheet  (fetches data from /api/sheets/pull, writes to sheet)
// ══════════════════════════════════════════════════════════════════════════════

function pullFromApp() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NAME)
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Tab "' + TAB_NAME + '" not found!')
    return
  }

  try {
    var response = UrlFetchApp.fetch(APP_URL + '/api/sheets/pull', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ secret: SECRET }),
      muteHttpExceptions: true,
    })

    var code = response.getResponseCode()
    if (code !== 200) {
      SpreadsheetApp.getUi().alert('❌ Pull failed (HTTP ' + code + '): ' + response.getContentText())
      return
    }

    var data = JSON.parse(response.getContentText())
    var workerBlocks = data.workers

    var totalJobs = 0

    for (var i = 0; i < workerBlocks.length; i++) {
      var wb = workerBlocks[i]
      var block = wb.block
      var jobs = wb.jobs
      var totalRows = block.dataEndRow - block.dataStartRow + 1

      // Map column letters to numbers
      var colJobNo = colToNum(block.colJobNo)
      var colType  = colToNum(block.colType)
      var colStart = colToNum(block.colStart)
      var colComp  = colToNum(block.colComp)
      var colDays  = colToNum(block.colDays)

      for (var r = 0; r < totalRows; r++) {
        var row = block.dataStartRow + r
        if (r < jobs.length) {
          var job = jobs[r]
          sheet.getRange(row, colJobNo).setValue(job.jobNo)
          sheet.getRange(row, colType).setValue(job.type)
          sheet.getRange(row, colStart).setValue(appDateToSheet(job.start))
          sheet.getRange(row, colComp).setValue(appDateToSheet(job.comp))
          sheet.getRange(row, colDays).setValue(job.days)
          totalJobs++
        } else {
          // Clear empty rows
          sheet.getRange(row, colJobNo).setValue('')
          sheet.getRange(row, colType).setValue('')
          sheet.getRange(row, colStart).setValue('')
          sheet.getRange(row, colComp).setValue('')
          sheet.getRange(row, colDays).setValue('')
        }
      }
    }

    SpreadsheetApp.getUi().alert('✅ Pull complete!\n\n' + totalJobs + ' jobs written to sheet')
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Pull failed: ' + err.toString())
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL SYNC — Push then Pull (ensures both sides are in sync)
// ══════════════════════════════════════════════════════════════════════════════

function fullSync() {
  pushToApp()
  // Small delay between operations
  Utilities.sleep(1000)
  pullFromApp()
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-SYNC — called by time-driven trigger (every 5 minutes)
// ══════════════════════════════════════════════════════════════════════════════

function autoSync() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NAME)
  if (!sheet) return

  // Silent push (no UI alerts)
  var workerJobs = {}

  for (var b = 0; b < WORKER_BLOCKS.length; b++) {
    var block = WORKER_BLOCKS[b]
    var wId = block.workerId
    if (!workerJobs[wId]) workerJobs[wId] = []

    for (var row = block.dataStartRow; row <= block.dataEndRow; row++) {
      var jobNo = sheet.getRange(row, block.colJobNo).getValue().toString().trim()
      if (!jobNo) continue

      var type  = sheet.getRange(row, block.colType).getValue().toString().trim()
      var start = sheet.getRange(row, block.colStart).getValue().toString().trim()
      var days  = parseInt(sheet.getRange(row, block.colDays).getValue()) || 1

      if (sheet.getRange(row, block.colStart).getValue() instanceof Date) {
        var d = sheet.getRange(row, block.colStart).getValue()
        start = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + (d.getFullYear() % 100).toString().padStart(2, '0')
      } else if (start.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
        start = sheetDateToApp(start)
      }

      workerJobs[wId].push({ jobNo: jobNo, type: type, start: start, days: days })
    }
  }

  var workers = []
  for (var id in workerJobs) {
    workers.push({ workerId: id, jobs: workerJobs[id] })
  }

  try {
    UrlFetchApp.fetch(APP_URL + '/api/sheets/push', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ secret: SECRET, workers: workers }),
      muteHttpExceptions: true,
    })
  } catch (err) {
    console.error('Auto-sync push failed: ' + err.toString())
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ON EDIT — pushes single cell changes in real-time (optional trigger)
// ══════════════════════════════════════════════════════════════════════════════

function onEditTrigger(e) {
  var sheet = e.source.getActiveSheet()
  if (sheet.getName() !== TAB_NAME) return

  // Debounce — let autoSync handle it, or trigger a silent push
  Utilities.sleep(500)
  autoSync()
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST CONNECTION
// ══════════════════════════════════════════════════════════════════════════════

function testConnection() {
  try {
    var response = UrlFetchApp.fetch(APP_URL + '/api/sheets/pull', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ secret: SECRET }),
      muteHttpExceptions: true,
    })

    var code = response.getResponseCode()
    if (code === 200) {
      var data = JSON.parse(response.getContentText())
      SpreadsheetApp.getUi().alert(
        '✅ Connection successful!\n\n' +
        'App URL: ' + APP_URL + '\n' +
        'Workers found: ' + data.workers.length
      )
    } else {
      SpreadsheetApp.getUi().alert('❌ Connection failed (HTTP ' + code + ')\n\n' + response.getContentText())
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Connection failed:\n\n' + err.toString())
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function sheetDateToApp(str) {
  // "11-Mar" → "11/03/26"
  if (!str) return ''
  var m = str.match(/^(\d{1,2})-([A-Za-z]{3})$/)
  if (!m) return str
  var day = pad(parseInt(m[1]))
  var monthIdx = -1
  for (var i = 0; i < MONTHS.length; i++) {
    if (MONTHS[i].toLowerCase() === m[2].toLowerCase()) { monthIdx = i; break }
  }
  if (monthIdx === -1) return str
  var month = pad(monthIdx + 1)
  var year = (new Date().getFullYear() % 100).toString().padStart(2, '0')
  return day + '/' + month + '/' + year
}

function appDateToSheet(str) {
  // "11/03/26" → "11-Mar"
  if (!str) return ''
  var parts = str.split('/')
  if (parts.length !== 3) return str
  var day = parseInt(parts[0])
  var monthIdx = parseInt(parts[1]) - 1
  if (monthIdx < 0 || monthIdx > 11) return str
  return day + '-' + MONTHS[monthIdx]
}

function colToNum(letter) {
  // "A" → 1, "M" → 13, etc.
  var num = 0
  for (var i = 0; i < letter.length; i++) {
    num = num * 26 + (letter.charCodeAt(i) - 64)
  }
  return num
}
