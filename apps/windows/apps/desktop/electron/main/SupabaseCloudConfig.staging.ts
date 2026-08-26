// Phase 15 STAGING build configuration.
// The Staging workflow copies this file over SupabaseCloudConfig.ts only while
// creating its internal installer. Production is intentionally not referenced.
export const STUDENT_TEST_MODE=false;
export const STUDENT_RECEIPTS_ENABLED=false;
export const STUDENT_RELEASE_CHANNEL="staging" as const;
export const REMINDER_AUTO_DISPATCH_ENABLED=false;
export const SUPABASE_URL="https://ymcmmvnfrfntmllytpyu.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_KnDNrw0ZkLpfPperkEL68Q_Fduyi87t";
export const PASSWORD_RECOVERY_ENABLED=true;

export function validateSupabaseConfig():void{
 if(STUDENT_TEST_MODE)throw new Error("STAGING_CLOUD_MODE_REQUIRED");
 if(STUDENT_RECEIPTS_ENABLED)throw new Error("STAGING_RECEIPTS_MUST_BE_DISABLED");
 if(STUDENT_RELEASE_CHANNEL!=="staging")throw new Error("STAGING_CHANNEL_REQUIRED");
 if(REMINDER_AUTO_DISPATCH_ENABLED)throw new Error("REMINDER_AUTO_DISPATCH_MUST_BE_DISABLED");
 if(!SUPABASE_URL.startsWith("https://")||!SUPABASE_URL.endsWith(".supabase.co"))throw new Error("SUPABASE_URL_INVALID");
 if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
}
