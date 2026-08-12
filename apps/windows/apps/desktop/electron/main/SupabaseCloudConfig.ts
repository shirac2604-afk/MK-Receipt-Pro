// Public Supabase client configuration.
// Publishable keys are intentionally safe for desktop/mobile clients.
export const SUPABASE_URL="https://noimclnzzuxcszdotmby.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_teF0oR3uCfoq5RUOx1zf-g_6z96RgQO";

export function validateSupabaseConfig():void{
 if(!SUPABASE_URL.startsWith("https://")||!SUPABASE_URL.endsWith(".supabase.co"))throw new Error("SUPABASE_URL_INVALID");
 if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
}
