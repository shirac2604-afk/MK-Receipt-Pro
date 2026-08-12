import {decode} from "base64-arraybuffer";

export const ALLOWED_IMAGE_MIMES=new Set(["image/jpeg","image/png","image/webp"]);

function hasExpectedMagic(bytes:Uint8Array,mimeType:string):boolean{
  if(mimeType==="image/png"){
    const sig=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
    return bytes.length>=sig.length&&sig.every((value,index)=>bytes[index]===value);
  }
  if(mimeType==="image/jpeg"){
    return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  }
  if(mimeType==="image/webp"){
    if(bytes.length<12)return false;
    const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
    return ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP";
  }
  return false;
}

export function assertAllowedImageMime(mimeType:string):void{
  if(!ALLOWED_IMAGE_MIMES.has(mimeType))throw new Error("UNSUPPORTED_IMAGE_TYPE");
}

export function validateDecodedImage(buffer:ArrayBuffer,mimeType:string,maxBytes:number):ArrayBuffer{
  assertAllowedImageMime(mimeType);
  if(buffer.byteLength<=0||buffer.byteLength>maxBytes)throw new Error("IMAGE_TOO_LARGE");
  if(!hasExpectedMagic(new Uint8Array(buffer),mimeType))throw new Error("IMAGE_CONTENT_MISMATCH");
  return buffer;
}

export function decodeAndValidateImage(base64:string,mimeType:string,maxBytes:number):ArrayBuffer{
  if(typeof base64!=="string"||!base64)throw new Error("IMAGE_DATA_MISSING");
  let buffer:ArrayBuffer;
  try{buffer=decode(base64)}catch{throw new Error("IMAGE_DATA_INVALID")}
  return validateDecodedImage(buffer,mimeType,maxBytes);
}
