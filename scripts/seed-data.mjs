import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import { DEPARTMENTS, ADVANCE_TYPES, detectAdvanceType } from './extract-drive.mjs';

const EXCEL_CACHE_DIR = path.resolve('data/excel');
fs.mkdirSync(EXCEL_CACHE_DIR, { recursive: true });

async function getFolderHtml(folderId) {
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return await res.text();
  } catch (e) {
    return '';
  }
}

function extractFilesFromHtml(html) {
  const files = [];
  const fileRegex = /"([a-zA-Z0-9_-]{28,40})"[^\]]*?"([^"\n]+\.(?:xlsx|xls))"/g;
  let m;
  while ((m = fileRegex.exec(html)) !== null) {
    files.push({ id: m[1], name: m[2] });
  }

  const regex2 = /\[\s*null\s*,\s*"([a-zA-Z0-9_-]{28,40})"\s*\][\s\S]*?"([^"]+\.(?:xlsx|xls))"/g;
  while ((m = regex2.exec(html)) !== null) {
    if (!files.some(f => f.id === m[1])) {
      files.push({ id: m[1], name: m[2] });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const f of files) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      unique.push(f);
    }
  }
  return unique;
}

async function downloadFile(fileId, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
    return true;
  }
  const urls = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 500) {
          fs.writeFileSync(destPath, Buffer.from(buffer));
          return true;
        }
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return false;
}

export function parseExcelFile(filePath, deptCode, defaultType) {
  const records = [];
  try {
    const wb = xlsx.readFile(filePath);
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length === 0) continue;

      let headerIdx = -1;
      let colMap = { code: 0, name: 1, designation: 2, fatherName: -1, remarks: 4 };

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i] || [];
        const strRow = row.map(c => String(c || '').toLowerCase().trim());
        const hasCode = strRow.some(s => s === 'code' || s.includes('code') || s === 'sl' || s === 'sl no' || s === 'sl.no');
        const hasName = strRow.some(s => s === 'name' || s.includes('name of employee') || s.includes('employee name'));
        if (hasCode || hasName) {
          headerIdx = i;
          strRow.forEach((col, cIdx) => {
            if (col === 'code' || col.includes('code') || col === 'sl' || col === 'sl.no' || col === 'sl no') colMap.code = cIdx;
            else if (col === 'name' || col.includes('name of') || col.includes('employee')) colMap.name = cIdx;
            else if (col.includes('desig')) colMap.designation = cIdx;
            else if (col.includes('father') || col.includes('parent')) colMap.fatherName = cIdx;
            else if (col.includes('remark') || col.includes('status')) colMap.remarks = cIdx;
          });
          break;
        }
      }

      const startRow = headerIdx >= 0 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        let code = String(row[colMap.code] !== undefined ? row[colMap.code] : '').trim();
        let name = String(row[colMap.name] !== undefined ? row[colMap.name] : '').trim();
        let designation = colMap.designation >= 0 && row[colMap.designation] !== undefined ? String(row[colMap.designation]).trim() : '';
        let fatherName = colMap.fatherName >= 0 && row[colMap.fatherName] !== undefined ? String(row[colMap.fatherName]).trim() : '';
        let remarks = colMap.remarks >= 0 && row[colMap.remarks] !== undefined ? String(row[colMap.remarks]).trim() : '';

        if (!name && !code) continue;
        if (name.toLowerCase() === 'name' || code.toLowerCase() === 'code' || name.toLowerCase().includes('total')) continue;
        if (!name && code) {
          if (isNaN(Number(code)) && code.length > 2) {
            name = code;
            code = String(records.length + 1).padStart(3, '0');
          }
        }
        if (!code) {
          code = String(records.length + 1).padStart(3, '0');
        }

        let status = 'ACTIVE';
        const remLower = (remarks || '').toLowerCase();
        if (remLower.includes('closed') || remLower.includes('close') || remLower.includes('nil') || remLower.includes('completed') || remLower.includes('settled')) {
          status = 'CLOSED';
        }

        records.push({
          id: crypto.randomUUID(),
          departmentCode: deptCode,
          advanceType: defaultType,
          code,
          name,
          designation: designation || null,
          fatherName: fatherName || null,
          remarks: remarks || null,
          status,
        });
      }
    }
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
  }
  return records;
}

async function run() {
  console.log('Starting Department & Advance Types SQL seeding generation...');
  const statements = [];

  for (const t of ADVANCE_TYPES) {
    statements.push(`INSERT OR REPLACE INTO advance_types (code, name, description, sort_order) VALUES ('${t.code}', '${t.name.replace(/'/g, "''")}', '', ${t.sortOrder});`);
  }

  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const d = DEPARTMENTS[i];
    statements.push(`INSERT OR REPLACE INTO departments (code, name, category, sort_order) VALUES ('${d.code.replace(/'/g, "''")}', '${d.name.replace(/'/g, "''")}', 'Government Department', ${i + 1});`);
  }

  console.log(`Processing 40 departments...`);
  const allRecords = [];

  for (const dept of DEPARTMENTS) {
    process.stdout.write(`Fetching ${dept.code}... `);
    try {
      const html = await getFolderHtml(dept.folderId);
      const files = extractFilesFromHtml(html);
      console.log(`found ${files.length} files`);
      for (const file of files) {
        const advType = detectAdvanceType(file.name);
        const safeName = `${dept.code}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const localPath = path.join(EXCEL_CACHE_DIR, safeName);
        const ok = await downloadFile(file.id, localPath);
        if (ok) {
          const recs = parseExcelFile(localPath, dept.code, advType);
          allRecords.push(...recs);
          console.log(`  ✓ ${file.name} -> ${recs.length} records`);
        } else {
          console.log(`  ⚠ ${file.name} download skipped / timeout`);
        }
      }
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }

  // Also read any cached files in data/excel that might not have been matched
  const cached = fs.readdirSync(EXCEL_CACHE_DIR);
  for (const cf of cached) {
    if (!cf.endsWith('.xlsx') && !cf.endsWith('.xls')) continue;
    const deptPrefix = cf.split('_')[0];
    if (DEPARTMENTS.some(d => d.code === deptPrefix)) {
      // verify if already parsed
    }
  }

  console.log(`\nTotal incumbencies parsed: ${allRecords.length}`);

  for (const r of allRecords) {
    const esc = (s) => (s ? `'${String(s).replace(/'/g, "''")}'` : 'NULL');
    statements.push(`INSERT OR REPLACE INTO incumbencies (id, department_code, advance_type, code, name, designation, father_name, remarks, status, created_at, updated_at) VALUES ('${r.id}', '${r.departmentCode}', '${r.advanceType}', ${esc(r.code)}, ${esc(r.name)}, ${esc(r.designation)}, ${esc(r.fatherName)}, ${esc(r.remarks)}, '${r.status}', strftime('%s','now')*1000, strftime('%s','now')*1000);`);
  }

  const sqlFile = path.resolve('data/seed.sql');
  fs.mkdirSync(path.dirname(sqlFile), { recursive: true });
  fs.writeFileSync(sqlFile, statements.join('\n'));
  console.log(`Saved ${statements.length} SQL statements to ${sqlFile}`);

  fs.writeFileSync(path.resolve('data/seed-incumbencies.json'), JSON.stringify(allRecords, null, 2));
}

run();
