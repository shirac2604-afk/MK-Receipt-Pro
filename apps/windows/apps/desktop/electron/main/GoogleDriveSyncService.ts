import { safeStorage, shell } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { DatabaseService } from "../../../../packages/database/src/DatabaseService";
import type { CloudSyncStatus } from "../../../../packages/database/src/types";

interface PersistedState {
  clientId: string;
  accountEmail: string | null;
  encryptedRefreshToken: string;
  remoteFileId: string | null;
  remoteModifiedTime: string | null;
  lastSyncAt: string | null;
  lastLocalHash: string | null;
  deviceId: string;
}
interface DriveFileMeta { id:string; name:string; modifiedTime:string; md5Checksum?:string; size?:string; }

const FILE_NAME="MK-Receipt-Pro-Production-Sync.mkrbackup";
const SCOPE="openid email https://www.googleapis.com/auth/drive.file";

export class GoogleDriveSyncService {
  private state:PersistedState|null=null;
  private runtimeState:CloudSyncStatus["state"]="disconnected";
  private message:string|null=null;
  private pushTimer:NodeJS.Timeout|null=null;
  private running:Promise<void>|null=null;
  constructor(private readonly userDataPath:string,private readonly database:DatabaseService,private readonly resourcesPath:string){
    this.load();
  }
  private statePath():string{return path.join(this.userDataPath,"cloud-sync","google-drive-state.json")}
  private load():void{
    try{
      const p=this.statePath(); if(!fs.existsSync(p))return;
      const parsed=JSON.parse(fs.readFileSync(p,"utf8")) as PersistedState;
      if(parsed.clientId&&parsed.encryptedRefreshToken){
        this.state={...parsed,accountEmail:parsed.accountEmail??null,lastLocalHash:parsed.lastLocalHash??null,remoteFileId:parsed.remoteFileId??null,remoteModifiedTime:parsed.remoteModifiedTime??null,lastSyncAt:parsed.lastSyncAt??null,deviceId:parsed.deviceId||crypto.randomUUID()};
        this.runtimeState="idle";
      }
    }catch{this.state=null;this.runtimeState="disconnected"}
  }
  private save():void{
    if(!this.state)return;
    fs.mkdirSync(path.dirname(this.statePath()),{recursive:true});
    fs.writeFileSync(this.statePath(),JSON.stringify(this.state,null,2),"utf8");
  }
  private resolveClientId():string|null{
    const env=process.env.MK_GOOGLE_OAUTH_CLIENT_ID?.trim();
    if(env&&env.endsWith(".apps.googleusercontent.com"))return env;
    // Drive always uses the packaged Desktop OAuth client. A legacy Calendar
    // configuration may refer to a confidential web client, which cannot be
    // used by this PKCE desktop flow because it requires a client secret.
    const candidates=[
      path.join(this.resourcesPath,"google","oauth-client.json"),
      path.join(process.cwd(),"resources","google","oauth-client.json")
    ];
    for(const file of candidates){
      try{
        const parsed=JSON.parse(fs.readFileSync(file,"utf8")) as {clientId?:string};
        const value=parsed.clientId?.trim();
        if(value&&value.endsWith(".apps.googleusercontent.com"))return value;
      }catch{}
    }
    return null;
  }
  getStatus():CloudSyncStatus{
    return {connected:Boolean(this.state),state:this.runtimeState,clientIdConfigured:Boolean(this.resolveClientId()),accountEmail:this.state?.accountEmail??null,remoteFileId:this.state?.remoteFileId??null,remoteModifiedTime:this.state?.remoteModifiedTime??null,lastSyncAt:this.state?.lastSyncAt??null,message:this.message,deviceId:this.state?.deviceId??"not-connected"};
  }
  async connect(email:string):Promise<CloudSyncStatus>{
    const normalizedEmail=email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))throw new Error("GOOGLE_EMAIL_INVALID");
    const normalized=this.resolveClientId();
    if(!normalized)throw new Error("GOOGLE_OAUTH_APP_NOT_CONFIGURED");
    if(!safeStorage.isEncryptionAvailable())throw new Error("SECURE_STORAGE_UNAVAILABLE");
    this.runtimeState="syncing";this.message="ממתין לאישור בחשבון Google";
    let oauthServer:ReturnType<typeof http.createServer>|null=null;
    try{
    const verifier=crypto.randomBytes(48).toString("base64url");
    const challenge=crypto.createHash("sha256").update(verifier).digest("base64url");
    const csrf=crypto.randomBytes(24).toString("base64url");
    const server=http.createServer();
    oauthServer=server;
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve())});
    const port=(server.address() as AddressInfo).port;
    const redirectUri=`http://127.0.0.1:${port}/oauth2callback`;
    const auth=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id",normalized);auth.searchParams.set("redirect_uri",redirectUri);auth.searchParams.set("response_type","code");
    auth.searchParams.set("scope",SCOPE);auth.searchParams.set("access_type","offline");auth.searchParams.set("prompt","consent");auth.searchParams.set("login_hint",normalizedEmail);
    auth.searchParams.set("code_challenge",challenge);auth.searchParams.set("code_challenge_method","S256");auth.searchParams.set("state",csrf);
    const codePromise=new Promise<string>((resolve,reject)=>{
      const timeout=setTimeout(()=>{server.close();reject(new Error("GOOGLE_OAUTH_TIMEOUT"))},180000);
      server.on("request",(req,res)=>{
        try{
          const u=new URL(req.url??"/",redirectUri);
          if(u.pathname!=="/oauth2callback"){res.writeHead(404);res.end();return}
          if(u.searchParams.get("state")!==csrf)throw new Error("GOOGLE_OAUTH_STATE_INVALID");
          const error=u.searchParams.get("error"); if(error)throw new Error(`GOOGLE_OAUTH_${error.toUpperCase()}`);
          const code=u.searchParams.get("code"); if(!code)throw new Error("GOOGLE_OAUTH_CODE_MISSING");
          res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
          res.end("<!doctype html><meta charset='utf-8'><title>MK Receipt Pro</title><body style='font-family:Arial;text-align:center;padding:60px'><h2>החיבור ל-Google Drive הושלם</h2><p>אפשר לסגור את החלון ולחזור לתוכנה.</p></body>");
          clearTimeout(timeout);server.close();resolve(code);
        }catch(e){
          clearTimeout(timeout);server.close();res.writeHead(400);res.end("Authorization failed");reject(e);
        }
      });
    });
    await shell.openExternal(auth.toString());
    const code=await codePromise;
    const body=new URLSearchParams({client_id:normalized,code,code_verifier:verifier,grant_type:"authorization_code",redirect_uri:redirectUri});
    const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    const tokenPayload=await response.json().catch(()=>({})) as {refresh_token?:string;access_token?:string;error?:string;error_description?:string};
    if(!response.ok){
      const error=(tokenPayload.error||"unknown_error").replace(/[^A-Za-z0-9_-]/g,"_");
      const description=(tokenPayload.error_description||"").replace(/[\r\n|]/g," ").slice(0,300);
      throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED_${response.status}|${error}|${description}`);
    }
    const token=tokenPayload;
    if(!token.refresh_token||!token.access_token)throw new Error("GOOGLE_REFRESH_TOKEN_MISSING");
    let verifiedEmail=normalizedEmail;
    try{
      const userRes=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${token.access_token}`}});
      if(userRes.ok){const user=await userRes.json() as {email?:string};if(user.email)verifiedEmail=user.email.toLowerCase()}
    }catch{}
    this.state={clientId:normalized,accountEmail:verifiedEmail,encryptedRefreshToken:safeStorage.encryptString(token.refresh_token).toString("base64"),remoteFileId:null,remoteModifiedTime:null,lastSyncAt:null,lastLocalHash:null,deviceId:crypto.randomUUID()};
    this.runtimeState="idle";this.message=null;this.save();
    const remote=await this.findRemoteFile();
    if(remote){
      this.state.remoteFileId=remote.id;this.state.remoteModifiedTime=null;this.save();
      const local=this.database.getReceiptCoreStatus();
      if(local.receiptCount===0){await this.pullLatest();}else{this.runtimeState="conflict";this.message="נמצא קובץ קיים בענן. בחרי אם למשוך מהענן או להשתמש בנתוני המחשב הזה.";this.save()}
    }else{
      await this.forcePush();
    }
    return this.getStatus();
    }catch(error){
      this.runtimeState="error";
      this.message=error instanceof Error?error.message:"GOOGLE_DRIVE_CONNECT_FAILED";
      throw error;
    }finally{
      if(oauthServer?.listening)oauthServer.close();
    }
  }
  async disconnect():Promise<CloudSyncStatus>{
    if(this.pushTimer){clearTimeout(this.pushTimer);this.pushTimer=null;}
    if(this.running)await this.running.catch(()=>{});
    this.state=null;this.runtimeState="disconnected";this.message=null;
    try{fs.rmSync(this.statePath(),{force:true})}catch{}
    return this.getStatus();
  }
  schedulePush():void{
    if(!this.state)return;
    if(this.pushTimer)clearTimeout(this.pushTimer);
    this.pushTimer=setTimeout(()=>{
      this.pushTimer=null;
      void this.syncNow().catch(error=>{
        if(!this.state)return;
        this.runtimeState="error";
        this.message=error instanceof Error?error.message:"GOOGLE_SYNC_FAILED";
      });
    },1400);
  }
  async initializeAndSync():Promise<void>{
    if(!this.state)return;
    try{
      this.runtimeState="syncing";this.message="בודק עדכונים ב-Google Drive";
      const remote=this.state.remoteFileId?await this.getRemoteMeta(this.state.remoteFileId).catch(()=>null):await this.findRemoteFile();
      const local=this.snapshotWithHash();
      if(!remote){await this.pushBuffer(local.path,local.buffer,local.hash,true);return}
      this.state.remoteFileId=remote.id;
      if(this.state.remoteModifiedTime&&remote.modifiedTime!==this.state.remoteModifiedTime){
        if(this.state.lastLocalHash&&local.hash===this.state.lastLocalHash){await this.pullLatest();return}
        this.runtimeState="conflict";this.message="גם הענן וגם המחשב השתנו מאז הסנכרון האחרון. יש לבחור איזו גרסה לשמור.";this.save();return;
      }
      if(!this.state.remoteModifiedTime){
        const status=this.database.getReceiptCoreStatus();
        if(status.receiptCount===0){await this.pullLatest();return}
        this.runtimeState="conflict";this.message="נמצא מידע בענן וגם מידע מקומי. יש לבחור איזו גרסה לשמור.";this.save();return;
      }
      if(!this.state.lastLocalHash||local.hash!==this.state.lastLocalHash){await this.pushBuffer(local.path,local.buffer,local.hash,false);return}
      this.runtimeState="idle";this.message="הנתונים מסונכרנים";this.save();
    }catch(e){this.runtimeState="error";this.message=e instanceof Error?e.message:"GOOGLE_SYNC_FAILED"}
  }
  async syncNow():Promise<CloudSyncStatus>{
    if(!this.state)throw new Error("GOOGLE_DRIVE_NOT_CONNECTED");
    if(this.running){await this.running;return this.getStatus()}
    this.running=this.doSync();
    try{await this.running}finally{this.running=null}
    return this.getStatus();
  }
  private async doSync():Promise<void>{
    if(!this.state)return;
    this.runtimeState="syncing";this.message="מסנכרן עם Google Drive";
    const local=this.snapshotWithHash();
    const remote=this.state.remoteFileId?await this.getRemoteMeta(this.state.remoteFileId).catch(()=>null):await this.findRemoteFile();
    if(remote){
      if(!this.state.remoteFileId)this.state.remoteFileId=remote.id;
      if(this.state.remoteModifiedTime&&remote.modifiedTime!==this.state.remoteModifiedTime){
        if(this.state.lastLocalHash&&local.hash===this.state.lastLocalHash){await this.pullLatest();return}
        this.runtimeState="conflict";this.message="מחשב אחר עדכן את הענן וגם במחשב הזה יש שינויים חדשים. הסנכרון נעצר כדי למנוע דריסה.";this.save();return;
      }
    }
    if(this.state.lastLocalHash&&local.hash===this.state.lastLocalHash&&remote){this.runtimeState="idle";this.message="הנתונים מסונכרנים";this.save();return}
    await this.pushBuffer(local.path,local.buffer,local.hash,false);
  }
  async pullLatest():Promise<CloudSyncStatus>{
    if(!this.state)throw new Error("GOOGLE_DRIVE_NOT_CONNECTED");
    this.runtimeState="syncing";this.message="מוריד את הנתונים העדכניים";
    const remote=this.state.remoteFileId?await this.getRemoteMeta(this.state.remoteFileId):await this.findRemoteFile();
    if(!remote)throw new Error("GOOGLE_SYNC_REMOTE_NOT_FOUND");
    const access=await this.accessToken();
    const res=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remote.id)}?alt=media`,{headers:{Authorization:`Bearer ${access}`}});
    if(!res.ok)throw new Error(`GOOGLE_DRIVE_DOWNLOAD_FAILED_${res.status}`);
    const folder=path.join(this.userDataPath,"cloud-sync");fs.mkdirSync(folder,{recursive:true});
    const target=path.join(folder,"remote-latest.mkrbackup");
    fs.writeFileSync(target,Buffer.from(await res.arrayBuffer()));
    this.database.restoreCloudSyncSnapshot(target);
    const refreshed=await this.getRemoteMeta(remote.id);
    const localAfterRestore=this.snapshotWithHash();
    this.state.remoteFileId=remote.id;this.state.remoteModifiedTime=refreshed.modifiedTime;this.state.lastSyncAt=new Date().toISOString();this.state.lastLocalHash=localAfterRestore.hash;
    this.runtimeState="idle";this.message="הנתונים העדכניים הורדו מ-Google Drive";this.save();
    return this.getStatus();
  }
  async forcePush():Promise<CloudSyncStatus>{
    if(!this.state)throw new Error("GOOGLE_DRIVE_NOT_CONNECTED");
    this.runtimeState="syncing";this.message="מעלה את נתוני המחשב לענן";
    const local=this.snapshotWithHash();await this.pushBuffer(local.path,local.buffer,local.hash,true);
    return this.getStatus();
  }
  private decryptRefreshToken():string{
    if(!this.state||!safeStorage.isEncryptionAvailable())throw new Error("SECURE_STORAGE_UNAVAILABLE");
    return safeStorage.decryptString(Buffer.from(this.state.encryptedRefreshToken,"base64"));
  }
  private async accessToken():Promise<string>{
    if(!this.state)throw new Error("GOOGLE_DRIVE_NOT_CONNECTED");
    const clientId=this.state.clientId;
    const body=new URLSearchParams({client_id:clientId,refresh_token:this.decryptRefreshToken(),grant_type:"refresh_token"});
    const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    if(!res.ok)throw new Error(`GOOGLE_TOKEN_REFRESH_FAILED_${res.status}`);
    const json=await res.json() as {access_token?:string};if(!json.access_token)throw new Error("GOOGLE_ACCESS_TOKEN_MISSING");return json.access_token;
  }
  private async findRemoteFile():Promise<DriveFileMeta|null>{
    const access=await this.accessToken();
    const q=`name='${FILE_NAME}' and trashed=false`;
    const url=new URL("https://www.googleapis.com/drive/v3/files");url.searchParams.set("q",q);url.searchParams.set("spaces","drive");url.searchParams.set("pageSize","10");url.searchParams.set("orderBy","modifiedTime desc");url.searchParams.set("fields","files(id,name,modifiedTime,md5Checksum,size)");
    const res=await fetch(url,{headers:{Authorization:`Bearer ${access}`}});
    if(!res.ok)throw new Error(`GOOGLE_DRIVE_LIST_FAILED_${res.status}`);
    const json=await res.json() as {files?:DriveFileMeta[]};return json.files?.[0]??null;
  }
  private async getRemoteMeta(id:string):Promise<DriveFileMeta>{
    const access=await this.accessToken();
    const url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,modifiedTime,md5Checksum,size`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${access}`}});
    if(res.status===404){this.state!.remoteFileId=null;this.state!.remoteModifiedTime=null;this.save();const found=await this.findRemoteFile();if(!found)throw new Error("GOOGLE_SYNC_REMOTE_NOT_FOUND");return found}
    if(!res.ok)throw new Error(`GOOGLE_DRIVE_METADATA_FAILED_${res.status}`);return await res.json() as DriveFileMeta;
  }
  private snapshotWithHash():{path:string;buffer:Buffer;hash:string}{
    const snapshot=this.database.createCloudSyncSnapshot();
    const buffer=fs.readFileSync(snapshot);
    return {path:snapshot,buffer,hash:crypto.createHash("sha256").update(buffer).digest("hex")};
  }
  private async pushBuffer(_snapshotPath:string,buffer:Buffer,hash:string,force:boolean):Promise<void>{
    if(!this.state)return;
    let remote=this.state.remoteFileId?await this.getRemoteMeta(this.state.remoteFileId).catch(()=>null):await this.findRemoteFile();
    if(remote&&!force&&this.state.remoteModifiedTime&&remote.modifiedTime!==this.state.remoteModifiedTime){
      this.runtimeState="conflict";this.message="נמצא שינוי חדש ממחשב אחר. ההעלאה נעצרה כדי למנוע דריסה.";this.save();return;
    }
    const access=await this.accessToken();
    if(!remote){
      const create=await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime",{method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},body:JSON.stringify({name:FILE_NAME,mimeType:"application/octet-stream",appProperties:{mkReceiptProSync:"v1"}})});
      if(!create.ok)throw new Error(`GOOGLE_DRIVE_CREATE_FAILED_${create.status}`);
      remote=await create.json() as DriveFileMeta;this.state.remoteFileId=remote.id;
    }
    const upload=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(remote.id)}?uploadType=media&fields=id,name,modifiedTime,md5Checksum,size`,{method:"PATCH",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/octet-stream"},body:new Uint8Array(buffer)});
    if(!upload.ok)throw new Error(`GOOGLE_DRIVE_UPLOAD_FAILED_${upload.status}`);
    const meta=await upload.json() as DriveFileMeta;
    this.state.remoteFileId=meta.id;this.state.remoteModifiedTime=meta.modifiedTime;this.state.lastSyncAt=new Date().toISOString();this.state.lastLocalHash=hash;
    this.runtimeState="idle";this.message="הסנכרון הושלם";this.save();
  }
}
