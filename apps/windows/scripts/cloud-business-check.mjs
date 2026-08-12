import fs from 'node:fs';
const service=fs.readFileSync('apps/desktop/electron/main/SupabaseCloudService.ts','utf8');
const ipc=fs.readFileSync('apps/desktop/electron/ipc/databaseHandlers.ts','utf8');
const sql=fs.readFileSync('supabase/005_business_profile_sync.sql','utf8');
const checks=[
 ['cloud business reader',service.includes('getBusinessSettings(local:BusinessSettingsRecord|null)')],
 ['cloud business writer',service.includes('saveBusinessSettings(input:BusinessSettingsInput)')],
 ['business fields persisted',service.includes('business_number:input.businessNumber')&&service.includes('owner_name:input.ownerName')],
 ['logo uploaded',service.includes('storage.from("business-assets").upload')],
 ['logo downloaded',service.includes('storage.from("business-assets").download')],
 ['settings read from cloud',ipc.includes('supabaseCloud.getBusinessSettings(databaseService.getBusinessSettings())')],
 ['settings write to cloud',ipc.includes('await supabaseCloud.saveBusinessSettings(parsed)')],
 ['schema migration included',sql.includes('logo_storage_key')&&sql.includes("'business-assets'")]
];
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
console.log(`Cloud business profile: ${checks.filter(x=>x[1]).length}/${checks.length}`);
if(checks.some(x=>!x[1])) process.exit(1);
