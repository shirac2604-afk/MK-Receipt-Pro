import fs from "node:fs";

const config=fs.readFileSync(process.env.STAGING_CONFIG??"apps/desktop/electron/main/SupabaseCloudConfig.ts","utf8");
const checks=[
  [config.includes("STUDENT_TEST_MODE=false"),"Staging cloud mode selected"],
  [config.includes("STUDENT_RECEIPTS_ENABLED=false"),"receipt isolation remains enabled"],
  [config.includes('STUDENT_RELEASE_CHANNEL="staging"'),"Staging release channel selected"],
  [config.includes("REMINDER_AUTO_DISPATCH_ENABLED=false"),"automatic reminder delivery remains disabled"],
  [config.includes("ymcmmvnfrfntmllytpyu.supabase.co"),"approved Staging project selected"],
  [!config.includes("noimclnzzuxcszdotmby.supabase.co"),"Production project excluded"]
];
const failed=checks.filter(([ok])=>!ok);
for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
console.log(`Windows Staging release contract: ${checks.length-failed.length}/${checks.length}`);
if(failed.length)process.exit(1);
