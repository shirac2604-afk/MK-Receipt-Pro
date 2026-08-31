import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
const dashboard=read("src/screens/DashboardScreen.tsx");
const students=read("src/screens/StudentCloudScreen.tsx");
const checks=[
 [dashboard.includes('go("תלמידים",{section:"schedule"})')&&dashboard.includes('יומן שיעורים'),"dashboard opens the shared lesson calendar directly"],
 [dashboard.includes('go("תלמידים",{section:"payments"})')&&dashboard.includes('גבייה'),"dashboard opens open-payment follow-up directly"],
 [dashboard.includes('navigation.navigate("דוחות")')&&dashboard.includes('ניהול תלמידים'),"daily student work and reports are accessible from home"],
 [students.includes('useRoute')&&students.includes('route.params?.section'),"student center accepts a focused section from quick actions"]
];
let failed=false;for(const [ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}if(failed)process.exit(1);
