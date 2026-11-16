import { mkdir, cp, rm } from 'node:fs/promises';
const target = new URL('../dist/',import.meta.url);
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for (const name of ['index.html','styles.css','sw.js','manifest.webmanifest','assets','src']) {
  await cp(new URL(`../${name}`,import.meta.url),new URL(`../dist/${name}`,import.meta.url),{recursive:true});
}
console.log('Build estático criado em dist/ (sem dependências npm).');
