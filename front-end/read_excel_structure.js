
import ExcelJS from 'exceljs';
import path from 'path';

const filePath = path.resolve('../ANYAR Hitungan Apemasi 2025.xlsx');

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('Worksheets:');
  workbook.eachSheet((sheet, id) => {
    console.log(`\n--- Sheet ${id}: ${sheet.name} ---`);
    
    // Read first few rows to understand structure
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 5) {
        rows.push(row.values);
      }
    });
    console.log(JSON.stringify(rows, null, 2));
  });
}

readExcel().catch(console.error);
