import fs from "node:fs";
import path from "node:path";
import { app,safeStorage } from "electron";
import type { TaxAuthorityOAuthTokenSet,TaxAuthorityOAuthTokenStore } from "../../../packages/tax-open/src/TaxAuthorityOAuth2027";

interface StoredEnvelope {
  version:1;
  encryptedBase64:string;
}

function tokenFilePath():string {
  return path.join(app.getPath("userData"),"tax-authority-oauth-2027.bin.json");
}

function assertEncryptionAvailable():void {
  if(!safeStorage.isEncryptionAvailable())throw new Error("TAX_AUTHORITY_OAUTH_2027_SECURE_STORAGE_UNAVAILABLE");
}

export class TaxAuthorityOAuth2027SecureStore implements TaxAuthorityOAuthTokenStore {
  async load():Promise<TaxAuthorityOAuthTokenSet|null> {
    const file=tokenFilePath();
    if(!fs.existsSync(file))return null;
    assertEncryptionAvailable();
    let envelope:StoredEnvelope;
    try{
      envelope=JSON.parse(fs.readFileSync(file,"utf8")) as StoredEnvelope;
    }catch{
      throw new Error("TAX_AUTHORITY_OAUTH_2027_SECURE_STORAGE_CORRUPT");
    }
    if(envelope.version!==1||!envelope.encryptedBase64)throw new Error("TAX_AUTHORITY_OAUTH_2027_SECURE_STORAGE_CORRUPT");
    try{
      const decrypted=safeStorage.decryptString(Buffer.from(envelope.encryptedBase64,"base64"));
      return JSON.parse(decrypted) as TaxAuthorityOAuthTokenSet;
    }catch{
      throw new Error("TAX_AUTHORITY_OAUTH_2027_SECURE_STORAGE_DECRYPT_FAILED");
    }
  }

  async save(tokens:TaxAuthorityOAuthTokenSet):Promise<void> {
    assertEncryptionAvailable();
    const file=tokenFilePath();
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const encrypted=safeStorage.encryptString(JSON.stringify(tokens));
    const envelope:StoredEnvelope={version:1,encryptedBase64:encrypted.toString("base64")};
    const temp=`${file}.tmp`;
    fs.writeFileSync(temp,JSON.stringify(envelope),{encoding:"utf8",mode:0o600});
    fs.renameSync(temp,file);
    try{fs.chmodSync(file,0o600);}catch{ /* Windows ACLs are managed by the OS profile. */ }
  }

  async clear():Promise<void> {
    const file=tokenFilePath();
    try{fs.rmSync(file,{force:true});}catch{ /* best effort disconnect */ }
  }
}
