import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Find the D1 sqlite file in .wrangler
const d1Dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files = fs.readdirSync(d1Dir);
const sqliteFile = files.find(f => f.endsWith('.sqlite') && !f.startsWith('metadata'));

if (!sqliteFile) {
  console.error('SQLite file not found in', d1Dir);
  process.exit(1);
}

const dbPath = path.join(d1Dir, sqliteFile);
console.log('Targeting SQLite DB:', dbPath);

const db = new DatabaseSync(dbPath);

const sqlContent = fs.readFileSync(path.resolve('data/seed.sql'), 'utf8');
const lines = sqlContent.split('\n').filter(l => l.trim().length > 0);

console.log(`Executing ${lines.length} statements in a transaction...`);
const start = Date.now();

db.exec('BEGIN TRANSACTION;');
for (let i = 0; i < lines.length; i++) {
  try {
    db.exec(lines[i]);
  } catch (err) {
    if (i < 50) console.error(`Error at line ${i}:`, err.message);
  }
}
db.exec('COMMIT;');

const elapsed = Date.now() - start;
console.log(`Done in ${elapsed}ms!`);

// Verify counts
const [deptCount] = db.prepare('SELECT count(*) as count FROM departments;').all();
const [typeCount] = db.prepare('SELECT count(*) as count FROM advance_types;').all();
const [incCount] = db.prepare('SELECT count(*) as count FROM incumbencies;').all();

console.log('Verified Counts:');
console.log('Departments:', deptCount.count);
console.log('Advance Types:', typeCount.count);
console.log('Incumbencies:', incCount.count);
