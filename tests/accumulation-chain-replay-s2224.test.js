import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.cwd(), '..');
const workspace = path.join(root, 'app-main');
const accumulated = path.join(root, 'PATCH-SOT-CONSOLIDATION-A-ACCUMULATED-S2180-S2223.zip');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function zipMembers(zip) {
  const out = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean).sort();
}
function workspaceFiles() {
  const result = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else result.push(path.relative(workspace, full).replaceAll(path.sep, '/'));
    }
  };
  walk(workspace);
  return result.sort();
}

const members = zipMembers(accumulated);
const ws = workspaceFiles();
const wsSet = new Set(ws);
const metadata = new Set(['ACCUMULATION-MANIFEST-S2180-S2223.md', 'AUDIT-S2223-ACCUMULATION-CHAIN-REPAIR.md']);
const payloadMembers = members.filter(x => !metadata.has(x));
const missing = payloadMembers.filter(x => !wsSet.has(x));
if (missing.length) throw new Error(`ACCUMULATION_MEMBER_MISSING:${missing.join(',')}`);

const archiveSet = new Set(payloadMembers);
const payloadFiles = ws.filter(x => archiveSet.has(x));
for (const rel of payloadFiles) {
  const tmp = path.join(root, '.s2224-chain-check', rel);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
}

const manifest = path.join(root, 's2223work', 'ACCUMULATION-MANIFEST-S2180-S2223.md');
if (!fs.existsSync(manifest)) throw new Error('ACCUMULATION_MANIFEST_MISSING');
const text = fs.readFileSync(manifest, 'utf8');
for (const required of ['S2180', 'S2223', 'DELETED', 'Payload invariant']) {
  if (!text.includes(required)) throw new Error(`MANIFEST_CONTRACT_MISSING:${required}`);
}

console.log(`S2224 snapshot-members=${members.length}`);
console.log(`S2224 application-payload-members=${payloadMembers.length}`);
console.log(`S2224 metadata-members=${metadata.size}`);
console.log(`S2224 workspace-files=${ws.length}`);
console.log(`S2224 missing-application-members=0`);
console.log(`S2224 manifest-contract=PASS`);
console.log(`S2224 accumulated-sha256=${sha256(accumulated)}`);
console.log('S2224 RESULT=PASS');
