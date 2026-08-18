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
 "preload reminder history import",
 'import type { ApiResult } from "../../../../packages/shared/src/api";',
 'import type { ApiResult } from "../../../../packages/shared/src/api";\nimport type { LessonReminderHistoryItem } from "../../../../packages/database/src/reminderHistoryTypes";'
);
patch(
 "apps/windows/apps/desktop/electron/preload/preload.ts",
 "preload reminder history api",
 ' reminders:Object.freeze({getStatus:():Promise<ApiResult<ReminderDispatchStatus>>=>invoke("reminders:get-status"),dispatchNow:(limit=20):Promise<ApiResult<ReminderDispatchSummary>>=>invoke("reminders:dispatch-now",{limit})}),',
 ' reminders:Object.freeze({getStatus:():Promise<ApiResult<ReminderDispatchStatus>>=>invoke("reminders:get-status"),dispatchNow:(limit=20):Promise<ApiResult<ReminderDispatchSummary>>=>invoke("reminders:dispatch-now",{limit}),listRecent:(limit=50):Promise<ApiResult<LessonReminderHistoryItem[]>>=>invoke("reminders:list-recent",{limit}),retryFailed:(reminderId:string):Promise<ApiResult<void>>=>invoke("reminders:retry-failed",{reminderId})}),'
);

patch(
 "apps/windows/apps/desktop/renderer/src/global.d.ts",
 "global reminder history import",
 'import type { ApiResult } from "../../../../packages/shared/src/api";',
 'import type { ApiResult } from "../../../../packages/shared/src/api";\nimport type { LessonReminderHistoryItem } from "../../../../packages/database/src/reminderHistoryTypes";'
);
patch(
 "apps/windows/apps/desktop/renderer/src/global.d.ts",
 "global reminder history api",
 '  reminders:{getStatus():Promise<ApiResult<ReminderDispatchStatus>>;dispatchNow(limit?:number):Promise<ApiResult<ReminderDispatchSummary>>};',
 '  reminders:{getStatus():Promise<ApiResult<ReminderDispatchStatus>>;dispatchNow(limit?:number):Promise<ApiResult<ReminderDispatchSummary>>;listRecent(limit?:number):Promise<ApiResult<LessonReminderHistoryItem[]>>;retryFailed(reminderId:string):Promise<ApiResult<void>>};'
);

patch(
 "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
 "lesson history import",
 'import type {PaymentMethod} from "../../../../../packages/database/src/types";',
 'import type {PaymentMethod} from "../../../../../packages/database/src/types";\nimport type {LessonReminderHistoryItem} from "../../../../../packages/database/src/reminderHistoryTypes";'
);
patch(
 "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
 "lesson history state",
 '[notesItem,setNotesItem]=useState<LessonCalendarItem|null>(null),[lessonSummary,setLessonSummary]=useState(""),[homework,setHomework]=useState(""),[savingNotes,setSavingNotes]=useState(false);',
 '[notesItem,setNotesItem]=useState<LessonCalendarItem|null>(null),[lessonSummary,setLessonSummary]=useState(""),[homework,setHomework]=useState(""),[savingNotes,setSavingNotes]=useState(false),[reminderHistory,setReminderHistory]=useState<LessonReminderHistoryItem[]|null>(null),[loadingHistory,setLoadingHistory]=useState(false),[retryingReminder,setRetryingReminder]=useState<string|null>(null);'
);
patch(
 "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
 "lesson history functions",
 ' async function saveNotes(){if(!notesItem)return;if(lessonSummary.length>8000||homework.length>4000){setError("סיכום השיעור או המשימה ארוכים מדי.");return}setSavingNotes(true);setError("");try{unwrap(await window.mkApi.lessons.saveNotes(notesItem.lesson.id,lessonSummary,homework));setNotice("סיכום השיעור והמשימה נשמרו.");setNotesItem(null);await load()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לשמור את סיכום השיעור.")}finally{setSavingNotes(false)}}',
 ' async function saveNotes(){if(!notesItem)return;if(lessonSummary.length>8000||homework.length>4000){setError("סיכום השיעור או המשימה ארוכים מדי.");return}setSavingNotes(true);setError("");try{unwrap(await window.mkApi.lessons.saveNotes(notesItem.lesson.id,lessonSummary,homework));setNotice("סיכום השיעור והמשימה נשמרו.");setNotesItem(null);await load()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לשמור את סיכום השיעור.")}finally{setSavingNotes(false)}}\n async function openReminderHistory(){setLoadingHistory(true);setError("");try{setReminderHistory(unwrap(await window.mkApi.reminders.listRecent(50)))}catch(e){setError(e instanceof Error?e.message:"לא ניתן לטעון היסטוריית תזכורות.")}finally{setLoadingHistory(false)}}\n async function retryReminder(id:string){setRetryingReminder(id);setError("");try{unwrap(await window.mkApi.reminders.retryFailed(id));setNotice("התזכורת הוחזרה לתור לשליחה חוזרת.");setReminderHistory(unwrap(await window.mkApi.reminders.listRecent(50)))}catch(e){setError(e instanceof Error?e.message:"לא ניתן לנסות שוב את התזכורת.")}finally{setRetryingReminder(null)}}'
);
patch(
 "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
 "lesson history button",
 '<div><strong>{reminderStatus.configured?"תזכורות אוטומטיות פעילות":"תזכורות מוכנות — ספק WhatsApp טרם הופעל"}</strong><span>{reminderStatus.configured?`Provider: ${reminderStatus.providerId}`:"המפגשים והתזכורות נשמרים ביומן, אך לא נשלחת הודעה חיצונית עד להגדרת ספק מאובטח."}</span></div>{reminderStatus.configured&&<button className="secondary-button" disabled={dispatching||reminderStatus.running} onClick={()=>void dispatchReminders()}>{dispatching?"בודק…":"בדוק תזכורות עכשיו"}</button>}',
 '<div><strong>{reminderStatus.configured?"תזכורות אוטומטיות פעילות":"תזכורות מוכנות — ספק WhatsApp טרם הופעל"}</strong><span>{reminderStatus.configured?`Provider: ${reminderStatus.providerId}`:"המפגשים והתזכורות נשמרים ביומן, אך לא נשלחת הודעה חיצונית עד להגדרת ספק מאובטח."}</span></div><div className="reminder-status-actions"><button className="secondary-button" disabled={loadingHistory} onClick={()=>void openReminderHistory()}>{loadingHistory?"טוען…":"היסטוריית תזכורות"}</button>{reminderStatus.configured&&<button className="secondary-button" disabled={dispatching||reminderStatus.running} onClick={()=>void dispatchReminders()}>{dispatching?"בודק…":"בדוק תזכורות עכשיו"}</button>}</div>'
);
patch(
 "apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx",
 "lesson history dialog",
 ' {notesItem&&<div className="dialog-backdrop"',
 ' {reminderHistory&&<div className="dialog-backdrop" onClick={()=>setReminderHistory(null)}><section className="details-dialog reminder-history-dialog" onClick={e=>e.stopPropagation()}><button className="dialog-close" onClick={()=>setReminderHistory(null)}>×</button><p className="eyebrow">אוטומציות</p><h2>היסטוריית תזכורות</h2>{reminderHistory.length===0?<p className="lesson-day-empty">עדיין אין תזכורות.</p>:<div className="reminder-history-list">{reminderHistory.map(r=><article key={r.id} className={`reminder-history-row status-${r.status}`}><div><strong>{r.studentName||"תלמיד"} · {r.audience==="guardian"?"הורה":"תלמיד"}</strong><span>{r.lessonTitle} · {new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"short"}).format(new Date(r.scheduledFor))}</span><small>{r.channel} · ניסיון {r.attemptCount}{r.lastError?` · ${r.lastError}`:""}</small></div><div className="reminder-history-state"><b>{r.status==="sent"?"נשלחה":r.status==="failed"?"נכשלה":r.status==="pending"?"ממתינה":r.status==="sending"?"נשלחת":"בוטלה"}</b>{r.status==="failed"&&<button className="secondary-button" disabled={retryingReminder===r.id} onClick={()=>void retryReminder(r.id)}>{retryingReminder===r.id?"מחזיר…":"נסה שוב"}</button>}</div></article>)}</div>}</section></div>}\n {notesItem&&<div className="dialog-backdrop"'
);
console.log("Reminder history UI patch applied successfully.");
