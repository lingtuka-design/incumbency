import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import crypto from 'node:crypto';

const dir = path.resolve('data/excel_pol');
const files = ['HBA_POL.xlsx', 'SA_POL.xlsx'];

function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).trim().replace(/'/g, "''")}'`;
}

const statements = [];

// Insert POL department
statements.push(
  `INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('POL', 'Police Department', 'Government Department', 57);`
);

let totalRecords = 0;
const counts = { HBA: 0, SA: 0 };

for (const file of files) {
  const adv = file.includes('HBA') ? 'HBA' : 'SA';
  const wb = xlsx.readFile(path.join(dir, file));
  const sheet = wb.Sheets['HBA_DAT Records'];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const rawCode = row[0];
    const rawName = row[1];
    if (!rawName || !String(rawName).trim()) continue;
    if (rawCode === undefined || rawCode === null || !String(rawCode).trim()) continue;

    const codeNum = parseInt(String(rawCode).trim(), 10);
    const paddedCode = String(codeNum).padStart(3, '0');
    const formattedCode = `${adv}/POL/${paddedCode}`;

    const name = String(rawName).trim();
    const desig = row[2] !== undefined && row[2] !== null && String(row[2]).trim() !== '' ? String(row[2]).trim() : null;
    const father = row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== '' ? String(row[3]).trim() : null;
    const remRaw = row[4] !== undefined && row[4] !== null && String(row[4]).trim() !== '' ? String(row[4]).trim() : null;

    let status = 'ACTIVE';
    let remarks = null;
    if (remRaw && remRaw.toLowerCase().includes('close')) {
      status = 'CLOSED';
      remarks = 'Closed';
    } else if (remRaw) {
      remarks = remRaw;
    }

    const id = crypto.randomUUID();

    statements.push(
      `INSERT OR IGNORE INTO incumbencies (id, department_code, advance_type, code, name, designation, father_name, superannuation, rg_number, status, remarks, created_at, updated_at) VALUES ('${id}', 'POL', '${adv}', '${formattedCode}', ${esc(name)}, ${esc(desig)}, ${esc(father)}, NULL, NULL, '${status}', ${esc(remarks)}, unixepoch(), unixepoch());`
    );

    totalRecords++;
    counts[adv]++;
  }
}

const outFile = path.resolve('data/incumbency-pol.sql');
fs.writeFileSync(outFile, statements.join('\n') + '\n', 'utf8');

console.log('SQL generated at:', outFile);
console.log('Total statements:', statements.length);
console.log('Total POL records:', totalRecords);
console.log('Counts per advance type:', counts);
