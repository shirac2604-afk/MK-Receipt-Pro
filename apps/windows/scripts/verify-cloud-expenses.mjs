import fs from "node:fs";
const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const tests=[
 [pkg.version==="1.1.1-cloud.3.3","version"],
 [service.includes('from("expenses").select("*")'),"cloud expense list"],
 [service.includes('from("expenses").insert(row)'),"cloud expense add"],
 [service.includes('from("expenses").update(patch)'),"cloud expense update"],
 [service.includes('from("expenses").delete()'),"cloud expense delete"],
 [service.includes('storage.from("expense-attachments").upload'),"attachment upload"],
 [service.includes('storage.from("expense-attachments").download'),"attachment download"],
 [service.includes('storage.from("expense-attachments").remove'),"attachment cleanup"],
 [ipc.includes('supabaseCloud.listExpenses(filters)'),"IPC cloud list"],
 [ipc.includes('supabaseCloud.addExpense'),"IPC cloud add"],
 [ipc.includes('supabaseCloud.updateExpense'),"IPC cloud update"],
 [ipc.includes('supabaseCloud.deleteExpense'),"IPC cloud delete"],
 [ipc.includes('supabaseCloud.openExpenseAttachment'),"IPC cloud attachment open"],
 [ui.includes('window.mkApi.expenses.list'),"existing expenses UI preserved"]
];
let passed=0;for(const [ok,label] of tests){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(ok)passed++;}
console.log(`Cloud expenses + attachments: ${passed}/${tests.length}`);if(passed!==tests.length)process.exit(1);
