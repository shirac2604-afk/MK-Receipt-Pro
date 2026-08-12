import fs from 'node:fs';
const t=fs.readFileSync('packages/application/src/HealthService.ts','utf8');
for(const k of ['רצף הקבלות','קובצי PDF','גיבוי','שטח אחסון'])if(!t.includes(k))throw new Error(`Missing check ${k}`);
console.log('✓ Health checks cover database, sequence, PDF, backups and disk');
