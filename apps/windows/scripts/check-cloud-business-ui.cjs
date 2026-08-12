const fs=require('fs');
const ui=fs.readFileSync('apps/desktop/renderer/src/main.tsx','utf8');
const css=fs.readFileSync('apps/desktop/renderer/src/styles.css','utf8');
const svc=fs.readFileSync('apps/desktop/electron/main/SupabaseCloudService.ts','utf8');
const tests=[
 ['settings view type',ui.includes('"settings"')],
 ['business profile navigation',ui.includes('⚙ פרטי העסק')],
 ['business profile screen',ui.includes('function SettingsScreen')],
 ['business save action',ui.includes('window.mkApi.settings.completeSetup(form)')],
 ['cloud business loader',svc.includes('getBusinessSettings(')],
 ['cloud business saver',svc.includes('saveBusinessSettings(')],
 ['cloud logo storage',svc.includes('business-assets')],
 ['short display sidebar scroll',css.includes('.sidebar nav{overflow-y:auto;min-height:0;}')]
];
let pass=0; for(const [name,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++;}
console.log(`Cloud business profile UI: ${pass}/${tests.length}`); process.exit(pass===tests.length?0:1);
