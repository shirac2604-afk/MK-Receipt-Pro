import {supabase} from "../lib/supabase";
import {MAX_PASSWORD_LENGTH,validateNewPassword} from "./passwordPolicy";

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
