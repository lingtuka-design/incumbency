import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import crypto from 'node:crypto';

const baseDir = path.resolve('data/excel_iii');
const depts = ['DC', 'GAD', 'PWD', 'SAD', 'SWC'];

const deptMeta = {
  DC: { name: 'Deputy Commissioner Office', sortOrder: 49 },
  GAD: { name: 'General Administration Department', sortOrder: 50 },
  PWD: { name: 'Public Works Department', sortOrder: 51 },
  SAD: { name: 'Secretariat Administration Department', sortOrder: 52 },
  SWC: { name: 'Land Resources, Soil & Water Conservation', sortOrder: 53 },
};

function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).trim().replace(/'/g, "''")}'`;
}

const statements = [];

// Fix LGM department name in departments table
statements.push(`UPDATE departments SET name = 'Legal Metrology Department' WHERE code = 'LGM';`);

// Insert the 5 new departments
for (const [code, meta] of Object.entries(deptMeta)) {
  statements.push(`INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('${code}', '${meta.name}', 'Government Department', ${meta.sortOrder});`);
}

let totalRecords = 0;
const countsPerDept = {};

for (const dept of depts) {
  countsPerDept[dept] = 0;
  const deptDir = path.join(baseDir, dept);
  if (!fs.existsSync(deptDir)) continue;

  const files = fs.readdirSync(deptDir).filter(f => f.endsWith('.xlsx'));
  files.sort();

  for (const file of files) {
    const parts = file.replace('.xlsx', '').trim().split(/\s+/);
    const advType = parts[1];

    const wb = xlsx.readFile(path.join(deptDir, file));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    for (let r = 2; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[1] || !String(row[1]).trim()) continue;
      const rawCode = row[0];
      if (rawCode === undefined || rawCode === null || !String(rawCode).trim()) continue;

      const codeNum = parseInt(String(rawCode).trim(), 10);
      const paddedCode = String(codeNum).padStart(3, '0');
      const formattedCode = `${advType}/${dept}/${paddedCode}`;

      const name = String(row[1]).trim();
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
        `INSERT OR IGNORE INTO incumbencies (id, department_code, advance_type, code, name, designation, father_name, superannuation, rg_number, status, remarks, created_at, updated_at) VALUES ('${id}', '${dept}', '${advType}', '${formattedCode}', ${esc(name)}, ${esc(desig)}, ${esc(father)}, NULL, NULL, '${status}', ${esc(remarks)}, unixepoch(), unixepoch());`
      );

      totalRecords++;
      countsPerDept[dept]++;
    }
  }
}

const outFile = path.resolve('data/incumbency-iii.sql');
fs.writeFileSync(outFile, statements.join('\n') + '\n', 'utf8');

console.log('SQL generated successfully at:', outFile);
console.log('Total statements:', statements.length);
console.log('Total incumbency records:', totalRecords);
console.log('Counts per department:', countsPerDept);
