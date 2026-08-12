import fs from 'node:fs';
const ipc=fs.readFileSync('apps/desktop/electron/ipc/databaseHandlers.ts','utf8');
const report=fs.readFileSync('packages/database/src/repositories/ReportRepository.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 [report.includes('ReportExpenseRow, PaymentMethod } from "../types"'),'PaymentMethod imported'],
 [ipc.includes('...(Number.isFinite(input?.minAmountAgorot)?{minAmountAgorot:Number(input.minAmountAgorot)}:{})'),'min amount omitted when absent'],
 [ipc.includes('...(Number.isFinite(input?.maxAmountAgorot)?{maxAmountAgorot:Number(input.maxAmountAgorot)}:{})'),'max amount omitted when absent'],
 [!ipc.includes('minAmountAgorot:Number.isFinite(input?.minAmountAgorot)?Number(input.minAmountAgorot):undefined'),'no explicit undefined min'],
 [!ipc.includes('maxAmountAgorot:Number.isFinite(input?.maxAmountAgorot)?Number(input.maxAmountAgorot):undefined'),'no explicit undefined max'],
 [pkg.version==='1.1.0-dev.17','package version synced']
];
let ok=0; for(const [pass,label] of checks){console.log(pass?'PASS':'FAIL',label);if(pass)ok++} console.log(`${ok}/${checks.length}`); if(ok!==checks.length)process.exit(1);
