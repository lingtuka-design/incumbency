import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const sqlContent = fs.readFileSync(path.resolve('data/seed.sql'), 'utf8');
const lines = sqlContent.split('\n').filter(l => l.trim().length > 0);

console.log(`Total statements to seed remotely: ${lines.length}`);
const BATCH_SIZE = 100;
const tempDir = path.resolve('data/chunks');
fs.mkdirSync(tempDir, { recursive: true });

const totalBatches = Math.ceil(lines.length / BATCH_SIZE);
console.log(`Executing ${totalBatches} batches to remote D1...`);

for (let b = 0; b < totalBatches; b++) {
  const slice = lines.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
  const chunkFile = path.join(tempDir, `chunk_${b}.sql`);
  fs.writeFileSync(chunkFile, slice.join('\n'));

  process.stdout.write(`Batch ${b + 1}/${totalBatches}... `);
  try {
    execSync(`npx wrangler d1 execute incumbency-db --remote --file="${chunkFile}" --yes`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    console.log('✓');
  } catch (err) {
    console.log(`retrying batch ${b + 1}...`);
    try {
      execSync(`npx wrangler d1 execute incumbency-db --remote --file="${chunkFile}" --yes`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      console.log('✓ (retry ok)');
    } catch (e2) {
      console.error(`Failed batch ${b + 1}:`, e2.message);
    }
  }

  // Clean up chunk
  try { fs.unlinkSync(chunkFile); } catch (e) {}
}

console.log('Remote D1 seeding completed!');
