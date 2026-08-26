// Student module TEST build configuration.
// This branch is intentionally isolated from Production while student workflows are tested.
export const STUDENT_TEST_MODE=true;
export const STUDENT_RECEIPTS_ENABLED=false;
export const STUDENT_RELEASE_CHANNEL="test" as const;
// Tests must never dispatch messages automatically.
export const REMINDER_AUTO_DISPATCH_ENABLED=false;
export const SUPABASE_URL="https://ymcmmvnfrfntmllytpyu.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY="sb_publishable_KnDNrw0ZkLpfPperkEL68Q_Fduyi87t";
export const PASSWORD_RECOVERY_ENABLED=false;

export function validateSupabaseConfig():void{
 if(!STUDENT_TEST_MODE)throw new Error("STUDENT_TEST_MODE_REQUIRED_ON_TEST_BRANCH");
 if(STUDENT_RECEIPTS_ENABLED)throw new Error("STUDENT_TEST_RECEIPTS_MUST_BE_DISABLED");
 if(STUDENT_RELEASE_CHANNEL!=="test")throw new Error("STUDENT_TEST_CHANNEL_REQUIRED");
 if(REMINDER_AUTO_DISPATCH_ENABLED)throw new Error("REMINDER_AUTO_DISPATCH_MUST_BE_DISABLED");
 if(!SUPABASE_URL.startsWith("https://")||!SUPABASE_URL.endsWith(".supabase.co"))throw new Error("SUPABASE_URL_INVALID");
 if(!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID");
}
