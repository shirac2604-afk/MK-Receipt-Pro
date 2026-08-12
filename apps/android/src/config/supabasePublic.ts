// Public client configuration for MK Receipt Pro Android.
// These values are safe for client-side use. Never put service_role/secret keys here.
export const SUPABASE_URL="https://noimclnzzuxcszdotmby.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_teF0oR3uCfoq5RUOx1zf-g_6z96RgQO";

export function validateSupabasePublicConfig(){
  if(!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")){
    throw new Error("SUPABASE_URL_INVALID");
  }
  if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")){
    throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
  }
}
