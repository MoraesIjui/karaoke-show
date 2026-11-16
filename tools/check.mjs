import { readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function allFiles(dir) {
 const names = await readdir(dir); const files=[];
 for (const name of names) {const p = `${dir}/${name}`; if ((await stat(p)).isDirectory()) files.push(...await allFiles(p)); else if (p.endsWith('.js')||p.endsWith('.mjs')) files.push(p);}
 return files;
}
let failed=false;
for (const file of [...await allFiles('./src'),...await allFiles('./tools'),'./sw.js']) {
 const test=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if (test.status) { failed=true; console.error(file,test.stderr); }
}
if(failed) process.exitCode=1; else console.log('Verificação sintática OK.');
