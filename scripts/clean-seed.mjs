import fs from 'node:fs';
import path from 'node:path';

const sqlPath = path.resolve('data/seed.sql');
const content = fs.readFileSync(sqlPath, 'utf8');
const lines = content.split('\n');

const validLines = [];
let skipped = 0;

for (const line of lines) {
  if (!line.trim()) continue;

  // Check if it is an incumbency insert
  if (line.includes('INSERT OR REPLACE INTO incumbencies')) {
    // Check if name is NULL: values ('id', 'dept', 'type', 'code', NULL, ...)
    // Match the values clause:
    // VALUES ('id', 'dept', 'type', 'code', name, ...)
    const valuesPart = line.substring(line.indexOf('VALUES ('));
    // If the 5th parameter is NULL or ''
    // A regex to check if 5th param is NULL
    if (/VALUES\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*('[^']*'|NULL)\s*,\s*NULL\s*,/i.test(valuesPart) ||
        /VALUES\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*('[^']*'|NULL)\s*,\s*''\s*,/i.test(valuesPart)) {
      skipped++;
      continue;
    }
  }
  validLines.push(line);
}

console.log(`Original: ${lines.length}, Skipped invalid/null names: ${skipped}, Remaining valid: ${validLines.length}`);
fs.writeFileSync(path.resolve('data/seed-clean.sql'), validLines.join('\n'));
