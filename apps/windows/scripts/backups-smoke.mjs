import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {gzipSync} from "node:zlib";
import {BackupService} from "../packages/backup/src/BackupService.ts";

const sha256=value=>createHash("sha256").update(value).digest("hex");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mk-backup-smoke-"));
const service=new BackupService({},"","",()=>({businessName:"test"}),"test");

function backupFile(name,archivePath,content){
  const file={path:archivePath,size:content.length,sha256:sha256(content),contentBase64:content.toString("base64")};
  const envelope={format:"MK_RECEIPT_BACKUP",formatVersion:1,id:"test",createdAt:new Date().toISOString(),backupType:"manual",appVersion:"test",schemaVersion:1,receiptCount:0,highestReceiptNumber:0,businessName:"test",files:[file],manifestSha256:sha256(JSON.stringify([{path:file.path,size:file.size,sha256:file.sha256}]))};
  const destination=path.join(dir,name);
  fs.writeFileSync(destination,gzipSync(JSON.stringify(envelope)));
  return destination;
}

try{
  const content=Buffer.from("database-smoke");
  const valid=backupFile("valid.mkrbackup","database/mk-receipt.sqlite",content);
  const target=path.join(dir,"restored");
  if(!service.inspect(valid).valid)throw new Error("VALID_BACKUP_REJECTED");
  service.extract(valid,target);
  if(!fs.readFileSync(path.join(target,"database","mk-receipt.sqlite")).equals(content))throw new Error("VALID_BACKUP_CONTENT_MISMATCH");

  for(const unsafePath of ["../escaped.txt","/absolute.txt","C:/escaped.txt","receipts\\escaped.txt"]){
    const malicious=backupFile(`malicious-${Buffer.from(unsafePath).toString("hex")}.mkrbackup`,unsafePath,Buffer.from("blocked"));
    if(service.inspect(malicious).valid)throw new Error(`UNSAFE_BACKUP_ACCEPTED:${unsafePath}`);
    let rejected=false;
    try{service.extract(malicious,path.join(dir,"malicious-target"));}catch{rejected=true;}
    if(!rejected)throw new Error(`UNSAFE_BACKUP_EXTRACTED:${unsafePath}`);
  }
  console.log("✓ Backup restore accepts valid archives and rejects traversal, absolute, drive-letter and backslash paths");
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
