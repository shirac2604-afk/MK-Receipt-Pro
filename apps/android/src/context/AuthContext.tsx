import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from "react";
import {Linking} from "react-native";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {AuthService} from "../auth/AuthService";

type AuthValue={
 session:Session|null;
 loading:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 signUp:(email:string,password:string)=>Promise<void>;
 changePassword:(currentPassword:string,newPassword:string)=>Promise<void>;
 recoveryActive:boolean;
 completePasswordRecovery:(newPassword:string)=>Promise<void>;
 clearPasswordRecovery:()=>Promise<void>;
 signOut:()=>Promise<void>;
};

const Ctx=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 const [recoveryActive,setRecoveryActive]=useState(false);
 const recoveryAttempt=useRef(0);

 useEffect(()=>{
  let active=true;
  async function receiveRecovery(url:string){
    const attempt=++recoveryAttempt.current;
    if(active)setLoading(true);
    try{
      await AuthService.beginPasswordRecovery(url);
      if(active&&recoveryAttempt.current===attempt){setSession(null);setRecoveryActive(true);}
    }catch{
      await AuthService.clearPendingPasswordRecovery();
      const currentSession=await AuthService.session().catch(()=>null);
      if(active&&recoveryAttempt.current===attempt){setSession(currentSession);setRecoveryActive(false);}
    }finally{if(active&&recoveryAttempt.current===attempt)setLoading(false);}
  }
  AuthService.session().then(s=>{if(active&&recoveryAttempt.current===0)setSession(s)}).finally(()=>{if(active&&recoveryAttempt.current===0)setLoading(false)});
  void Linking.getInitialURL().then(url=>{if(url)void receiveRecovery(url)});
  const linkSubscription=Linking.addEventListener("url",({url})=>{void receiveRecovery(url)});
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
  return ()=>{active=false;linkSubscription.remove();data.subscription.unsubscribe()};
 },[]);

 const value=useMemo<AuthValue>(()=>({
  session,loading,
  signIn:async(email,password)=>{await AuthService.signIn(email,password)},
  signUp:async(email,password)=>{await AuthService.signUp(email,password)},
  changePassword:async(currentPassword,newPassword)=>{await AuthService.changePassword(currentPassword,newPassword)},
  recoveryActive,
  completePasswordRecovery:async(newPassword)=>{await AuthService.completePasswordRecovery(newPassword);setRecoveryActive(false)},
  clearPasswordRecovery:async()=>{await AuthService.clearPendingPasswordRecovery();setRecoveryActive(false)},
  signOut:async()=>{await AuthService.signOut()}
 }),[session,loading,recoveryActive]);

 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(){
 const value=useContext(Ctx);
 if(!value)throw new Error("AUTH_PROVIDER_REQUIRED");
 return value;
}
