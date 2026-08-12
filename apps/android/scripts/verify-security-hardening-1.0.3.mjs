import fs from "node:fs";
const files={supabase:fs.readFileSync("src/lib/supabase.ts","utf8"),validation:fs.readFileSync("src/securityValidation.ts","utf8"),customers:fs.readFileSync("src/screens/CustomersScreen.tsx","utf8"),expenses:fs.readFileSync("src/screens/ExpensesScreen.tsx","utf8"),receipts:fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8"),more:fs.readFileSync("src/screens/MoreScreen.tsx","utf8")};
const checks=[
 [files.supabase.includes("SecureStore.setItemAsync")&&files.supabase.includes("AsyncStorage.removeItem"),"auth session secure-store migration"],
 [files.validation.includes("sanitizePhone")&&files.validation.includes("validEmail"),"shared input validators"],
 [files.customers.includes("sanitizePhone(v)")&&files.customers.includes("validEmail(email)"),"customer phone/email validation"],
 [files.expenses.includes("sanitizeMoney(v)")&&files.expenses.includes("validDate(date)"),"expense amount/date validation"],
 [files.receipts.includes("sanitizeMoney(v)")&&files.receipts.includes("validDate(paymentDate)"),"receipt amount/date validation"],
 [files.more.includes("sanitizeDigits(v,15)")&&files.more.includes("validPhone(phone)"),"business-number/contact validation"],
 [files.customers.includes("maxLength={20}")&&files.more.includes("maxLength={15}"),"UI length limits"],
 [!files.validation.includes("eval("),"no dynamic eval in validator"]
];let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Android security hardening: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
