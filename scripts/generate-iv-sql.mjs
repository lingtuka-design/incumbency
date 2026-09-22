import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import crypto from 'node:crypto';

const baseDir = path.resolve('data/excel_iv');

function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).trim().replace(/'/g, "''")}'`;
}

const statements = [];

// Insert departments
statements.push(
  `INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('G&M', 'Geology & Mineral Resources Department', 'Government Department', 55);`
);
statements.push(
  `INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('SIPMIU', 'State Investment Program Management & Implementation Unit', 'Government Department', 56);`
);

let totalRecords = 0;
const counts = {};

for (const folder of ['G&M', 'SIPMIU']) {
  const fPath = path.join(baseDir, folder);
  const files = fs.readdirSync(fPath).filter(f => f.endsWith('.xlsx'));
  files.sort();

  for (const file of files) {
    const wb = xlsx.readFile(path.join(fPath, file));
    const sheet = wb.Sheets['HBA_DAT Records'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let currentAdv = null;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const first = row[0] ? String(row[0]).trim() : '';

      if (first.includes('/' + folder)) {
        currentAdv = first.split('/')[0].trim();
        continue;
      }
      if (first.toLowerCase() === 'code') continue;

      const rawCode = row[0];
      const rawName = row[1];
      if (rawName && String(rawName).trim() && rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
        const codeNum = parseInt(String(rawCode).trim(), 10);
        const paddedCode = String(codeNum).padStart(3, '0');
        const formattedCode = `${currentAdv}/${folder}/${paddedCode}`;

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
          `INSERT OR IGNORE INTO incumbencies (id, department_code, advance_type, code, name, designation, father_name, superannuation, rg_number, status, remarks, created_at, updated_at) VALUES ('${id}', '${folder}', '${currentAdv}', '${formattedCode}', ${esc(name)}, ${esc(desig)}, ${esc(father)}, NULL, NULL, '${status}', ${esc(remarks)}, unixepoch(), unixepoch());`
        );

        totalRecords++;
        const key = `${folder}-${currentAdv}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }
}

const outFile = path.resolve('data/incumbency-iv.sql');
fs.writeFileSync(outFile, statements.join('\n') + '\n', 'utf8');

console.log('SQL generated at:', outFile);
console.log('Total statements:', statements.length);
console.log('Total incumbency records:', totalRecords);
console.log('Counts per department & advance type:', counts);
