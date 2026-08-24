import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import type { DatabaseConnection } from "../../database/src/DatabaseConnection";
import type { BusinessSettingsRecord, BackupInspection, BackupRecord, BackupStatus } from "../../database/src/types";

interface PackedFile { path: string; size: number; sha256: string; contentBase64: string }
interface BackupEnvelope {
  format: "MK_RECEIPT_BACKUP";
  formatVersion: 1;
  id: string;
  createdAt: string;
  backupType: BackupRecord["backupType"];
  appVersion: string;
  schemaVersion: number;
  receiptCount: number;
  highestReceiptNumber: number;
  businessName: string;
  files: PackedFile[];
  manifestSha256: string;
}

const sha256=(value:Buffer|string)=>createHash("sha256").update(value).digest("hex");
const MAX_BACKUP_COMPRESSED_BYTES=256*1024*1024;
const MAX_BACKUP_FILES=5_000;
const MAX_BACKUP_FILE_BYTES=100*1024*1024;
const MAX_BACKUP_TOTAL_BYTES=1024*1024*1024;
const allowedRoots=new Set(["database","receipts","legacy-receipts","branding","expenses"]);

function validateArchivePath(raw:string):string{
  if(typeof raw!=="string"||!raw||raw.includes("\0")||raw.includes("\\"))throw new Error("UNSAFE_ARCHIVE_PATH");
  if(path.posix.isAbsolute(raw)||/^[A-Za-z]:/.test(raw))throw new Error("UNSAFE_ARCHIVE_PATH");
  const normalized=path.posix.normalize(raw);
  const parts=normalized.split("/");
  if(normalized==="."||normalized.startsWith("../")||parts.some(part=>!part||part==="."||part==="..")||!allowedRoots.has(parts[0]??""))throw new Error("UNSAFE_ARCHIVE_PATH");
  if(parts[0]==="database"&&(normalized!=="database/mk-receipt.sqlite"||parts.length!==2))throw new Error("UNSAFE_ARCHIVE_PATH");
  return normalized;
}

function archiveDestination(targetRoot:string,archivePath:string):string{
  const root=path.resolve(targetRoot);
  const output=path.resolve(root,...archivePath.split("/"));
  if(!output.startsWith(`${root}${path.sep}`))throw new Error("UNSAFE_ARCHIVE_PATH");
  return output;
}

function walk(root:string, prefix:string):PackedFile[]{
  if(!fs.existsSync(root)) return [];
  if(fs.statSync(root).isFile()){const content=fs.readFileSync(root);return[{path:prefix,size:content.length,sha256:sha256(content),contentBase64:content.toString("base64")}];}
  const out:PackedFile[]=[];
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const full=path.join(root,entry.name); const relative=path.posix.join(prefix,entry.name);
    if(entry.isDirectory()) out.push(...walk(full,relative));
    else { const content=fs.readFileSync(full); out.push({path:relative,size:content.length,sha256:sha256(content),contentBase64:content.toString("base64")}); }
  }
  return out;
}

function sanitizeTargetFile(filePath:string):string{
  if(!filePath.toLowerCase().endsWith(".mkrbackup")) return `${filePath}.mkrbackup`;
  return filePath;
}

export class BackupService {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly userDataPath: string,
    private readonly documentsPath: string,
    private readonly settings: () => BusinessSettingsRecord,
    private readonly appVersion: string,
  ){}

  create(targetFile:string, backupType:BackupRecord["backupType"]="manual"):BackupRecord{
    const finalPath=sanitizeTargetFile(targetFile); const tmp=`${finalPath}.tmp`;
    fs.mkdirSync(path.dirname(finalPath),{recursive:true});
    const snapshot=path.join(this.userDataPath,"backup-work",`${randomUUID()}.sqlite`);
    fs.mkdirSync(path.dirname(snapshot),{recursive:true});
    this.connection.createSnapshot(snapshot);
    const status=this.connection.prepare("SELECT COUNT(*) AS c, COALESCE(MAX(receipt_number),0) AS m FROM receipts").get() as unknown as {c:number;m:number};
    const health=this.connection.healthCheck();
    const files:PackedFile[]=[...walk(snapshot,"database/mk-receipt.sqlite")];
    files.push(...walk(path.join(this.documentsPath,"מפתחות להצלחה","קבלות"),"receipts"));
    files.push(...walk(path.join(this.documentsPath,"MK Receipt Pro","Receipts"),"legacy-receipts"));
    files.push(...walk(path.join(this.userDataPath,"branding"),"branding"));
    files.push(...walk(path.join(this.userDataPath,"expenses"),"expenses"));
    const manifest=files.map(({path,size,sha256})=>({path,size,sha256}));
    const envelope:BackupEnvelope={format:"MK_RECEIPT_BACKUP",formatVersion:1,id:randomUUID(),createdAt:new Date().toISOString(),backupType,appVersion:this.appVersion,schemaVersion:health.schemaVersion,receiptCount:status.c,highestReceiptNumber:status.m,businessName:this.settings().businessName,files,manifestSha256:sha256(JSON.stringify(manifest))};
    const compressed=gzipSync(Buffer.from(JSON.stringify(envelope),"utf8"),{level:9});
    fs.rmSync(tmp,{force:true});
    fs.writeFileSync(tmp,compressed,{flag:"wx"});
    const inspection=this.inspect(tmp); if(!inspection.valid) { fs.rmSync(tmp,{force:true}); fs.rmSync(snapshot,{force:true}); throw new Error("BACKUP_VERIFICATION_FAILED"); }

    // Windows does not replace an existing file with renameSync. Preserve the
    // previous verified backup until the new verified file is in place.
    const previous=`${finalPath}.previous`;
    fs.rmSync(previous,{force:true});
    if(fs.existsSync(finalPath)) fs.renameSync(finalPath,previous);
    try{
      fs.renameSync(tmp,finalPath);
      fs.rmSync(previous,{force:true});
    }catch(error){
      fs.rmSync(tmp,{force:true});
      if(fs.existsSync(previous)&&!fs.existsSync(finalPath)) fs.renameSync(previous,finalPath);
      fs.rmSync(snapshot,{force:true});
      throw error;
    }
    fs.rmSync(snapshot,{force:true});
    return {id:envelope.id,backupType,filePath:finalPath,fileHash:sha256(compressed),fileSize:compressed.length,receiptCount:status.c,highestReceiptNumber:status.m,status:"verified",createdAt:envelope.createdAt,verifiedAt:new Date().toISOString()};
  }

  inspect(filePath:string):BackupInspection{
    try{
      const stat=fs.statSync(filePath);
      if(!stat.isFile()||stat.size>MAX_BACKUP_COMPRESSED_BYTES)throw new Error("BACKUP_FILE_TOO_LARGE");
      const compressed=fs.readFileSync(filePath); const parsed=JSON.parse(gunzipSync(compressed).toString("utf8")) as BackupEnvelope;
      if(parsed.format!=="MK_RECEIPT_BACKUP"||parsed.formatVersion!==1||!Array.isArray(parsed.files)) throw new Error("INVALID_FORMAT");
      if(parsed.files.length>MAX_BACKUP_FILES)throw new Error("BACKUP_TOO_MANY_FILES");
      const manifest=parsed.files.map(({path,size,sha256})=>({path,size,sha256}));
      if(sha256(JSON.stringify(manifest))!==parsed.manifestSha256) throw new Error("MANIFEST_MISMATCH");
      let totalBytes=0;
      for(const file of parsed.files){
        validateArchivePath(file.path);
        if(!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_BACKUP_FILE_BYTES)throw new Error("BACKUP_FILE_TOO_LARGE");
        const content=Buffer.from(file.contentBase64,"base64");
        totalBytes+=content.length;
        if(totalBytes>MAX_BACKUP_TOTAL_BYTES)throw new Error("BACKUP_TOTAL_TOO_LARGE");
        if(content.length!==file.size||sha256(content)!==file.sha256)throw new Error("HASH_MISMATCH");
      }
      return {valid:true,filePath,formatVersion:parsed.formatVersion,appVersion:parsed.appVersion,schemaVersion:parsed.schemaVersion,createdAt:parsed.createdAt,backupType:parsed.backupType,receiptCount:parsed.receiptCount,highestReceiptNumber:parsed.highestReceiptNumber,businessName:parsed.businessName,fileSize:compressed.length,errorCode:null};
    }catch(error){return {valid:false,filePath,formatVersion:null,appVersion:null,schemaVersion:null,createdAt:null,backupType:null,receiptCount:0,highestReceiptNumber:0,businessName:null,fileSize:fs.existsSync(filePath)?fs.statSync(filePath).size:0,errorCode:error instanceof Error?error.message:"INVALID_BACKUP"};}
  }

  extract(filePath:string,targetRoot:string):BackupInspection{
    const inspection=this.inspect(filePath); if(!inspection.valid) throw new Error("INVALID_BACKUP_FILE");
    const parsed=JSON.parse(gunzipSync(fs.readFileSync(filePath)).toString("utf8")) as BackupEnvelope;
    fs.rmSync(targetRoot,{recursive:true,force:true}); fs.mkdirSync(targetRoot,{recursive:true});
    for(const file of parsed.files){const output=archiveDestination(targetRoot,validateArchivePath(file.path));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.from(file.contentBase64,"base64"));}
    return inspection;
  }
}
