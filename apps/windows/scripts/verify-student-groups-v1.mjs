import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const groups=read('apps/desktop/renderer/src/students/GroupsScreen.tsx');
const payments=read('apps/desktop/renderer/src/students/OpenPaymentsScreen.tsx');
const preload=read('apps/desktop/electron/preload/preload.ts');
const handlers=read('apps/desktop/electron/ipc/groupHandlers.ts');
const service=read('apps/desktop/electron/main/GroupLessonCloudService.ts');
const main=read('apps/desktop/renderer/src/main.tsx');

const checks=[
 ['groups screen exists',groups.includes('export function GroupsScreen')],
 ['create group action',groups.includes('קבוצה חדשה')||groups.includes('יצירת קבוצה')],
 ['member selection',groups.includes('studentIds')&&groups.includes('students.map')],
 ['recurring group lesson action',groups.includes('createSeries')&&groups.includes('שיעור קבוע')],
 ['per participant attended action',groups.includes('"attended"')&&groups.includes('הגיע')],
 ['per participant absent action',groups.includes('"absent"')&&groups.includes('לא הגיע')],
 ['per participant payment action',groups.includes('"paid"')&&groups.includes('שולם')],
 ['automatic receipt result surfaced',groups.includes('receiptNumber')||groups.includes('קבלה')],
 ['group API exposed in preload',preload.includes('groups:Object.freeze')&&preload.includes('groups:create-series')],
 ['group IPC registered',handlers.includes('groups:list')&&handlers.includes('groups:save')&&handlers.includes('groups:create-series')],
 ['group service creates lesson participants',service.includes('lesson_participants')&&(service.includes('kind:"group"')||service.includes("kind:'group'"))],
 ['group service creates reminders',service.includes('lesson_reminders')],
 ['open payments includes group calendar',payments.includes('window.mkApi.groups.listCalendar')],
 ['open payments labels group rows',payments.includes('קבוצתי')],
 ['sidebar groups route',main.includes('onView("groups")')&&main.includes('<GroupsScreen/>')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`Group lesson UI contract: ${checks.length-failed}/${checks.length}`);
if(failed)process.exit(1);
