const XLSX = require('xlsx')
const path = 'C:\\Users\\User\\Downloads\\Hardox kits (2).xlsx'
const wb = XLSX.readFile(path)
wb.SheetNames.forEach(name => {
  console.log('=== SHEET:', name, '===')
  const ws = wb.Sheets[name]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  data.forEach((row, i) => {
    if (i < 80) console.log('Row', i, ':', JSON.stringify(row))
  })
  console.log('Total rows:', data.length)
  if (ws['!merges']) console.log('Merges:', JSON.stringify(ws['!merges']))
  if (ws['!ref']) console.log('Range:', ws['!ref'])
})
