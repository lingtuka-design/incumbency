import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const isRemote = process.argv.includes('--remote');
const targetMode = isRemote ? '--remote' : '--local';

console.log(`Starting PHE database update on ${isRemote ? 'REMOTE' : 'LOCAL'} D1...`);

const sqlContent = fs.readFileSync(path.resolve('data/phe-update.sql'), 'utf8');
const lines = sqlContent.split('\n').filter(l => l.trim().length > 0);

console.log(`Total statements to execute: ${lines.length}`);
const BATCH_SIZE = 100;
const tempDir = path.resolve('data/chunks_phe');
fs.mkdirSync(tempDir, { recursive: true });

const totalBatches = Math.ceil(lines.length / BATCH_SIZE);
console.log(`Executing ${totalBatches} batches to ${isRemote ? 'remote' : 'local'} D1...`);

for (let b = 0; b < totalBatches; b++) {
  const slice = lines.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
  const chunkFile = path.join(tempDir, `chunk_phe_${b}.sql`);
  fs.writeFileSync(chunkFile, slice.join('\n'));

  process.stdout.write(`Batch ${b + 1}/${totalBatches}... `);
  try {
    execSync(`npx wrangler d1 execute incumbency-db ${targetMode} --file="${chunkFile}" --yes`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    console.log('✓');
  } catch (err) {
    console.log(`retrying batch ${b + 1}...`);
    try {
      execSync(`npx wrangler d1 execute incumbency-db ${targetMode} --file="${chunkFile}" --yes`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      console.log('✓ (retry ok)');
    } catch (e2) {
      console.error(`Failed batch ${b + 1}:`, e2.message);
      if (e2.stdout) console.error(e2.stdout.toString());
      if (e2.stderr) console.error(e2.stderr.toString());
      throw e2;
    }
  }

  try { fs.unlinkSync(chunkFile); } catch (e) {}
}

try { fs.rmdirSync(tempDir); } catch (e) {}

console.log(`Successfully applied all ${lines.length} statements to ${isRemote ? 'REMOTE' : 'LOCAL'} D1!`);
