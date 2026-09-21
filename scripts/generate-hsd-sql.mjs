import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import crypto from 'node:crypto';

const dir = path.resolve('data/excel_hsd');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
files.sort();

function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).trim().replace(/'/g, "''")}'`;
}

const statements = [];

// Insert HSD department
statements.push(
  `INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('HSD', 'Health & Family Welfare Department', 'Government Department', 54);`
);

let totalRecords = 0;
const countsPerAdv = {};

for (const file of files) {
  const wb = xlsx.readFile(path.join(dir, file));
  const sheet = wb.Sheets['HBA_DAT Records'];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let currentAdv = null;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const firstCell = row[0] ? String(row[0]).trim() : '';

    if (firstCell.includes('/HSD')) {
      if (firstCell.includes('CAR')) currentAdv = 'CAR';
      else if (firstCell.includes('SCL')) currentAdv = 'SCL';
      else if (firstCell.includes('COM')) currentAdv = 'COM';
      else if (firstCell.includes('HBA')) currentAdv = 'HBA';
      else if (firstCell.includes('SA')) currentAdv = 'SA';
      if (!countsPerAdv[currentAdv]) countsPerAdv[currentAdv] = 0;
      continue;
    }
    if (firstCell.toLowerCase() === 'code') continue;

    const rawCode = row[0];
    const rawName = row[1];
    if (rawName && String(rawName).trim() && rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
      const codeNum = parseInt(String(rawCode).trim(), 10);
      const paddedCode = String(codeNum).padStart(3, '0');
      const formattedCode = `${currentAdv}/HSD/${paddedCode}`;

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
        `INSERT OR IGNORE INTO incumbencies (id, department_code, advance_type, code, name, designation, father_name, superannuation, rg_number, status, remarks, created_at, updated_at) VALUES ('${id}', 'HSD', '${currentAdv}', '${formattedCode}', ${esc(name)}, ${esc(desig)}, ${esc(father)}, NULL, NULL, '${status}', ${esc(remarks)}, unixepoch(), unixepoch());`
      );

      totalRecords++;
      countsPerAdv[currentAdv]++;
    }
  }
}

const outFile = path.resolve('data/incumbency-hsd.sql');
fs.writeFileSync(outFile, statements.join('\n') + '\n', 'utf8');

console.log('SQL generated at:', outFile);
console.log('Total statements:', statements.length);
console.log('Total HSD records:', totalRecords);
console.log('Counts per advance type:', countsPerAdv);
