import fs from 'node:fs';

const checks=[]; const fail=[];
const check=(name,ok)=>{checks.push([name,ok]); if(!ok) fail.push(name)};
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const renderer=fs.readFileSync('apps/desktop/renderer/src/main.tsx','utf8');
const handlers=fs.readFileSync('apps/desktop/electron/ipc/databaseHandlers.ts','utf8');
const preload=fs.readFileSync('apps/desktop/electron/preload/preload.ts','utf8');
const globals=fs.readFileSync('apps/desktop/renderer/src/global.d.ts','utf8');

check('release package version',/^\d+\.\d+\.\d+$/.test(pkg.version));
check('preload email API',preload.includes('shareEmail:(receiptId:string)'));
check('preload whatsapp API',preload.includes('shareWhatsApp:(receiptId:string)'));
check('global email API',globals.includes('shareEmail(receiptId:string)'));
check('global whatsapp API',globals.includes('shareWhatsApp(receiptId:string)'));
check('email IPC handler',handlers.includes('ipcMain.handle("receipts:share-email"'));
check('whatsapp IPC handler',handlers.includes('ipcMain.handle("receipts:share-whatsapp"'));
check('email copies PDF path',handlers.includes('clipboard.writeText(filePath)'));
check('history email action',renderer.includes('shareEmail(item)'));
check('history whatsapp action',renderer.includes('shareWhatsApp(item)'));
check('customer card share helper',renderer.includes('shareCustomerReceipt(receipt'));
check('customer email button',renderer.includes('shareCustomerReceipt(receipt,"email")'));
check('customer whatsapp button',renderer.includes('shareCustomerReceipt(receipt,"whatsapp")'));
check('post-issue email remains',renderer.includes('שליחה במייל'));
check('post-issue whatsapp remains',renderer.includes('שליחה ב־WhatsApp'));

for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
console.log(`Receipt sharing v5: ${checks.length-fail.length}/${checks.length} passed`);
if(fail.length){console.error('Failed:',fail.join(', '));process.exit(1)}
