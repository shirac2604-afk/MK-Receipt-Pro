import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root=process.cwd();
execFileSync(process.execPath,[path.join(root,"scripts","tax-open-simulator-fixture.mjs")],{stdio:"inherit"});
const file=path.join(root,"test-output","tax-open-simulator-fixture","BKMVDATA.TXT");
const raw=fs.readFileSync(file);
const lines=raw.toString("latin1").split("\r\n").filter(Boolean);
const issues=[]; const counts={"A100":0,"C100":0,"D120":0,"Z900":0}; const links=new Map();
for(const line of lines){
 const code=line.slice(0,4); counts[code]=(counts[code]??0)+1;
 if(code==="C100"){
  if(line.length!==444)issues.push(`C100 length ${line.length}`);
  if(line.slice(22,25)!=="400")issues.push("C100 document type is not 400");
  if(!/^\d{8}$/.test(line.slice(45,53)))issues.push("C100 invalid issue date");
  if(!/^\d{8}$/.test(line.slice(400,408)))issues.push("C100 invalid document date");
  if(!/^[+-]\d{14}$/.test(line.slice(347,362)))issues.push("C100 invalid field 1223 amount");
  const link=line.slice(424,431); links.set(link,(links.get(link)??0)+1);
 }
 if(code==="D120"){
  if(line.length!==222)issues.push(`D120 length ${line.length}`);
  if(line.slice(22,25)!=="400")issues.push("D120 document type is not 400");
  const pay=line.slice(49,50);
  if(!/[149]/.test(pay))issues.push(`D120 unsupported payment code ${pay}`);
  if(pay==="2"||pay==="3")issues.push(`D120 forbidden Version 1.0 payment code ${pay}`);
  if(!/^[+-]\d{14}$/.test(line.slice(103,118)))issues.push("D120 invalid amount");
  const link=line.slice(155,162); links.set(link,(links.get(link)??0)-1);
 }
}
for(const [link,balance] of links)if(balance!==0)issues.push(`link ${link} mismatch ${balance}`);
const result={generatedAt:new Date().toISOString(),counts,total:lines.length,issues,passed:issues.length===0,checks:["C100 fixed fields","D120 fixed fields","receipt type 400","dates YYYYMMDD","signed amounts","Version 1.0 payment codes 1/4/9 only","C100/D120 link consistency"]};
fs.writeFileSync(path.join(root,"docs","TAX_OPEN_FIELD_AUDIT_RC8.json"),JSON.stringify(result,null,2));
if(issues.length)throw new Error(issues.join(" | "));
console.log(`✓ Deep C100/D120 field audit passed for ${counts["C100"]} receipts`);
