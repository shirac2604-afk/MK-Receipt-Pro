const SUPABASE_HOST="noimclnzzuxcszdotmby.supabase.co";

export function assertTrustedSupabaseSignedUrl(rawUrl:string):string{
  let url:URL;
  try{url=new URL(rawUrl)}catch{throw new Error("UNTRUSTED_EXTERNAL_URL")}
  if(url.protocol!=="https:"||url.hostname.toLowerCase()!==SUPABASE_HOST){
    throw new Error("UNTRUSTED_EXTERNAL_URL");
  }
  if(!url.pathname.startsWith("/storage/v1/object/sign/")){
    throw new Error("UNTRUSTED_EXTERNAL_URL");
  }
  return url.toString();
}
