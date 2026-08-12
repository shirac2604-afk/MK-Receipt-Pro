import fs from "node:fs";
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const checks=[
 [ui.includes("sanitizePhone")&&ui.includes("PHONE_RE"),"phone sanitizer"],
 [ui.includes("sanitizeDigits")&&ui.includes("מספר עוסק"),"business number digits only"],
 [ui.includes("sanitizeMoney")&&ui.includes('inputMode="decimal"'),"money sanitizer"],
 [ui.includes("validEmail")&&ui.includes("validPhone"),"contact validators"],
 [ui.includes('maxLength={160}')&&ui.includes('maxLength={254}'),"field length limits"],
 [ui.includes('<option value="card">כרטיס</option>')&&ui.includes('<option value="other">אחר</option>'),"expense payment closed list"],
 [ui.includes("draft.notes.length>2000"),"customer notes server-aligned limit"],
 [ui.includes("form.description.trim().length<=500"),"receipt description limit"]
];let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Windows security input hardening: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
