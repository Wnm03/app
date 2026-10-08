import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
const ROOT=process.cwd();
const manifest=fs.readFileSync(path.join(ROOT,"PATCH-MANIFEST-S2529.md"),"utf8");
const source=fs.readFileSync(path.join(ROOT,"scripts/verify-patch-integrity.js"),"utf8");

test("S2529 manifest lists only real apply files and no verification commands",()=>{
 const m=manifest.match(/\nBEGIN_APPLY_FILES\n([\s\S]*?)\nEND_APPLY_FILES/); assert.ok(m,"S2529 apply block must exist");
 const lines=m[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 assert.ok(lines.length>0); assert.equal(new Set(lines).size,lines.length);
 for(const rel of lines){ assert.ok(!/^node\s/.test(rel)); assert.ok(!/[<>]/.test(rel)); assert.ok(fs.existsSync(path.join(ROOT,rel)),rel); assert.equal(rel.includes("PATCH-MANIFEST-S2529.md"),false); }
});

test("S2529 verifier defaults to the S2529 manifest",()=>{ assert.match(source,/PATCH-MANIFEST-S2529\.md/); });
