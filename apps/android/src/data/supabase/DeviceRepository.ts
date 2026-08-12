import * as SecureStore from "expo-secure-store";
import {supabase} from "../../lib/supabase";

const DEVICE_KEY="mk_device_key_v1";
const DEVICE_ID="mk_cloud_device_id_v1";

export interface CloudDevice{
 id:string;
 platform:"windows"|"android";
 displayName:string|null;
 lastSeenAt:string;
 createdAt:string;
}

function randomId(){
 return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
  const r=Math.random()*16|0,v=c==="x"?r:(r&3|8);
  return v.toString(16);
 });
}

export async function ensureAndroidDevice(businessId:string){
 let deviceKey=await SecureStore.getItemAsync(DEVICE_KEY);
 if(!deviceKey){
  deviceKey=randomId();
  await SecureStore.setItemAsync(DEVICE_KEY,deviceKey);
 }
 const {data,error}=await supabase.rpc("register_device",{
  p_business_id:businessId,
  p_device_key:deviceKey,
  p_platform:"android",
  p_display_name:"Android"
 });
 if(error)throw error;
 const deviceId=String(data);
 await SecureStore.setItemAsync(DEVICE_ID,deviceId);
 return deviceId;
}

export async function getCloudDeviceId(){
 return SecureStore.getItemAsync(DEVICE_ID);
}

export async function listBusinessDevices(businessId:string):Promise<CloudDevice[]>{
 const {data,error}=await supabase.from("devices")
   .select("id,platform,display_name,last_seen_at,created_at")
   .eq("business_id",businessId)
   .order("last_seen_at",{ascending:false});
 if(error)throw error;
 return (data??[]).map((row:any)=>({
   id:String(row.id),
   platform:row.platform,
   displayName:row.display_name??null,
   lastSeenAt:String(row.last_seen_at),
   createdAt:String(row.created_at)
 }));
}
export async function revokeBusinessDevice(businessId:string,deviceId:string,currentDeviceId:string|null):Promise<void>{
 const {error}=await supabase.rpc("revoke_device",{
  p_business_id:businessId,
  p_device_id:deviceId,
  p_current_device_id:currentDeviceId
 });
 if(error)throw error;
}

