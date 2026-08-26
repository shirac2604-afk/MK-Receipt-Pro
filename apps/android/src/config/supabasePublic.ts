// Production client configuration for MK Receipt Pro Android.
// Staging APK workflows replace this file with supabasePublic.staging.ts only
// inside their isolated build runner. Never put service_role/secret keys here.
export const SUPABASE_URL="https://noimclnzzuxcszdotmby.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_teF0oR3uCfoq5RUOx1zf-g_6z96RgQO";
// The personal Production build does not expose password recovery.
export const PASSWORD_RECOVERY_ENABLED=false;

export function validateSupabasePublicConfig(){
  if(!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")){
    throw new Error("SUPABASE_URL_INVALID");
  }
  if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")){
    throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
  }
}
