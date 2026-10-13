
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const excelPath = path.resolve('../ANYAR Hitungan Apemasi 2025.xlsx');
const outputPath = path.resolve('../backend/database/seeders/data_import.json');

async function extractData() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Qhitung');
    if (!sheet) {
        console.error("Sheet Qhitung not found");
        return;
    }

    // Extract Structure Data for "SALURAN ARCA KANAN" and "SALURAN ARCA KIRI"

    // Need to find rows where these headers appear to separate sections.
    // Based on screenshot:
    // "A SALURAN ARCA KANAN"
    // "B SALURAN ARCA KIRI"

    let section = null; // 'KANAN' or 'KIRI'

    const structures = [];
    let currentBagi = null;
    let lastNo = 0;

    // Iterate all rows to find sections and data
    sheet.eachRow((row, rowNumber) => {
        // Check for Section Headers
        const firstCell = row.getCell(1).text;
        const secondCell = row.getCell(2).text;

        // Sometimes merged cells make text appear in different columns access.
        // Let's check text content of row regardless of column.

        // Check if row contains section title
        const rowText = row.values.join(' ').toUpperCase();

        if (secondCell && secondCell.toUpperCase().includes('SALURAN ARCA KANAN')) {
            section = 'KANAN';
            currentBagi = null; // Reset
            return;
        }
        if (secondCell && secondCell.toUpperCase().includes('SALURAN ARCA KIRI')) {
            section = 'KIRI';
            currentBagi = null; // Reset
            return;
        }

        // Stop if we hit a footer or total line
        if (!section) return; // Haven't started yet

        // Skip header rows "No | Nomenklatur | ..."
        if (rowText.includes('NOMENKLATUR') && rowText.includes('LOKASI')) return;

        // Helper to get Value
        const getVal = (idx) => {
            const cell = row.getCell(idx);
            if (cell.value && typeof cell.value === 'object') {
                if (cell.value.result !== undefined) return cell.value.result;
                return cell.value.text || null;
            }
            return cell.value;
        };

        // The columns mapping seems to be:
        // 2: No (Maybe Col A is empty?) 
        // Wait, in previous extraction "No" was at index 3. Let's re-verify.
        // Screenshot 1: Col A is "A SALURAN ARCA KANAN". NO is below A.
        // So Col 1 (A) is "No". Col 2 (B) is "Nomenklatur" (Bangunan Bagi). 
        // Col 3 (C) is "Nomenklatur" (Bangunan Sadap/Petak).
        // Col 4 (D) is "Hm". Col 5 (E) is "Lokasi".

        // Let's adjust indices based on Screenshot visual (1-based ExcelJS):
        // 1: No
        // 2: Nomenklatur (Bagi)
        // 3: Nomenklatur (Sadap)
        // 4: HM
        // 5: Lokasi
        // 6: A IGT (Ha)

        const no = getVal(1);
        const nomenklatur = getVal(2);
        const namaSadap = getVal(3);
        const hm = getVal(4);
        const desa = getVal(5);
        const luas = getVal(6);

        // If No exists, it's a new row.
        // Check if it is a valid data row (contains number in No column or valid Nomenklatur)

        // If 'No' is numeric, start new Bagi
        if (no && (typeof no === 'number' || parseInt(no) > 0)) {
            // New Main Structure
            if (nomenklatur && String(nomenklatur).trim() !== '') {
                currentBagi = {
                    section: section, // 'KANAN' or 'KIRI'
                    nomenklatur: String(nomenklatur).trim(),
                    hm: hm ? String(hm) : null,
                    lokasi: desa ? String(desa) : null,
                    order_no: parseInt(no),
                    sadaps: []
                };
                structures.push(currentBagi);
            }
        } else {
            // If No is empty, but Nomenklatur is present, might be same Bagi? 
            // Or if Nomenklatur is empty but Sadap is present -> additional sadap for same Bagi.

            // However, looking at screenshot:
            // Row 4: "4 | Cr. ACN. 2 | Cr. ACN. 2 | ..."
            // Next line: " | | Cr. ACN. 2 | ..." -> Merged row essentially? Or second sadap?
            // Row 5: "5 | B. ACN. 3 | Cr. ACN. 3 | ..."
            // Next line: " | | Cr. ACN. 3 | ..." 

            // Logic: if currentBagi exists and Sadap column has value, add it.
        }

        // Add Sadap
        if (currentBagi && namaSadap && String(namaSadap).trim() !== '') {
            const name = String(namaSadap).trim();
            let side = 'Ka';
            if (name.toLowerCase().includes('ki') || name.toLowerCase().includes('kiri')) side = 'Ki';

            // Check if sadap already added? (For merged cells scenarios where main row adds it)
            // Screenshot shows duplicate text often if cell is not merged? 
            // Usually excel reader reads top-left of merged cell.
            // Row 4: Sadap "Cr. ACN. 2". Next line Sadap "Cr. ACN. 2" ?
            // Visual screenshot: "Cr. ACN. 2" top line. Bottom line "Cr. ACN. 2" (Wait, row 4 has 4. Next line empty No).

            // Let's filter duplicates later or just add all potentially.
            // But see Row 4: "Cr. ACN. 2" (Sadap) with Area 2.71.
            // Next line: "Cr. ACN. 2" (Sadap) with Area 0.47? 
            // Ah, different areas! So they are distinct items (maybe different sides or breakdown).

            currentBagi.sadaps.push({
                nomenklatur: name,
                side: side,
                area: luas ? parseFloat(luas) : 0
            });
        }
    });

    const finalOutput = {
        structures: structures
    };

    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`Extracted ${structures.length} structures (Kanan/Kiri).`);
}

extractData().catch(console.error);
