const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
  const filePath = 'C:/Users/PC/.gemini/antigravity/brain/c98a0142-50fb-470e-888f-14aa0669e606/.user_uploaded/media_1793617921877_55d5747f.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('Worksheet count:', workbook.worksheets.length);
  workbook.worksheets.forEach((ws, idx) => {
    console.log(`Sheet ${idx}: ${ws.name}, rowCount: ${ws.rowCount}`);
  });

  const sheet = workbook.worksheets[0];
  console.log('\n--- First 30 rows ---');
  for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values.push(`[${colNumber}] ${cell.value}`);
    });
    if (values.length > 0) {
      console.log(`Row ${r}:`, values.join(' | '));
    }
  }
}

inspect().catch(console.error);
