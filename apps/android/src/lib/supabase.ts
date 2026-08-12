import {AppState,Platform} from "react-native";
import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {createClient,processLock} from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  validateSupabasePublicConfig
} from "../config/supabasePublic";

validateSupabasePublicConfig();

const secureAuthStorage={
  async getItem(key:string){
    const secure=await SecureStore.getItemAsync(key);
    if(secure!==null)return secure;
    // One-time migration from older releases that stored the Supabase session in AsyncStorage.
    const legacy=await AsyncStorage.getItem(key);
    if(legacy!==null){
      await SecureStore.setItemAsync(key,legacy,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key:string,value:string){
    await SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key:string){
    await Promise.all([SecureStore.deleteItemAsync(key),AsyncStorage.removeItem(key)]);
  }
};

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    ...(Platform.OS!=="web"?{storage:secureAuthStorage}:{}),
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:false,
    lock:processLock
  }
});

if(Platform.OS!=="web"){
  AppState.addEventListener("change",(state)=>{
    if(state==="active")supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
