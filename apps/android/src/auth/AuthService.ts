import {createClient} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL} from "../config/supabasePublic";
import {MAX_PASSWORD_LENGTH,validateNewPassword} from "./passwordPolicy";

const RECOVERY_TOKEN_RE=/^\d{6,10}$/;
const RECOVERY_REQUEST_COOLDOWN_MS=60_000;
const RECOVERY_REQUEST_WINDOW_MS=15*60_000;
const MAX_RECOVERY_REQUESTS_PER_WINDOW=3;
const RECOVERY_VERIFY_WINDOW_MS=15*60_000;
const MAX_RECOVERY_VERIFY_ATTEMPTS_PER_WINDOW=5;

let recoveryLastRequestAt=0;
let recoveryRequestWindowStartedAt=0;
let recoveryRequestCount=0;
let recoveryVerifyWindowStartedAt=0;
let recoveryVerifyAttemptCount=0;

function normalizeRecoveryEmail(raw:string):string{
  const email=raw.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error("AUTH_RECOVERY_REQUEST_FAILED");
  return email;
}

function createEphemeralRecoveryClient(){
  return createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{
    autoRefreshToken:false,
    persistSession:false,
    detectSessionInUrl:false
  }});
}

function assertRecoveryRequestAllowed(now=Date.now()):void{
  if(now-recoveryLastRequestAt<RECOVERY_REQUEST_COOLDOWN_MS)throw new Error("AUTH_RECOVERY_REQUEST_COOLDOWN");
  if(now-recoveryRequestWindowStartedAt>=RECOVERY_REQUEST_WINDOW_MS){
    recoveryRequestWindowStartedAt=now;
    recoveryRequestCount=0;
  }
  if(recoveryRequestCount>=MAX_RECOVERY_REQUESTS_PER_WINDOW)throw new Error("AUTH_RECOVERY_REQUEST_LIMIT");
}

function assertRecoveryVerificationAllowed(now=Date.now()):void{
  if(now-recoveryVerifyWindowStartedAt>=RECOVERY_VERIFY_WINDOW_MS){
    recoveryVerifyWindowStartedAt=now;
    recoveryVerifyAttemptCount=0;
  }
  if(recoveryVerifyAttemptCount>=MAX_RECOVERY_VERIFY_ATTEMPTS_PER_WINDOW)throw new Error("AUTH_RECOVERY_VERIFY_LIMIT");
  recoveryVerifyAttemptCount+=1;
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
    const {data:verified,error:verifyError}=await supabase.auth.signInWithPassword({
      email:current.user.email.trim().toLowerCase(),
      password:currentPassword
    });
    if(verifyError||!verified.user)throw new Error("AUTH_CURRENT_PASSWORD_INVALID");
    if(verified.user.id!==current.user.id){
      await supabase.auth.signOut({scope:"local"}).catch(()=>{});
      throw new Error("AUTH_IDENTITY_CHANGED");
    }
    const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
    if(updateError)throw new Error("AUTH_PASSWORD_CHANGE_FAILED");
  },
  async requestPasswordRecovery(rawEmail:string){
    const email=normalizeRecoveryEmail(rawEmail);
    assertRecoveryRequestAllowed();
    const recoveryClient=createEphemeralRecoveryClient();
    try{
      const {error}=await recoveryClient.auth.resetPasswordForEmail(email);
      if(error)throw new Error("AUTH_RECOVERY_REQUEST_FAILED");
      const now=Date.now();
      recoveryLastRequestAt=now;
      recoveryRequestWindowStartedAt=recoveryRequestWindowStartedAt||now;
      recoveryRequestCount+=1;
      recoveryVerifyWindowStartedAt=now;
      recoveryVerifyAttemptCount=0;
    }finally{
      await recoveryClient.auth.signOut({scope:"local"}).catch(()=>{});
    }
  },
  async completePasswordRecovery(rawEmail:string,token:string,newPassword:string){
    const email=normalizeRecoveryEmail(rawEmail);
    if(!RECOVERY_TOKEN_RE.test(token))throw new Error("AUTH_RECOVERY_CODE_INVALID");
    const passwordError=validateNewPassword(email,newPassword);
    if(passwordError)throw new Error(passwordError);
    assertRecoveryVerificationAllowed();
    const recoveryClient=createEphemeralRecoveryClient();
    try{
      const {data:verified,error:verifyError}=await recoveryClient.auth.verifyOtp({email,token,type:"recovery"});
      const verifiedEmail=verified.user?.email?.trim().toLowerCase();
      if(verifyError||!verified.user||verifiedEmail!==email)throw new Error("AUTH_RECOVERY_CODE_INVALID");
      const {error:updateError}=await recoveryClient.auth.updateUser({password:newPassword});
      if(updateError)throw new Error("AUTH_RECOVERY_UPDATE_FAILED");
      const {error:signOutError}=await recoveryClient.auth.signOut({scope:"global"});
      if(signOutError)throw new Error("AUTH_RECOVERY_GLOBAL_SIGNOUT_FAILED");
      recoveryVerifyAttemptCount=0;
    }finally{
      await recoveryClient.auth.signOut({scope:"local"}).catch(()=>{});
      await supabase.auth.signOut({scope:"local"}).catch(()=>{});
    }
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
