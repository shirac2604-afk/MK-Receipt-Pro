import AsyncStorage from "@react-native-async-storage/async-storage";
import type {MobileLesson,MobileStudent} from "./StudentLocalStore";

const KEY="@mk-receipt-pro/student-reminders-test-v1";
export type ReminderAudience="student"|"guardian"|"both";
export type ReminderStatus="scheduled"|"ready"|"test_sent"|"failed";
export type ReminderConfig={enabled:boolean;audience:ReminderAudience;leadMinutes:60|180|1440};
export type ReminderEntry={id:string;dedupeKey:string;lessonId:string;studentId:string;recipient:"student"|"guardian";recipientName:string;phone:string;scheduledFor:string;lessonStartsAt:string;message:string;status:ReminderStatus;attemptCount:number;lastError:string|null;updatedAt:string};
type State={version:1;config:ReminderConfig;entries:ReminderEntry[]};
const defaults=():State=>({version:1,config:{enabled:false,audience:"guardian",leadMinutes:1440},entries:[]});
const now=()=>new Date().toISOString();
const id=()=>`reminder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
async function read():Promise<State>{try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return defaults();const x=JSON.parse(raw);if(x?.version===1&&x.config&&Array.isArray(x.entries))return x as State;}catch{}return defaults();}
async function write(state:State){await AsyncStorage.setItem(KEY,JSON.stringify(state));}
function fmtDate(iso:string){return new Intl.DateTimeFormat("he-IL",{weekday:"long",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));}
function message(studentName:string,startsAt:string){return `שלום, תזכורת לשיעור של ${studentName} ביום ${fmtDate(startsAt)}. אם יש שינוי, נשמח לעדכון מראש.`;}
function recipients(student:MobileStudent,audience:ReminderAudience){const out:{kind:"student"|"guardian";name:string;phone:string}[]=[];if(audience!=="guardian"&&student.phone.trim())out.push({kind:"student",name:student.displayName,phone:student.phone.trim()});if(audience!=="student"&&student.guardianPhone.trim())out.push({kind:"guardian",name:student.guardianName.trim()||`הורה של ${student.displayName}`,phone:student.guardianPhone.trim()});return out;}

export const ReminderLocalStore={
 async getConfig(){return (await read()).config;},
 async saveConfig(config:ReminderConfig){const state=await read();state.config=config;await write(state);return config;},
 async syncPlan(lessons:MobileLesson[],students:MobileStudent[]){const state=await read(),studentMap=new Map(students.map(x=>[x.id,x])),existing=new Map(state.entries.map(x=>[x.dedupeKey,x]));if(!state.config.enabled){return state.entries.sort((a,b)=>b.scheduledFor.localeCompare(a.scheduledFor));}
  for(const lesson of lessons){if(lesson.cancelled)continue;for(const participant of lesson.participants){const student=studentMap.get(participant.studentId);if(!student)continue;for(const recipient of recipients(student,state.config.audience)){const scheduledFor=new Date(new Date(lesson.startsAt).getTime()-state.config.leadMinutes*60000).toISOString();const dedupeKey=`${lesson.id}:${student.id}:${recipient.kind}:${state.config.leadMinutes}`;if(existing.has(dedupeKey))continue;const entry:ReminderEntry={id:id(),dedupeKey,lessonId:lesson.id,studentId:student.id,recipient:recipient.kind,recipientName:recipient.name,phone:recipient.phone,scheduledFor,lessonStartsAt:lesson.startsAt,message:message(student.displayName,lesson.startsAt),status:new Date(scheduledFor).getTime()<=Date.now()?"ready":"scheduled",attemptCount:0,lastError:null,updatedAt:now()};state.entries.push(entry);existing.set(dedupeKey,entry);}}
  }
  await write(state);return state.entries.sort((a,b)=>b.scheduledFor.localeCompare(a.scheduledFor));
 },
 async list(){const state=await read();let changed=false;for(const entry of state.entries){if(entry.status==="scheduled"&&new Date(entry.scheduledFor).getTime()<=Date.now()){entry.status="ready";entry.updatedAt=now();changed=true;}}if(changed)await write(state);return state.entries.sort((a,b)=>b.scheduledFor.localeCompare(a.scheduledFor));},
 async simulateSend(entryId:string){const state=await read(),entry=state.entries.find(x=>x.id===entryId);if(!entry)throw new Error("התזכורת לא נמצאה.");entry.attemptCount++;entry.status="test_sent";entry.lastError=null;entry.updatedAt=now();await write(state);return entry;},
 async simulateFailure(entryId:string){const state=await read(),entry=state.entries.find(x=>x.id===entryId);if(!entry)throw new Error("התזכורת לא נמצאה.");entry.attemptCount++;entry.status="failed";entry.lastError="כשל בדיקה מדומה — לא בוצעה שליחה חיצונית.";entry.updatedAt=now();await write(state);return entry;},
 async retry(entryId:string){const state=await read(),entry=state.entries.find(x=>x.id===entryId);if(!entry)throw new Error("התזכורת לא נמצאה.");if(entry.status!=="failed")throw new Error("ניתן לנסות מחדש רק תזכורת שנכשלה.");entry.status=new Date(entry.scheduledFor).getTime()<=Date.now()?"ready":"scheduled";entry.lastError=null;entry.updatedAt=now();await write(state);return entry;},
 async reset(){await AsyncStorage.removeItem(KEY);}
};
