// Phase 15 Staging client configuration for the isolated internal APK build.
// This file is copied over supabasePublic.ts only in the Staging build runner.
export const SUPABASE_URL="https://ymcmmvnfrfntmllytpyu.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_KnDNrw0ZkLpfPperkEL68Q_Fduyi87t";
export const PASSWORD_RECOVERY_ENABLED=true;

export function validateSupabasePublicConfig(){
  if(!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")){
    throw new Error("SUPABASE_URL_INVALID");
  }
  if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")){
    throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
  }
}
