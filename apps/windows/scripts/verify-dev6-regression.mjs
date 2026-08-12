import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const ui=read('apps/desktop/renderer/src/main.tsx');
const preload=read('apps/desktop/electron/preload/preload.ts');
const global=read('apps/desktop/renderer/src/global.d.ts');
const handlers=read('apps/desktop/electron/ipc/databaseHandlers.ts');
const db=read('packages/database/src/DatabaseService.ts');
const checks=[
 ['expenses edit',ui.includes('beginEdit(item:ExpenseRecord)')&&preload.includes('expenses:Object.freeze')],
 ['expenses delete',ui.includes('window.confirm')&&handlers.includes('expenses:delete')],
 ['expense filters',ui.includes('ExpenseSearchFilters')&&db.includes('listExpenses')],
 ['customer cards',ui.includes('function CustomersScreen')&&preload.includes('customers:Object.freeze')],
 ['customer profile',ui.includes('getProfile')&&db.includes('getCustomerProfile')],
 ['customer receipt prefill',ui.includes('mk-customer-prefill')],
 ['email sharing',preload.includes('shareEmail')&&handlers.includes('receipts:share-email')],
 ['whatsapp sharing',preload.includes('shareWhatsApp')&&handlers.includes('receipts:share-whatsapp')],
 ['sharing typing',global.includes('shareEmail')&&global.includes('shareWhatsApp')],
 ['post issue sharing',ui.includes('שליחה במייל')&&ui.includes('שליחה ב־WhatsApp')],
 ['customer sharing',ui.includes('shareCustomerReceipt')],
 ['templates coexist',ui.includes('תבניות לתקבולים חוזרים')&&preload.includes('templates:Object.freeze')],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`dev6 regression: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exit(1);
