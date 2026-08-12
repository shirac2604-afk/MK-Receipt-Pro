import fs from "node:fs";
import os from "node:os";
import path from "node:path";
function two(n){return String(n).padStart(2,"0")}
function businessName(number,date){const d=String(number).replace(/\D/g,"").padStart(9,"0").slice(-9);return `${d.slice(0,8)}.${String(date.getFullYear()).slice(-2)}`}
function stamp(date){return `${two(date.getMonth()+1)}${two(date.getDate())}${two(date.getHours())}${two(date.getMinutes())}`}
function allocate(root,number,date){const base=new Date(date);base.setSeconds(0,0);const business=businessName(number,base);let effective=new Date(base),advanced=0,folder;do{folder=path.join(root,"OPENFRMT",business,stamp(effective));if(!fs.existsSync(folder))break;advanced++;effective=new Date(base.getTime()+advanced*60000)}while(true);fs.mkdirSync(folder,{recursive:true});return{folder,effective,advanced}}
const root=fs.mkdtempSync(path.join(os.tmpdir(),"mk-open-path-"));
const date=new Date(2026,6,30,10,25,44);
const first=allocate(root,"002233445",date);
const second=allocate(root,"002233445",date);
const third=allocate(root,"002233445",date);
const rel1=path.relative(root,first.folder).split(path.sep).join("/");
const rel2=path.relative(root,second.folder).split(path.sep).join("/");
const rel3=path.relative(root,third.folder).split(path.sep).join("/");
if(rel1!=="OPENFRMT/00223344.26/07301025")throw new Error(`Unexpected first path ${rel1}`);
if(rel2!=="OPENFRMT/00223344.26/07301026")throw new Error(`Unexpected second path ${rel2}`);
if(rel3!=="OPENFRMT/00223344.26/07301027")throw new Error(`Unexpected third path ${rel3}`);
if([rel1,rel2,rel3].some(v=>/-\d+$/.test(v)))throw new Error("Suffix collision format used");
const rolloverRoot=fs.mkdtempSync(path.join(os.tmpdir(),"mk-open-rollover-"));
const rolloverDate=new Date(2026,11,31,23,59,0);
const r1=allocate(rolloverRoot,"123456789",rolloverDate);
const r2=allocate(rolloverRoot,"123456789",rolloverDate);
if(path.basename(r2.folder)!=="01010000")throw new Error(`Minute rollover failed: ${r2.folder}`);
if(path.basename(path.dirname(r2.folder))!=="12345678.26")throw new Error("Production-year folder changed during minute collision rollover");
console.log("✓ OPENFRMT paths, same-minute collisions and date rollover passed");
fs.rmSync(root,{recursive:true,force:true});fs.rmSync(rolloverRoot,{recursive:true,force:true});
