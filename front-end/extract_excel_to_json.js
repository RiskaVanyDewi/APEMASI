
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

    // Define logic to match labels with keys
    // Label in Col 2 (B). Value in Col 5 (E) or Col 6 (F)?
    // Based on logs: [null, null, "Luas...", null, ":", 1215] -> Index 2 (Label), Index 5 (Value).
    // Note: ExcelJS getCell(1) is A. getCell(2) is B. getCell(5) is E.

    const headerData = {};

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 15) return;

        const label = row.getCell(2).text;
        // Try value from Col 5 or Col 6
        let val = row.getCell(5).value;

        // Helper to extract result
        const extract = (v) => (v && typeof v === 'object' && v.result !== undefined) ? v.result : v;
        let finalVal = extract(val);

        // If null, try Col 6 (maybe indentation differs?)
        if (finalVal === null || finalVal === undefined) {
            finalVal = extract(row.getCell(6).value);
        }

        if (label) {
            if (label.includes('Luas Baku Permen')) headerData.luas_baku_permen = finalVal;
            if (label.includes('Luas Baku IGT')) headerData.luas_baku_igt = finalVal;
            if (label.includes('Alih Fungsi Total')) headerData.alih_fungsi_total = finalVal;
            if (label.includes('Qkebutuhan')) headerData.q_kebutuhan_bendung = finalVal;
            if (label.includes('Qtersedia bendung')) headerData.q_tersedia_bendung = finalVal;
            if (label.includes('Qtersedia saluran')) headerData.q_tersedia_saluran = finalVal;
            if (label.includes('Faktor K')) headerData.faktor_k = finalVal;
            if (label.includes('RPPA')) headerData.rppa_irigasi = finalVal;
        }
    });

    // Structures extraction (Keeping it same)
    const structures = [];
    let currentBagi = null;
    let lastNo = 0;

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber < 12) return;

        // Helper for structures (assuming column structure is consistent)
        // Col 3: No, Col 4: Nom, Col 5: Sadap, Col 6: HM, Col 7: Lokasi, Col 8: Luas
        // (Based on earlier assumptions. Let's stick to them)

        // Actually, earlier logs: [null, null, 1, "B.ACN.0...", ...]
        // Index 0:null, 1:null, 2:1 -> Col 2 is No?
        // Wait. Step 111 Sheet 1 had No at index 2.
        // Sheet Qhitung? Step 125 logs row 16.
        // Row 16: "4.24..." ... hard to read.
        // Let's rely on Step 134 logs.
        // "Row 18: 5 | B.ACN.3 | Cr.ACN.3 Ka | 25+04 ..."
        // 5 -> Col 2? Or Col 3?
        // Let's look at `extract_excel_to_json.js` Step 136: `const no = getVal(3);`
        // And it worked (Step 143 "Extracted 40 structures").
        // So Col 3 is No. Col 4 is Nom.

        const getVal = (idx) => {
            const cell = row.getCell(idx);
            if (cell.value && typeof cell.value === 'object') {
                if (cell.value.result !== undefined) return cell.value.result;
                return cell.value.text || null;
            }
            return cell.value;
        };

        const no = getVal(3);
        const nomenklatur = getVal(4);
        const namaSadap = getVal(5);
        const hm = getVal(6);
        const desa = getVal(7);
        const luas = getVal(8);

        if (nomenklatur && String(nomenklatur).trim() !== '') {
            currentBagi = {
                nomenklatur: String(nomenklatur).trim(),
                hm: hm ? String(hm) : null,
                lokasi: desa ? String(desa) : null,
                order_no: typeof no === 'number' ? no : (parseInt(no) || lastNo + 1),
                sadaps: []
            };
            structures.push(currentBagi);
            lastNo = currentBagi.order_no;
        }

        if (currentBagi && namaSadap && String(namaSadap).trim() !== '') {
            const name = String(namaSadap).trim();
            let side = 'Ka';
            if (name.toLowerCase().includes('ki') || name.toLowerCase().includes('kiri')) side = 'Ki';

            currentBagi.sadaps.push({
                nomenklatur: name,
                side: side,
                area: luas ? parseFloat(luas) : 0
            });
        }
    });

    const finalOutput = {
        di_data: headerData,
        structures: structures
    };

    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`Extracted DI Data:`, JSON.stringify(headerData, null, 2));
}

extractData().catch(console.error);
