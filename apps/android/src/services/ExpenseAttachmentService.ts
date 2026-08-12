import * as ImagePicker from "expo-image-picker";
import {supabase} from "../lib/supabase";
import {ALLOWED_IMAGE_MIMES,decodeAndValidateImage} from "../security/SafeImage";

const BUCKET="expense-attachments";
const MAX_ATTACHMENT_BYTES=9*1024*1024;

function assertSafeAttachment(attachment:PickedAttachment):ArrayBuffer{
  if(!ALLOWED_IMAGE_MIMES.has(attachment.mimeType))throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
  if(attachment.originalName.length>180)throw new Error("ATTACHMENT_NAME_TOO_LONG");
  try{return decodeAndValidateImage(attachment.base64,attachment.mimeType,MAX_ATTACHMENT_BYTES)}
  catch(error){
    const code=error instanceof Error?error.message:"ATTACHMENT_INVALID";
    if(code==="UNSUPPORTED_IMAGE_TYPE")throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
    if(code==="IMAGE_TOO_LARGE")throw new Error("ATTACHMENT_TOO_LARGE");
    throw new Error("ATTACHMENT_CONTENT_INVALID");
  }
}

function extensionForMime(mime:string|undefined){
  if(mime==="image/png")return "png";
  if(mime==="image/webp")return "webp";
  if(mime==="image/jpeg")return "jpg";
  throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
}

function randomName(){
  return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}

export interface PickedAttachment{
  base64:string;
  mimeType:string;
  originalName:string;
}

export async function takeExpensePhoto():Promise<PickedAttachment|null>{
  const permission=await ImagePicker.requestCameraPermissionsAsync();
  if(!permission.granted)throw new Error("CAMERA_PERMISSION_REQUIRED");

  const result=await ImagePicker.launchCameraAsync({
    mediaTypes:["images"],
    allowsEditing:false,
    quality:0.8,
    base64:true
  });
  if(result.canceled)return null;
  const asset=result.assets[0];
  if(!asset?.base64)throw new Error("CAMERA_IMAGE_DATA_MISSING");

  const mime=asset.mimeType||"image/jpeg";
  if(!ALLOWED_IMAGE_MIMES.has(mime))throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
  const picked={
    base64:asset.base64,
    mimeType:mime,
    originalName:asset.fileName||`camera.${extensionForMime(mime)}`
  };
  assertSafeAttachment(picked);
  return picked;
}

export async function pickExpensePhoto():Promise<PickedAttachment|null>{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted)throw new Error("MEDIA_LIBRARY_PERMISSION_REQUIRED");

  const result=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:["images"],
    allowsEditing:false,
    quality:0.9,
    base64:true
  });
  if(result.canceled)return null;
  const asset=result.assets[0];
  if(!asset?.base64)throw new Error("GALLERY_IMAGE_DATA_MISSING");

  const mime=asset.mimeType||"image/jpeg";
  if(!ALLOWED_IMAGE_MIMES.has(mime))throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
  const picked={
    base64:asset.base64,
    mimeType:mime,
    originalName:asset.fileName||`gallery.${extensionForMime(mime)}`
  };
  assertSafeAttachment(picked);
  return picked;
}

export async function uploadExpenseAttachment(
  businessId:string,
  expenseId:string,
  attachment:PickedAttachment
){
  const buffer=assertSafeAttachment(attachment);
  const ext=extensionForMime(attachment.mimeType);
  const storageKey=`${businessId}/${expenseId}/${randomName()}.${ext}`;

  const {error}=await supabase.storage
    .from(BUCKET)
    .upload(storageKey,buffer,{
      contentType:attachment.mimeType,
      cacheControl:"3600",
      upsert:false
    });

  if(error)throw error;
  return {
    storageKey,
    originalName:attachment.originalName
  };
}

export async function createExpenseAttachmentSignedUrl(storageKey:string){
  const {data,error}=await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storageKey,300);
  if(error)throw error;
  return data.signedUrl;
}
