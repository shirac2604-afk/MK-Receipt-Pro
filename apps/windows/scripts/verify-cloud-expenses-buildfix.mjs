import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const svc=fs.readFileSync('apps/desktop/electron/main/SupabaseCloudService.ts','utf8');
const checks=[
 [pkg.version==='1.1.1-cloud.3.3.1','version 3.3.1'],
 [svc.includes('const firstDuplicate=duplicates[0];'),'safe duplicate lookup'],
 [svc.includes('if(!firstDuplicate) throw new Error("DUPLICATE_CUSTOMER_LOOKUP_EMPTY")'),'undefined guard'],
 [svc.includes('const id=firstDuplicate.customer.id;'),'guarded customer id']
];
let ok=0; for(const [pass,label] of checks){console.log(pass?'PASS':'FAIL',label); if(pass) ok++;}
console.log(`Cloud expenses buildfix: ${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
