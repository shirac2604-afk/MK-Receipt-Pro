import * as ImagePicker from "expo-image-picker";
import {decode,encode} from "base64-arraybuffer";
import {supabase} from "../lib/supabase";

const BUCKET="business-branding";

export interface PickedBusinessLogo{
  base64:string;
  mimeType:string;
}

export async function pickBusinessLogo():Promise<PickedBusinessLogo|null>{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted)throw new Error("MEDIA_LIBRARY_PERMISSION_REQUIRED");

  const result=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:["images"],
    allowsEditing:true,
    aspect:[1,1],
    quality:0.9,
    base64:true
  });
  if(result.canceled)return null;
  const asset=result.assets[0];
  if(!asset?.base64)throw new Error("BUSINESS_LOGO_DATA_MISSING");
  return {base64:asset.base64,mimeType:asset.mimeType||"image/png"};
}

export async function uploadBusinessLogo(businessId:string,logo:PickedBusinessLogo){
  const storageKey=`${businessId}/logo`;
  const {error}=await supabase.storage.from(BUCKET).upload(
    storageKey,
    decode(logo.base64),
    {contentType:logo.mimeType,cacheControl:"3600",upsert:true}
  );
  if(error)throw error;

  const {error:updateError}=await supabase.from("businesses")
    .update({logo_storage_key:storageKey,updated_at:new Date().toISOString()})
    .eq("id",businessId);
  if(updateError)throw updateError;
  return storageKey;
}

export async function getBusinessLogoDataUrl(storageKey:string|null|undefined):Promise<string|null>{
  if(!storageKey)return null;
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(storageKey,300);
  if(error)throw error;
  const response=await fetch(data.signedUrl);
  if(!response.ok)throw new Error(`BUSINESS_LOGO_DOWNLOAD_HTTP_${response.status}`);
  const contentType=response.headers.get("content-type")||"image/png";
  const buffer=await response.arrayBuffer();
  return `data:${contentType};base64,${encode(buffer)}`;
}
