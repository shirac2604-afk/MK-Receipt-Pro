import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mk-dossier-'));const sub=path.join(root,'SIMULATOR-SUBMISSION');fs.mkdirSync(path.join(sub,'SIMULATOR-RESULTS'),{recursive:true});
for(const n of ['REPORT-2.6.html','REPORT-5.4.html','INI.TXT','BKMVDATA.TXT','PREFLIGHT-RESULT.json','SUBMISSION-MANIFEST.json'])fs.writeFileSync(path.join(sub,n),'x');
fs.writeFileSync(path.join(sub,'SIMULATOR-RESULTS','OFFICIAL-SIMULATOR-REPORT.pdf'),'%PDF-test');fs.writeFileSync(path.join(sub,'SIMULATOR-RESULTS','OFFICIAL-SIMULATOR-RESULT.json'),JSON.stringify({status:'passed',matchesExport:true,importedAt:new Date().toISOString()}));
const src=fs.readFileSync('packages/tax-open/src/TaxRegistrationDossierService.ts','utf8').replace(/import[^;]+;\n/g,'');
if(!src.includes('TAX_REGISTRATION_DOSSIER'))throw new Error('service missing');console.log('✓ Registration dossier smoke fixture prepared');fs.rmSync(root,{recursive:true,force:true});
