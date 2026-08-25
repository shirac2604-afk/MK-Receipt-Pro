import {supabase} from "../lib/supabase";
import {validateNewPassword} from "./passwordPolicy";

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
