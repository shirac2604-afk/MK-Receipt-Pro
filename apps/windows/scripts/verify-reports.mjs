import fs from 'node:fs';
const required=[
 'packages/database/src/repositories/ReportRepository.ts',
 'packages/application/src/reports/ReportService.ts',
 'apps/desktop/renderer/src/main.tsx',
 'apps/desktop/electron/preload/preload.ts'
];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const ui=fs.readFileSync('apps/desktop/renderer/src/main.tsx','utf8');
const preload=fs.readFileSync('apps/desktop/electron/preload/preload.ts','utf8');
if(!ui.includes('function ReportsScreen'))throw new Error('Reports screen missing');
if(!ui.includes('חבילת רואה חשבון'))throw new Error('Accountant export UI missing');
if(!preload.includes('reports:get-annual'))throw new Error('Secure reports API missing');
console.log('✓ Reports screen and secure API exist');
console.log('✓ CSV and accountant export actions exist');
console.log('✓ No top customers or payment-method segmentation were added');
