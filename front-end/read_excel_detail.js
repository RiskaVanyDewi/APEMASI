
import ExcelJS from 'exceljs';
import path from 'path';

const filePath = path.resolve('../ANYAR Hitungan Apemasi 2025.xlsx');

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet('Qhitung');
    if (!sheet) {
        console.log("Sheet Qhitung not found. Available sheets:");
        workbook.eachSheet((s, id) => console.log(id, s.name));
        return;
    }

    // Helper to get text value
    const getCellText = (cell) => {
        if (!cell) return '';
        if (typeof cell.value === 'object') {
            if (cell.value && cell.value.richText) {
                return cell.value.richText.map(t => t.text).join('');
            }
            if (cell.value && cell.value.result !== undefined) {
                return String(cell.value.result);
            }
            return JSON.stringify(cell.value);
        }
        return String(cell.value);
    };

    console.log(`\n--- ${sheet.name} Content (Rows 1-20) ---`);

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 20) {
            const rowData = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                rowData[colNumber] = getCellText(cell);
            });
            console.log(`Row ${rowNumber}:`, rowData.filter(x => x).join(' | '));
        }
    });
}

readExcel().catch(console.error);
