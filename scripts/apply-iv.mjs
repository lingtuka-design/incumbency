import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const isRemote = process.argv.includes('--remote');
const targetMode = isRemote ? '--remote' : '--local';

console.log(`Starting Incumbency-IV database update on ${isRemote ? 'REMOTE' : 'LOCAL'} D1...`);

const sqlContent = fs.readFileSync(path.resolve('data/incumbency-iv.sql'), 'utf8');
const lines = sqlContent.split('\n').filter(l => l.trim().length > 0);

console.log(`Total statements to execute: ${lines.length}`);
const BATCH_SIZE = 100;
const tempDir = path.resolve('data/chunks_iv');
fs.mkdirSync(tempDir, { recursive: true });

const totalBatches = Math.ceil(lines.length / BATCH_SIZE);
console.log(`Executing ${totalBatches} batches to ${isRemote ? 'remote' : 'local'} D1...`);

for (let b = 0; b < totalBatches; b++) {
  const slice = lines.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
  const chunkFile = path.join(tempDir, `chunk_iv_${b}.sql`);
  fs.writeFileSync(chunkFile, slice.join('\n'));

  let success = false;
  let attempts = 0;
  const maxAttempts = 5;

  process.stdout.write(`Batch ${b + 1}/${totalBatches}... `);

  while (!success && attempts < maxAttempts) {
    attempts++;
    try {
      execSync(`npx wrangler d1 execute incumbency-db ${targetMode} --file="${chunkFile}" --yes`, {
        stdio: 'pipe',
        timeout: 60000,
      });
      success = true;
      console.log(attempts > 1 ? `OK (attempt ${attempts})` : 'OK');
    } catch (err) {
      if (attempts >= maxAttempts) {
        console.error(`\nFailed batch ${b + 1} after ${maxAttempts} attempts:`, err.message);
        if (err.stdout) console.error(err.stdout.toString());
        if (err.stderr) console.error(err.stderr.toString());
        throw err;
      }
      process.stdout.write(`(retry ${attempts})... `);
      execSync(`node -e "setTimeout(()=>{}, ${attempts * 3000})"`);
    }
  }

  try { fs.unlinkSync(chunkFile); } catch (e) {}
}

try { fs.rmdirSync(tempDir); } catch (e) {}

console.log(`Successfully applied all ${lines.length} statements to ${isRemote ? 'REMOTE' : 'LOCAL'} D1!`);
