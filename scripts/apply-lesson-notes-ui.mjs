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
  "preload save notes api",
  ' lessons:Object.freeze({listSeries:():Promise<ApiResult<LessonSeriesRecord[]>>=>invoke("lessons:list-series"),createSeries:(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>=>invoke("lessons:create-series",input),listCalendar:(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>=>invoke("lessons:list-calendar",{fromIso,toIso}),updateParticipant:(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>=>invoke("lessons:update-participant",{participantId,attendanceStatus,paymentStatus,paymentMethod,amountAgorot})}),',
  ' lessons:Object.freeze({listSeries:():Promise<ApiResult<LessonSeriesRecord[]>>=>invoke("lessons:list-series"),createSeries:(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>=>invoke("lessons:create-series",input),listCalendar:(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>=>invoke("lessons:list-calendar",{fromIso,toIso}),saveNotes:(lessonId:string,lessonSummary:string,homework:string):Promise<ApiResult<import("../../../../packages/database/src/studentTypes").LessonRecord>>=>invoke("lessons:save-notes",{lessonId,lessonSummary,homework}),updateParticipant:(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>=>invoke("lessons:update-participant",{participantId,attendanceStatus,paymentStatus,paymentMethod,amountAgorot})}),'
);

patch(
  "apps/windows/apps/desktop/renderer/src/global.d.ts",
  "global lesson record import",
  'import type { StudentSaveInput, StudentWithGuardian, LessonSeriesRecord, LessonSeriesSaveInput, LessonCalendarItem, AttendanceStatus, LessonPaymentStatus } from "../../../../packages/database/src/studentTypes";',
  'import type { StudentSaveInput, StudentWithGuardian, LessonSeriesRecord, LessonSeriesSaveInput, LessonCalendarItem, LessonRecord, AttendanceStatus, LessonPaymentStatus } from "../../../../packages/database/src/studentTypes";'
);
patch(
  "apps/windows/apps/desktop/renderer/src/global.d.ts",
  "global save notes api",
  '  lessons:{listSeries():Promise<ApiResult<LessonSeriesRecord[]>>;createSeries(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>;listCalendar(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>;updateParticipant(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>};',
  '  lessons:{listSeries():Promise<ApiResult<LessonSeriesRecord[]>>;createSeries(input:LessonSeriesSaveInput):Promise<ApiResult<LessonSeriesRecord>>;listCalendar(fromIso:string,toIso:string):Promise<ApiResult<LessonCalendarItem[]>>;saveNotes(lessonId:string,lessonSummary:string,homework:string):Promise<ApiResult<LessonRecord>>;updateParticipant(participantId:string,attendanceStatus:AttendanceStatus,paymentStatus:LessonPaymentStatus,paymentMethod:string|null,amountAgorot:number):Promise<ApiResult<LessonParticipantUpdateResult>>};'
);

patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson notes state",
  ' const[week,setWeek]=useState(()=>startOfWeek(new Date())),[items,setItems]=useState<LessonCalendarItem[]>([]),[students,setStudents]=useState<StudentWithGuardian[]>([]),[loading,setLoading]=useState(true),[editingSeries,setEditingSeries]=useState<SeriesDraft|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[reminderStatus,setReminderStatus]=useState<{providerId:string;configured:boolean;running:boolean}|null>(null),[dispatching,setDispatching]=useState(false);',
  ' const[week,setWeek]=useState(()=>startOfWeek(new Date())),[items,setItems]=useState<LessonCalendarItem[]>([]),[students,setStudents]=useState<StudentWithGuardian[]>([]),[loading,setLoading]=useState(true),[editingSeries,setEditingSeries]=useState<SeriesDraft|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[reminderStatus,setReminderStatus]=useState<{providerId:string;configured:boolean;running:boolean}|null>(null),[dispatching,setDispatching]=useState(false),[notesItem,setNotesItem]=useState<LessonCalendarItem|null>(null),[lessonSummary,setLessonSummary]=useState(""),[homework,setHomework]=useState(""),[savingNotes,setSavingNotes]=useState(false);'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson notes functions",
  ' async function dispatchReminders(){setDispatching(true);setError("");try{const result=unwrap(await window.mkApi.reminders.dispatchNow(20));setNotice(`בדיקת תזכורות הסתיימה: ${result.sent} נשלחו, ${result.failed} נכשלו, ${result.skipped} דולגו.`);const status=unwrap(await window.mkApi.reminders.getStatus());setReminderStatus(status)}catch(e){setError(e instanceof Error?e.message:"לא ניתן לבדוק תזכורות כעת.")}finally{setDispatching(false)}}',
  ' async function dispatchReminders(){setDispatching(true);setError("");try{const result=unwrap(await window.mkApi.reminders.dispatchNow(20));setNotice(`בדיקת תזכורות הסתיימה: ${result.sent} נשלחו, ${result.failed} נכשלו, ${result.skipped} דולגו.`);const status=unwrap(await window.mkApi.reminders.getStatus());setReminderStatus(status)}catch(e){setError(e instanceof Error?e.message:"לא ניתן לבדוק תזכורות כעת.")}finally{setDispatching(false)}}\n function openNotes(item:LessonCalendarItem){setNotesItem(item);setLessonSummary(item.lesson.lessonSummary??"");setHomework(item.lesson.homework??"");setError("");}\n async function saveNotes(){if(!notesItem)return;if(lessonSummary.length>8000||homework.length>4000){setError("סיכום השיעור או המשימה ארוכים מדי.");return}setSavingNotes(true);setError("");try{unwrap(await window.mkApi.lessons.saveNotes(notesItem.lesson.id,lessonSummary,homework));setNotice("סיכום השיעור והמשימה נשמרו.");setNotesItem(null);await load()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לשמור את סיכום השיעור.")}finally{setSavingNotes(false)}}'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson notes card button",
  '<div className="lesson-actions"><button onClick={()=>void update(item,"attended",item.participant.paymentStatus)}>הגיע</button><button onClick={()=>void update(item,"absent",item.participant.paymentStatus)}>לא הגיע</button></div>',
  '<div className="lesson-actions"><button onClick={()=>void update(item,"attended",item.participant.paymentStatus)}>הגיע</button><button onClick={()=>void update(item,"absent",item.participant.paymentStatus)}>לא הגיע</button><button className="notes-button" onClick={()=>openNotes(item)}>{item.lesson.lessonSummary||item.lesson.homework?"עריכת סיכום":"סיכום ומשימה"}</button></div>{(item.lesson.lessonSummary||item.lesson.homework)&&<div className="lesson-notes-preview">{item.lesson.lessonSummary&&<span><b>סיכום:</b> {item.lesson.lessonSummary}</span>}{item.lesson.homework&&<span><b>להמשך:</b> {item.lesson.homework}</span>}</div>}'
);
patch(
  "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
  "lesson notes dialog",
  ' {editingSeries&&<div className="dialog-backdrop"',
  ' {notesItem&&<div className="dialog-backdrop" onClick={()=>!savingNotes&&setNotesItem(null)}><section className="details-dialog lesson-notes-dialog" onClick={e=>e.stopPropagation()}><button className="dialog-close" disabled={savingNotes} onClick={()=>setNotesItem(null)}>×</button><p className="eyebrow">מעקב פדגוגי</p><h2>{notesItem.student.displayName} — {notesItem.lesson.title}</h2><label className="field"><span>מה עשינו בשיעור?</span><textarea rows={6} maxLength={8000} value={lessonSummary} onChange={e=>setLessonSummary(e.target.value)} placeholder="נושאים, מיומנויות, הצלחות, קושי שעלה…"/><small>{lessonSummary.length}/8000</small></label><label className="field"><span>משימה / מה ממשיכים בפעם הבאה?</span><textarea rows={4} maxLength={4000} value={homework} onChange={e=>setHomework(e.target.value)} placeholder="שיעורי בית, תרגול או נקודת המשך לשיעור הבא…"/><small>{homework.length}/4000</small></label><div className="dialog-actions"><button className="secondary-button" disabled={savingNotes} onClick={()=>setNotesItem(null)}>ביטול</button><button className="primary-button" disabled={savingNotes} onClick={()=>void saveNotes()}>{savingNotes?"שומר…":"שמירת סיכום"}</button></div></section></div>}\n {editingSeries&&<div className="dialog-backdrop"'
);

console.log("Lesson notes UI patch applied successfully.");
