import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const modules = path.join(root, 'modules');
const canonicalFiles = new Set([
  'finance/finance-tx-sot.js',
  'finance/bill-debt-piutang-canonical-writer.js',
  'shop/shop-canonical-writer.js',
  'vehicle/vehicle-canonical-writer.js',
  'shared/ownership-canonical-writer.js'
]);
const allowedFallback = /(else|fallback|legacy|compatibility|without ProductRepository|without.*SOT)/i;
const directMutation = /\bD\.(transactions|products|vehicles|owners|bills|billsArchive|debts|piutang)(?:\.(?:push|splice|pop|shift|unshift)\b|\[[^\]]+\]\s*=|\s*=)/;

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) walk(p,out);
    else if (ent.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

function mutationLines(file) {
  return fs.readFileSync(file,'utf8').split(/\r?\n/).map((line,i)=>({line,i:i+1})).filter(x=>directMutation.test(x.line));
}

test('S2206 — residual canonical mutations are only initialization, canonical writers, or explicit compatibility fallbacks', () => {
  const violations=[];
  for (const file of walk(modules)) {
    const rel=path.relative(modules,file).replaceAll(path.sep,'/');
    if (canonicalFiles.has(rel)) continue;
    if (/self-test|backup-restore|features-helpers-global-security/.test(rel)) continue;
    for (const hit of mutationLines(file)) {
      const line=hit.line.trim();
      if (line.startsWith('//') || line.startsWith('*') || line.includes('`D.')) continue;
      if (/^if\s*\(!?\s*D\.(transactions|products)\s*\)?\s*D\./.test(line)) continue;
      if (/^D\.(transactions|products)\s*=\s*D\.\1\s*\|\|/.test(line)) continue;
      if (/^if\s*\(!Array\.isArray\(g\.D\.(transactions|products)\)/.test(line)) continue;
      if (allowedFallback.test(line)) continue;
      if (/\.find\(|\.filter\(|\.map\(|\.some\(|\.reduce\(|\.forEach\(/.test(line) && !/(push|splice|=)/.test(line)) continue;
      violations.push(`${rel}:${hit.i}:${line}`);
    }
  }
  assert.deepEqual(violations, [], `unguarded canonical mutations remain:\n${violations.join('\n')}`);
});

test('S2206 — canonical writers expose required mutation primitives', async () => {
  const writer = fs.readFileSync(path.join(modules,'shop/shop-canonical-writer.js'),'utf8');
  const tx = fs.readFileSync(path.join(modules,'finance/finance-tx-sot.js'),'utf8');
  assert.match(writer, /replaceSnapshot\(/);
  assert.match(writer, /removeById\(/);
  assert.match(tx, /createMany\(/);
  assert.match(tx, /removeWhere\(/);
  assert.match(tx, /replaceSnapshot\(/);
});
