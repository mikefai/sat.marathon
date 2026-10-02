#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const files = ['content/questions-rw.js','content/questions-math.js','content/flashcards.js','content/traps.js','content/desmos.js','content/rw-types.js','content/math-types.js'];
let ok = true;
for (const f of files) {
  const src = readFileSync(new URL(f, 'file:///'+root.replace(/\\/g,'/')+'/'), 'utf8');
  try {
    // crude: evaluate by wrapping — but safer to just check presence of keys
    if (!/window\.MARATHON_/.test(src)) { console.error('Missing window.MARATHON_ export in', f); ok=false; }
    if (/TODO|FIXME|undefined undefined/.test(src)) { console.error('TODO/placeholder in', f); ok=false; }
  } catch(e){ console.error(e.message); ok=false; }
}
// check id uniqueness across question files
function ids(f){const s=readFileSync(new URL(f, 'file:///'+root.replace(/\\/g,'/')+'/'),'utf8');return [...s.matchAll(/id:"([^"]+)"/g)].map(m=>m[1])}
const all=[...ids('content/questions-rw.js'),...ids('content/questions-math.js')];
const dup=all.filter((v,i,a)=>a.indexOf(v)!==i);
if(dup.length){console.error('Duplicate ids:',dup);ok=false}
if(ok)console.log('validate: OK —',all.length,'questions, no placeholder text, unique ids.');
else process.exit(1);
