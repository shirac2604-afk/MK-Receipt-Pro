import fs from 'node:fs';

const checks = [
  ['package version', 'package.json', '"version": "1.1.0-dev.2"'],
  ['expense export type', 'packages/database/src/types.ts', 'export interface ReportExpenseRow'],
  ['expense repository export', 'packages/database/src/repositories/ReportRepository.ts', 'getExpensesForExport'],
  ['expense CSV', 'packages/application/src/reports/ReportService.ts', 'function expenseCsvText'],
  ['accountant expense attachments', 'packages/application/src/reports/ReportService.ts', 'אסמכתאות-הוצאות'],
  ['accountant expense csv', 'packages/application/src/reports/ReportService.ts', 'הוצאות-${year}.csv'],
  ['financial report title', 'apps/desktop/renderer/src/main.tsx', 'הכנסות מול הוצאות'],
  ['range expenses', 'apps/desktop/renderer/src/main.tsx', 'rangeExpenses'],
  ['annual expenses', 'apps/desktop/renderer/src/main.tsx', 'annualExpenses'],
  ['monthly net', 'apps/desktop/renderer/src/main.tsx', 'm.incomeAgorot-expense'],
  ['full accountant package button', 'apps/desktop/renderer/src/main.tsx', 'חבילת רואה חשבון מלאה'],
  ['development version displayed', 'apps/desktop/electron/preload/preload.ts', 'foundationVersion:"1.1.0-dev.2"'],
];
let passed=0;
for (const [name,file,needle] of checks) {
  const text=fs.readFileSync(file,'utf8');
  const ok=text.includes(needle);
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(ok) passed++;
}
console.log(`Financial overview audit: ${passed}/${checks.length} passed`);
if(passed!==checks.length) process.exit(1);
