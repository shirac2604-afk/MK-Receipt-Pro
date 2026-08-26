// Student module PRODUCTION build configuration.
// The production Windows workflow copies this file over SupabaseCloudConfig.ts
// only for its isolated build artifact. Do not change the test default above.
export const STUDENT_TEST_MODE=false;
// Student management must not issue receipts. The existing receipt engine stays separate.
export const STUDENT_RECEIPTS_ENABLED=false;
export const STUDENT_RELEASE_CHANNEL="production" as const;
// A reminder can only be sent after a deliberate manual dispatch from the app.
export const REMINDER_AUTO_DISPATCH_ENABLED=false;
export const SUPABASE_URL="https://noimclnzzuxcszdotmby.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_teF0oR3uCfoq5RUOx1zf-g_6z96RgQO";
export const PASSWORD_RECOVERY_ENABLED=false;

export function validateSupabaseConfig():void{
 if(STUDENT_TEST_MODE)throw new Error("STUDENT_PRODUCTION_MODE_REQUIRED");
 if(STUDENT_RECEIPTS_ENABLED)throw new Error("STUDENT_PRODUCTION_RECEIPTS_MUST_BE_DISABLED");
 if(STUDENT_RELEASE_CHANNEL!=="production")throw new Error("STUDENT_PRODUCTION_CHANNEL_REQUIRED");
 if(REMINDER_AUTO_DISPATCH_ENABLED)throw new Error("REMINDER_AUTO_DISPATCH_MUST_BE_DISABLED");
 if(!SUPABASE_URL.startsWith("https://")||!SUPABASE_URL.endsWith(".supabase.co"))throw new Error("SUPABASE_URL_INVALID");
 if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
}
