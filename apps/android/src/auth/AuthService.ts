import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from "../config/supabasePublic";
import {MAX_PASSWORD_LENGTH,validateNewPassword} from "./passwordPolicy";

const PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery";
const RECOVERY_REQUEST_COOLDOWN_MS=60_000;
const RECOVERY_REQUEST_WINDOW_MS=15*60_000;
const MAX_RECOVERY_REQUESTS_PER_WINDOW=3;
const MAX_RECOVERY_LINK_LENGTH=16_384;
const MIN_RECOVERY_TOKEN_LENGTH=20;
const MAX_RECOVERY_TOKEN_LENGTH=4_096;
let recoveryLastRequestAt=0;
let recoveryRequestWindowStartedAt=0;
let recoveryRequestCount=0;
let activeRecovery: {client:SupabaseClient;email:string}|null=null;

function normalizeRecoveryEmail(raw:string):string{
  const email=raw.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error("AUTH_RECOVERY_REQUEST_FAILED");
  return email;
}

function createEphemeralRecoveryClient(){
  return createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}

function parseRecoveryLink(rawUrl:string):{access_token:string;refresh_token:string}{
  if(rawUrl.length>MAX_RECOVERY_LINK_LENGTH)throw new Error("AUTH_RECOVERY_INVALID_LINK");
  let url:URL;
  try{url=new URL(rawUrl)}catch{throw new Error("AUTH_RECOVERY_INVALID_LINK");}
  if(url.protocol!=="mkreceiptpro:"||url.hostname!=="auth"||url.pathname!=="/recovery")throw new Error("AUTH_RECOVERY_INVALID_LINK");
  const fragment=new URLSearchParams(url.hash.slice(1));
  const accessToken=fragment.get("access_token")||"";
  const refreshToken=fragment.get("refresh_token")||"";
  const valid=(value:string)=>value.length>=MIN_RECOVERY_TOKEN_LENGTH&&value.length<=MAX_RECOVERY_TOKEN_LENGTH;
  if(fragment.get("type")!=="recovery"||!valid(accessToken)||!valid(refreshToken))throw new Error("AUTH_RECOVERY_INVALID_LINK");
  return {access_token:accessToken,refresh_token:refreshToken};
}

function assertRecoveryRequestAllowed(now=Date.now()):void{
  if(now-recoveryLastRequestAt<RECOVERY_REQUEST_COOLDOWN_MS)throw new Error("AUTH_RECOVERY_REQUEST_COOLDOWN");
  if(now-recoveryRequestWindowStartedAt>=RECOVERY_REQUEST_WINDOW_MS){recoveryRequestWindowStartedAt=now;recoveryRequestCount=0;}
  if(recoveryRequestCount>=MAX_RECOVERY_REQUESTS_PER_WINDOW)throw new Error("AUTH_RECOVERY_REQUEST_LIMIT");
}

export const AuthService={
  async signIn(email:string,password:string){
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    if(error)throw error;
    return data.session;
  },
  async signUp(email:string,password:string){
    const passwordError=validateNewPassword(email,password);
    if(passwordError)throw new Error(passwordError);
    const {data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password});
    if(error)throw error;
    return data;
  },
  async changePassword(currentPassword:string,newPassword:string){
    if(!currentPassword)throw new Error("AUTH_CURRENT_PASSWORD_REQUIRED");
    if(currentPassword.length>MAX_PASSWORD_LENGTH)throw new Error("AUTH_CURRENT_PASSWORD_INVALID");
    if(currentPassword===newPassword)throw new Error("AUTH_PASSWORD_UNCHANGED");
    const {data:current,error:currentError}=await supabase.auth.getUser();
    if(currentError||!current.user?.email)throw new Error("AUTH_SESSION_REQUIRED");
    const passwordError=validateNewPassword(current.user.email,newPassword);
    if(passwordError)throw new Error(passwordError);
    const {data:verified,error:verifyError}=await supabase.auth.signInWithPassword({email:current.user.email.trim().toLowerCase(),password:currentPassword});
    if(verifyError||!verified.user)throw new Error("AUTH_CURRENT_PASSWORD_INVALID");
    if(verified.user.id!==current.user.id){await supabase.auth.signOut({scope:"local"}).catch(()=>{});throw new Error("AUTH_IDENTITY_CHANGED");}
    const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
    if(updateError)throw new Error("AUTH_PASSWORD_CHANGE_FAILED");
  },
  async requestPasswordRecovery(rawEmail:string){
    const email=normalizeRecoveryEmail(rawEmail);
    assertRecoveryRequestAllowed();
    const recoveryClient=createEphemeralRecoveryClient();
    try{
      const {error}=await recoveryClient.auth.resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_REDIRECT_URL});
      if(error)throw new Error("AUTH_RECOVERY_REQUEST_FAILED");
      const now=Date.now();
      recoveryLastRequestAt=now;
      recoveryRequestWindowStartedAt=recoveryRequestWindowStartedAt||now;
      recoveryRequestCount+=1;
    }finally{await recoveryClient.auth.signOut({scope:"local"}).catch(()=>{});}
  },
  async beginPasswordRecovery(rawUrl:string){
    const session=parseRecoveryLink(rawUrl);
    const recoveryClient=createEphemeralRecoveryClient();
    try{
      const {error:setSessionError}=await recoveryClient.auth.setSession(session);
      if(setSessionError)throw new Error("AUTH_RECOVERY_INVALID_LINK");
      const {data,error:userError}=await recoveryClient.auth.getUser();
      const email=data.user?.email||"";
      if(userError||!email)throw new Error("AUTH_RECOVERY_INVALID_LINK");
      await activeRecovery?.client.auth.signOut({scope:"local"}).catch(()=>{});
      activeRecovery={client:recoveryClient,email};
      await supabase.auth.signOut({scope:"local"}).catch(()=>{});
    }catch(error){
      await recoveryClient.auth.signOut({scope:"local"}).catch(()=>{});
      throw error;
    }
  },
  hasPendingPasswordRecovery(){return activeRecovery!==null;},
  async completePasswordRecovery(newPassword:string){
    const recovery=activeRecovery;
    if(!recovery)throw new Error("AUTH_RECOVERY_SESSION_INVALID");
    const passwordError=validateNewPassword(recovery.email,newPassword);
    if(passwordError)throw new Error(passwordError);
    const {error:updateError}=await recovery.client.auth.updateUser({password:newPassword});
    if(updateError)throw new Error("AUTH_RECOVERY_PASSWORD_UPDATE_FAILED");
    activeRecovery=null;
    const {error:globalSignOutError}=await recovery.client.auth.signOut({scope:"global"});
    await recovery.client.auth.signOut({scope:"local"}).catch(()=>{});
    await supabase.auth.signOut({scope:"local"}).catch(()=>{});
    if(globalSignOutError)throw new Error("AUTH_RECOVERY_SIGNOUT_FAILED");
  },
  async clearPendingPasswordRecovery(){
    const recovery=activeRecovery;
    activeRecovery=null;
    await recovery?.client.auth.signOut({scope:"local"}).catch(()=>{});
  },
  async signOut(){
    const {error}=await supabase.auth.signOut({scope:"local"});
    if(error)throw error;
  },
  async session(){
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    return data.session;
  }
};
