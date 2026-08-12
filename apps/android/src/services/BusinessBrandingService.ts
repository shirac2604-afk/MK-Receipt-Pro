import * as ImagePicker from "expo-image-picker";
import {encode} from "base64-arraybuffer";
import {supabase} from "../lib/supabase";
import {assertTrustedSupabaseSignedUrl} from "../security/TrustedExternalUrl";
import {ALLOWED_IMAGE_MIMES,decodeAndValidateImage,validateDecodedImage} from "../security/SafeImage";

const BUCKET="business-branding";
const MAX_LOGO_BYTES=5*1024*1024;

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
  const mime=asset.mimeType||"";
  if(!ALLOWED_IMAGE_MIMES.has(mime))throw new Error("UNSUPPORTED_BUSINESS_LOGO_TYPE");
  try{decodeAndValidateImage(asset.base64,mime,MAX_LOGO_BYTES)}
  catch(error){
    const code=error instanceof Error?error.message:"BUSINESS_LOGO_INVALID";
    if(code==="IMAGE_TOO_LARGE")throw new Error("BUSINESS_LOGO_TOO_LARGE");
    if(code==="UNSUPPORTED_IMAGE_TYPE")throw new Error("UNSUPPORTED_BUSINESS_LOGO_TYPE");
    throw new Error("BUSINESS_LOGO_CONTENT_INVALID");
  }
  return {base64:asset.base64,mimeType:mime};
}

export async function uploadBusinessLogo(businessId:string,logo:PickedBusinessLogo){
  let buffer:ArrayBuffer;
  try{buffer=decodeAndValidateImage(logo.base64,logo.mimeType,MAX_LOGO_BYTES)}
  catch(error){
    const code=error instanceof Error?error.message:"BUSINESS_LOGO_INVALID";
    if(code==="IMAGE_TOO_LARGE")throw new Error("BUSINESS_LOGO_TOO_LARGE");
    if(code==="UNSUPPORTED_IMAGE_TYPE")throw new Error("UNSUPPORTED_BUSINESS_LOGO_TYPE");
    throw new Error("BUSINESS_LOGO_CONTENT_INVALID");
  }
  const storageKey=`${businessId}/logo`;
  const {error}=await supabase.storage.from(BUCKET).upload(
    storageKey,
    buffer,
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
  const trustedUrl=assertTrustedSupabaseSignedUrl(data.signedUrl);
  const response=await fetch(trustedUrl,{redirect:"error"});
  if(!response.ok)throw new Error(`BUSINESS_LOGO_DOWNLOAD_HTTP_${response.status}`);
  const contentType=(response.headers.get("content-type")||"").split(";",1)[0].trim().toLowerCase();
  if(!ALLOWED_IMAGE_MIMES.has(contentType))throw new Error("UNSUPPORTED_BUSINESS_LOGO_TYPE");
  const declaredLength=Number(response.headers.get("content-length")||0);
  if(Number.isFinite(declaredLength)&&declaredLength>MAX_LOGO_BYTES)throw new Error("BUSINESS_LOGO_TOO_LARGE");
  const buffer=await response.arrayBuffer();
  try{validateDecodedImage(buffer,contentType,MAX_LOGO_BYTES)}
  catch(error){
    const code=error instanceof Error?error.message:"BUSINESS_LOGO_INVALID";
    if(code==="IMAGE_TOO_LARGE")throw new Error("BUSINESS_LOGO_TOO_LARGE");
    if(code==="UNSUPPORTED_IMAGE_TYPE")throw new Error("UNSUPPORTED_BUSINESS_LOGO_TYPE");
    throw new Error("BUSINESS_LOGO_CONTENT_INVALID");
  }
  return `data:${contentType};base64,${encode(buffer)}`;
}
