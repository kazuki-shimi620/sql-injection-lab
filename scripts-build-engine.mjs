import fs from 'node:fs';
const src=fs.readFileSync(new URL('./dist/lessons.mjs',import.meta.url),'utf8').replace(/export const /g,'const ').replace(/export function /g,'function ');
fs.writeFileSync(new URL('./dist/lessons.worker.js',import.meta.url),src+'\nself.Lab={seed,lessons,plan,achieved};\n');
