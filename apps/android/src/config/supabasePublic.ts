// Phase 15 Staging client configuration for MK Receipt Pro Android.
// This feature branch must never use the Production project. These values are
// safe for client-side use; never put service_role/secret keys here.
export const SUPABASE_URL="https://ymcmmvnfrfntmllytpyu.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_KnDNrw0ZkLpfPperkEL68Q_Fduyi87t";

export function validateSupabasePublicConfig(){
  if(!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")){
    throw new Error("SUPABASE_URL_INVALID");
  }
  if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")){
    throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
  }
}
