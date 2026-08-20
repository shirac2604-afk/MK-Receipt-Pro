import {safeStorage,shell} from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import type {LessonRecord} from "../../../../packages/database/src/studentTypes";

const AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL="https://oauth2.googleapis.com/token";
const CALENDAR_API="https://www.googleapis.com/calendar/v3";
const SCOPE="https://www.googleapis.com/auth/calendar.events.owned";
const TIME_ZONE="Asia/Jerusalem";

type StoredTokens={accessToken:string;refreshToken:string|null;expiresAt:number;scope:string;tokenType:string};
type Config={clientId:string;lastSyncAt:string|null;lastError:string|null};
export interface GoogleCalendarStatus{configured:boolean;connected:boolean;syncing:boolean;calendarId:string;lastSyncAt:string|null;lastError:string|null;}
export interface GoogleCalendarSyncResult{total:number;created:number;updated:number;deleted:number;failed:number;}

function base64url(value:Buffer){return value.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function html(message:string){return `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>מפתחות להצלחה</title><body style="font-family:Arial,sans-serif;padding:40px"><h2>${message}</h2><p>אפשר לסגור את החלון ולחזור לתוכנה.</p></body></html>`;}
function sendOAuthPage(response:http.ServerResponse,status:number,message:string){if(response.writableEnded)return;response.writeHead(status,{"content-type":"text/html; charset=utf-8"});response.end(html(message));}

export class GoogleCalendarService{
 private readonly configPath:string;
 private readonly tokenPath:string;
 private syncing=false;
 private lastError:string|null=null;
 constructor(userDataPath:string){const folder=path.join(userDataPath,"student-module");this.configPath=path.join(folder,"google-calendar-config.json");this.tokenPath=path.join(folder,"google-calendar-token.bin");}

 private readConfig():Config{try{const raw=JSON.parse(fs.readFileSync(this.configPath,"utf8"));return{clientId:typeof raw?.clientId==="string"?raw.clientId:"",lastSyncAt:typeof raw?.lastSyncAt==="string"?raw.lastSyncAt:null,lastError:typeof raw?.lastError==="string"?raw.lastError:null};}catch{return{clientId:"",lastSyncAt:null,lastError:null};}}
 private writeConfig(config:Config){fs.mkdirSync(path.dirname(this.configPath),{recursive:true});fs.writeFileSync(this.configPath,JSON.stringify(config,null,2),"utf8");}
 private readTokens():StoredTokens|null{try{if(!safeStorage.isEncryptionAvailable())return null;const encrypted=fs.readFileSync(this.tokenPath);const parsed=JSON.parse(safeStorage.decryptString(encrypted));if(typeof parsed?.accessToken!=="string")return null;return parsed as StoredTokens;}catch{return null;}}
 private writeTokens(tokens:StoredTokens){if(!safeStorage.isEncryptionAvailable())throw new Error("GOOGLE_SECURE_STORAGE_UNAVAILABLE");fs.mkdirSync(path.dirname(this.tokenPath),{recursive:true});fs.writeFileSync(this.tokenPath,safeStorage.encryptString(JSON.stringify(tokens)));}
 getStatus():GoogleCalendarStatus{const config=this.readConfig();return{configured:Boolean(config.clientId),connected:Boolean(this.readTokens()),syncing:this.syncing,calendarId:"primary",lastSyncAt:config.lastSyncAt,lastError:this.lastError??config.lastError};}
 private clearLastError(){const config=this.readConfig();this.writeConfig({...config,lastError:null});this.lastError=null;}
 private rememberError(error:unknown){const code=error instanceof Error?error.message:"GOOGLE_CALENDAR_CONNECT_FAILED";const config=this.readConfig();this.writeConfig({...config,lastError:code});this.lastError=code;}
 setClientId(raw:string):GoogleCalendarStatus{const clientId=raw.trim();if(!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error("INVALID_GOOGLE_CLIENT_ID");const current=this.readConfig();if(current.clientId&&current.clientId!==clientId){try{fs.rmSync(this.tokenPath,{force:true});}catch{}}this.writeConfig({clientId,lastSyncAt:current.lastSyncAt,lastError:null});this.lastError=null;return this.getStatus();}
 disconnect():GoogleCalendarStatus{try{fs.rmSync(this.tokenPath,{force:true});}catch{}this.clearLastError();return this.getStatus();}

 async connect():Promise<GoogleCalendarStatus>{
  const config=this.readConfig();if(!config.clientId)throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  const verifier=base64url(crypto.randomBytes(48));
  const challenge=base64url(crypto.createHash("sha256").update(verifier).digest());
  const state=base64url(crypto.randomBytes(24));
  const server=http.createServer();
  let oauthResponse:http.ServerResponse|undefined;
  try{
   await new Promise<void>((resolve,reject)=>{
    const onError=(error:Error)=>{server.off("listening",onListening);reject(error)};
    const onListening=()=>{server.off("error",onError);resolve()};
    server.once("error",onError);server.once("listening",onListening);server.listen(0,"127.0.0.1");
   });
   const address=server.address();if(!address||typeof address==="string")throw new Error("GOOGLE_OAUTH_LISTENER_FAILED");
   const redirectUri=`http://127.0.0.1:${address.port}`;
   const callback=new Promise<string>((resolve,reject)=>{
    server.on("request",(req,res)=>{try{const url=new URL(req.url??"/",redirectUri);if(url.pathname!=="/"){res.writeHead(404);res.end();return;}if(url.searchParams.get("state")!==state)throw new Error("GOOGLE_OAUTH_STATE_MISMATCH");const oauthError=url.searchParams.get("error");if(oauthError)throw new Error(`GOOGLE_OAUTH_DENIED:${oauthError}`);const code=url.searchParams.get("code");if(!code)throw new Error("GOOGLE_OAUTH_CODE_MISSING");oauthResponse=res;resolve(code);}catch(error){sendOAuthPage(res,400,"החיבור לא הושלם");reject(error);}});
   });
   const url=new URL(AUTH_URL);url.searchParams.set("client_id",config.clientId);url.searchParams.set("redirect_uri",redirectUri);url.searchParams.set("response_type","code");url.searchParams.set("scope",SCOPE);url.searchParams.set("state",state);url.searchParams.set("code_challenge",challenge);url.searchParams.set("code_challenge_method","S256");url.searchParams.set("access_type","offline");url.searchParams.set("prompt","consent");
   await shell.openExternal(url.toString());
   let timer:NodeJS.Timeout|undefined;const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("GOOGLE_OAUTH_TIMEOUT")),180000);timer.unref();});
   const code=await Promise.race([callback,timeout]);if(timer)clearTimeout(timer);
   const body=new URLSearchParams({client_id:config.clientId,code,code_verifier:verifier,redirect_uri:redirectUri,grant_type:"authorization_code"});
   const response=await fetch(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,redirect:"error"});
   const data:any=await response.json().catch(()=>({}));if(!response.ok||typeof data.access_token!=="string")throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED:${data.error??response.status}`);
   this.writeTokens({accessToken:data.access_token,refreshToken:typeof data.refresh_token==="string"?data.refresh_token:null,expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000,scope:String(data.scope??SCOPE),tokenType:String(data.token_type??"Bearer")});this.clearLastError();if(oauthResponse)sendOAuthPage(oauthResponse,200,"החיבור ל-Google Calendar אושר בהצלחה");return this.getStatus();
  }catch(error){this.rememberError(error);if(oauthResponse)sendOAuthPage(oauthResponse,400,"החיבור לא הושלם — חזרי לתוכנה לפרטים");throw error;}finally{server.close();}
 }

 private async accessToken(forceRefresh=false):Promise<string>{const config=this.readConfig(),tokens=this.readTokens();if(!config.clientId||!tokens)throw new Error("GOOGLE_CALENDAR_NOT_CONNECTED");if(!forceRefresh&&tokens.expiresAt>Date.now()+60000)return tokens.accessToken;if(!tokens.refreshToken)throw new Error("GOOGLE_CALENDAR_RECONNECT_REQUIRED");const body=new URLSearchParams({client_id:config.clientId,refresh_token:tokens.refreshToken,grant_type:"refresh_token"});const response=await fetch(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,redirect:"error"});const data:any=await response.json().catch(()=>({}));if(!response.ok||typeof data.access_token!=="string")throw new Error(`GOOGLE_TOKEN_REFRESH_FAILED:${data.error??response.status}`);const refreshed={...tokens,accessToken:data.access_token,expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000,scope:String(data.scope??tokens.scope),tokenType:String(data.token_type??tokens.tokenType)};this.writeTokens(refreshed);return refreshed.accessToken;}
 private eventId(lessonId:string){return `mk${crypto.createHash("sha256").update(`mkstudent:${lessonId}`).digest("hex").slice(0,48)}`;}
 private eventBody(lesson:LessonRecord){return{id:this.eventId(lesson.id),summary:lesson.title,description:`מפתחות להצלחה - יומן תלמידים\nlesson:${lesson.id}\nסוג: ${lesson.kind==="group"?"קבוצתי":"פרטני"}`,start:{dateTime:lesson.startsAt,timeZone:TIME_ZONE},end:{dateTime:lesson.endsAt,timeZone:TIME_ZONE},extendedProperties:{private:{mkLessonId:lesson.id,mkSource:"student-module"}}};}
 private async request(url:string,init:RequestInit,token:string){return fetch(url,{...init,headers:{authorization:`Bearer ${token}`,"content-type":"application/json",...(init.headers??{})},redirect:"error"});}
 async syncLessons(rawLessons:LessonRecord[]):Promise<GoogleCalendarSyncResult>{if(this.syncing)throw new Error("GOOGLE_CALENDAR_SYNC_IN_PROGRESS");this.syncing=true;this.clearLastError();try{const unique=[...new Map(rawLessons.map(x=>[x.id,x])).values()];let token=await this.accessToken(),created=0,updated=0,deleted=0,failed=0;for(const lesson of unique){const eventId=this.eventId(lesson.id),base=`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`;try{if(lesson.status==="cancelled"){let response=await this.request(base,{method:"DELETE"},token);if(response.status===401){token=await this.accessToken(true);response=await this.request(base,{method:"DELETE"},token);}if(response.ok||response.status===404)deleted++;else failed++;continue;}const body=this.eventBody(lesson);let response=await this.request(`${CALENDAR_API}/calendars/primary/events?sendUpdates=none`,{method:"POST",body:JSON.stringify(body)},token);if(response.status===401){token=await this.accessToken(true);response=await this.request(`${CALENDAR_API}/calendars/primary/events?sendUpdates=none`,{method:"POST",body:JSON.stringify(body)},token);}if(response.ok){created++;continue;}if(response.status===409){const patch={...body};delete (patch as any).id;let updatedResponse=await this.request(`${base}?sendUpdates=none`,{method:"PATCH",body:JSON.stringify(patch)},token);if(updatedResponse.status===401){token=await this.accessToken(true);updatedResponse=await this.request(`${base}?sendUpdates=none`,{method:"PATCH",body:JSON.stringify(patch)},token);}if(updatedResponse.ok)updated++;else failed++;}else failed++;}catch{failed++;}}const current=this.readConfig(),lastSyncAt=new Date().toISOString();this.writeConfig({...current,lastSyncAt});return{total:unique.length,created,updated,deleted,failed};}catch(error){this.rememberError(error);throw error;}finally{this.syncing=false;}}
}
