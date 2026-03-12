const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Atyab_Menu_Import.xlsx');
const workbook = XLSX.readFile(filePath);

console.log("Sheet Names:", workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(data.slice(0, 5)); // Print first 5 rows to understand the structure
});
