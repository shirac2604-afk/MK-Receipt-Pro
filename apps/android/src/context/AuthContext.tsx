import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {AuthService} from "../auth/AuthService";

type AuthValue={
 session:Session|null;
 loading:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 signUp:(email:string,password:string)=>Promise<void>;
 changePassword:(currentPassword:string,newPassword:string)=>Promise<void>;
 signOut:()=>Promise<void>;
};

const Ctx=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  let active=true;
  AuthService.session().then(s=>{if(active)setSession(s)}).finally(()=>{if(active)setLoading(false)});
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
  return ()=>{active=false;data.subscription.unsubscribe()};
 },[]);

 const value=useMemo<AuthValue>(()=>({
  session,loading,
  signIn:async(email,password)=>{await AuthService.signIn(email,password)},
  signUp:async(email,password)=>{await AuthService.signUp(email,password)},
  changePassword:async(currentPassword,newPassword)=>{await AuthService.changePassword(currentPassword,newPassword)},
  signOut:async()=>{await AuthService.signOut()}
 }),[session,loading]);

 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(){
 const value=useContext(Ctx);
 if(!value)throw new Error("AUTH_PROVIDER_REQUIRED");
 return value;
}
