import fs from "node:fs";

function patch(path,label,needle,replacement){
  let source=fs.readFileSync(path,"utf8");
  const count=source.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one match in ${path}, found ${count}`);
  source=source.replace(needle,replacement);
  fs.writeFileSync(path,source,"utf8");
}

patch(
  "apps/windows/apps/desktop/electron/preload/preload.ts",
  "preload reminder types",
  'export interface LessonParticipantUpdateResult {participant:LessonParticipantRecord;receipt:null|{id:string;receiptNumber:number;pdfCreated:boolean;pdfPath:string|null;warningCode:string|null};}',
  'export interface LessonParticipantUpdateResult {participant:LessonParticipantRecord;receipt:null|{id:string;receiptNumber:number;pdfCreated:boolean;pdfPath:string|null;warningCode:string|null};}\nexport interface ReminderDispatchStatus {providerId:string;configured:boolean;running:boolean;}\nexport interface ReminderDispatchSummary {providerId:string;configured:boolean;claimed:number;sent:number;failed:number;skipped:number;}'
);
patch(
  "apps/windows/apps/desktop/electron/preload/preload.ts",
  "preload reminders api",
  ' lessons:Object.freeze({listSeries:():Promise<ApiResult<LessonSeriesRecord[]>>=>invoke("lessons:list-series"),createSeries:(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>=>invoke("lessons:create-series",input),listCalendar:(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>=>invoke("lessons:list-calendar",{fromIso,toIso}),updateParticipant:(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>=>invoke("lessons:update-participant",{participantId,attendanceStatus,paymentStatus,paymentMethod,amountAgorot})}),\n templates:',
  ' lessons:Object.freeze({listSeries:():Promise<ApiResult<LessonSeriesRecord[]>>=>invoke("lessons:list-series"),createSeries:(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>=>invoke("lessons:create-series",input),listCalendar:(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>=>invoke("lessons:list-calendar",{fromIso,toIso}),updateParticipant:(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>=>invoke("lessons:update-participant",{participantId,attendanceStatus,paymentStatus,paymentMethod,amountAgorot})}),\n reminders:Object.freeze({getStatus:():Promise<ApiResult<ReminderDispatchStatus>>=>invoke("reminders:get-status"),dispatchNow:(limit=20):Promise<ApiResult<ReminderDispatchSummary>>=>invoke("reminders:dispatch-now",{limit})}),\n templates:'
);

patch(
  "apps/windows/apps/desktop/renderer/src/global.d.ts",
  "global reminder imports",
  'import type { AppInfo, AboutInfo, LessonParticipantUpdateResult } from "../../electron/preload/preload";',
  'import type { AppInfo, AboutInfo, LessonParticipantUpdateResult, ReminderDispatchStatus, ReminderDispatchSummary } from "../../electron/preload/preload";'
);
patch(
  "apps/windows/apps/desktop/renderer/src/global.d.ts",
  "global reminders api",
  '  lessons:{listSeries():Promise<ApiResult<LessonSeriesRecord[]>>;createSeries(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>;listCalendar(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>;updateParticipant(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>};\n  templates:',
  '  lessons:{listSeries():Promise<ApiResult<LessonSeriesRecord[]>>;createSeries(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>;listCalendar(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>;updateParticipant(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>};\n  reminders:{getStatus():Promise<ApiResult<ReminderDispatchStatus>>;dispatchNow(limit?:number):Promise<ApiResult<ReminderDispatchSummary>>};\n  templates:'
);

patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson reminder state",
  ' const[week,setWeek]=useState(()=>startOfWeek(new Date())),[items,setItems]=useState<LessonCalendarItem[]>([]),[students,setStudents]=useState<StudentWithGuardian[]>([]),[loading,setLoading]=useState(true),[editingSeries,setEditingSeries]=useState<SeriesDraft|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");',
  ' const[week,setWeek]=useState(()=>startOfWeek(new Date())),[items,setItems]=useState<LessonCalendarItem[]>([]),[students,setStudents]=useState<StudentWithGuardian[]>([]),[loading,setLoading]=useState(true),[editingSeries,setEditingSeries]=useState<SeriesDraft|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[reminderStatus,setReminderStatus]=useState<{providerId:string;configured:boolean;running:boolean}|null>(null),[dispatching,setDispatching]=useState(false);'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson reminder load",
  ' useEffect(()=>{void load()},[load]);',
  ' useEffect(()=>{void load()},[load]);\n useEffect(()=>{void window.mkApi.reminders.getStatus().then(result=>{if(result.success)setReminderStatus(result.data)}).catch(()=>{})},[]);'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson reminder dispatch function",
  ' async function update(item:LessonCalendarItem,attendance:AttendanceStatus,payment:LessonPaymentStatus,method:string|null=item.participant.paymentMethod){setNotice("");try{const result=unwrap(await window.mkApi.lessons.updateParticipant(item.participant.id,attendance,payment,method,item.participant.amountAgorot));if(result.receipt){setNotice(result.receipt.pdfCreated?`קבלה ${result.receipt.receiptNumber} הופקה אוטומטית ונשמרה.`:`קבלה ${result.receipt.receiptNumber} הופקה אוטומטית. קובץ ה-PDF דורש בדיקה.`)}await load()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לעדכן את המפגש.")}}',
  ' async function update(item:LessonCalendarItem,attendance:AttendanceStatus,payment:LessonPaymentStatus,method:string|null=item.participant.paymentMethod){setNotice("");try{const result=unwrap(await window.mkApi.lessons.updateParticipant(item.participant.id,attendance,payment,method,item.participant.amountAgorot));if(result.receipt){setNotice(result.receipt.pdfCreated?`קבלה ${result.receipt.receiptNumber} הופקה אוטומטית ונשמרה.`:`קבלה ${result.receipt.receiptNumber} הופקה אוטומטית. קובץ ה-PDF דורש בדיקה.`)}await load()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לעדכן את המפגש.")}}\n async function dispatchReminders(){setDispatching(true);setError("");try{const result=unwrap(await window.mkApi.reminders.dispatchNow(20));setNotice(`בדיקת תזכורות הסתיימה: ${result.sent} נשלחו, ${result.failed} נכשלו, ${result.skipped} דולגו.`);const status=unwrap(await window.mkApi.reminders.getStatus());setReminderStatus(status)}catch(e){setError(e instanceof Error?e.message:"לא ניתן לבדוק תזכורות כעת.")}finally{setDispatching(false)}}'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson reminder banner",
  ' <section className="lesson-week-toolbar">',
  ' {reminderStatus&&<section className={`lesson-reminder-status ${reminderStatus.configured?"configured":"not-configured"}`}><div><strong>{reminderStatus.configured?"תזכורות אוטומטיות פעילות":"תזכורות מוכנות — ספק WhatsApp טרם הופעל"}</strong><span>{reminderStatus.configured?`Provider: ${reminderStatus.providerId}`:"המפגשים והתזכורות נשמרים ביומן, אך לא נשלחת הודעה חיצונית עד להגדרת ספק מאובטח."}</span></div>{reminderStatus.configured&&<button className="secondary-button" disabled={dispatching||reminderStatus.running} onClick={()=>void dispatchReminders()}>{dispatching?"בודק…":"בדוק תזכורות עכשיו"}</button>}</section>}\n <section className="lesson-week-toolbar">'
);

console.log("Reminder status UI patch applied successfully.");
