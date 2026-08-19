import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import type {MobileLesson} from "./StudentLocalStore";

const CONFIG_KEY="@mk-receipt-pro/student-calendar-sync-v1";
const TIME_ZONE="Asia/Jerusalem";

type SyncConfig={calendarId:string|null;eventIds:Record<string,string>;lastSyncAt:string|null};
export type CalendarChoice={id:string;title:string;sourceName:string;sourceType:string;isPrimary:boolean;isGoogle:boolean};
export type DeviceCalendarStatus={permission:"granted"|"denied"|"undetermined";calendarId:string|null;calendarTitle:string|null;isGoogle:boolean;lastSyncAt:string|null};
export type DeviceCalendarSyncResult={total:number;created:number;updated:number;deleted:number;failed:number};

const empty=():SyncConfig=>({calendarId:null,eventIds:{},lastSyncAt:null});
async function readConfig():Promise<SyncConfig>{try{const raw=await AsyncStorage.getItem(CONFIG_KEY);if(!raw)return empty();const x=JSON.parse(raw);if(typeof x==="object"&&x&&typeof x.eventIds==="object")return{calendarId:typeof x.calendarId==="string"?x.calendarId:null,eventIds:x.eventIds,lastSyncAt:typeof x.lastSyncAt==="string"?x.lastSyncAt:null};}catch{}return empty();}
async function writeConfig(config:SyncConfig){await AsyncStorage.setItem(CONFIG_KEY,JSON.stringify(config));}
function sourceInfo(calendar:any){const sourceName=String(calendar?.source?.name??"");const sourceType=String(calendar?.source?.type??"");const isGoogle=/google/i.test(sourceType)||/@gmail\.com$/i.test(sourceName)||/google/i.test(sourceName);return{sourceName,sourceType,isGoogle};}
async function calendars():Promise<any[]>{return await Calendar.getCalendars(Calendar.EntityTypes.EVENT) as any[];}
function writable(calendar:any){if(calendar?.allowsModifications===false)return false;const access=String(calendar?.accessLevel??"").toLowerCase();return !access||!["read","freebusy"].includes(access);}
function details(lesson:MobileLesson){return{title:lesson.title,startDate:new Date(lesson.startsAt),endDate:new Date(lesson.endsAt),timeZone:TIME_ZONE,notes:`מפתחות להצלחה - יומן תלמידים\nlesson:${lesson.id}\nסוג: ${lesson.kind==="group"?"קבוצתי":"פרטני"}`};}

export const DeviceCalendarSyncService={
 async getStatus():Promise<DeviceCalendarStatus>{
  const permission=await Calendar.getCalendarPermissions();const config=await readConfig();let title:string|null=null,isGoogle=false;
  if(permission.status==="granted"&&config.calendarId){try{const list=await calendars();const found=list.find(x=>String(x.id)===config.calendarId);if(found){title=String(found.title??"יומן");isGoogle=sourceInfo(found).isGoogle;}}catch{}}
  return{permission:permission.status as DeviceCalendarStatus["permission"],calendarId:config.calendarId,calendarTitle:title,isGoogle,lastSyncAt:config.lastSyncAt};
 },
 async requestCalendars():Promise<CalendarChoice[]>{
  const permission=await Calendar.requestCalendarPermissions();if(permission.status!=="granted")throw new Error("CALENDAR_PERMISSION_DENIED");
  const list=await calendars();return list.filter(writable).map(x=>{const source=sourceInfo(x);return{id:String(x.id),title:String(x.title??"יומן"),sourceName:source.sourceName,sourceType:source.sourceType,isPrimary:Boolean(x.isPrimary),isGoogle:source.isGoogle};}).sort((a,b)=>Number(b.isGoogle)-Number(a.isGoogle)||Number(b.isPrimary)-Number(a.isPrimary)||a.title.localeCompare(b.title,"he"));
 },
 async selectCalendar(calendarId:string):Promise<DeviceCalendarStatus>{
  const permission=await Calendar.getCalendarPermissions();if(permission.status!=="granted")throw new Error("CALENDAR_PERMISSION_DENIED");const list=await calendars();const found=list.find(x=>String(x.id)===calendarId&&writable(x));if(!found)throw new Error("CALENDAR_NOT_WRITABLE");const current=await readConfig();await writeConfig({...current,calendarId});return this.getStatus();
 },
 async disconnect(){const config=await readConfig();await writeConfig({...config,calendarId:null,lastSyncAt:null});return this.getStatus();},
 async sync(lessons:MobileLesson[]):Promise<DeviceCalendarSyncResult>{
  const permission=await Calendar.getCalendarPermissions();if(permission.status!=="granted")throw new Error("CALENDAR_PERMISSION_DENIED");const config=await readConfig();if(!config.calendarId)throw new Error("CALENDAR_NOT_SELECTED");
  const list=await calendars();const selected=list.find(x=>String(x.id)===config.calendarId&&writable(x));if(!selected)throw new Error("CALENDAR_NOT_WRITABLE");
  const calendar=await Calendar.ExpoCalendar.get(config.calendarId);let created=0,updated=0,deleted=0,failed=0;
  for(const lesson of lessons){try{const eventId=config.eventIds[lesson.id];if(lesson.cancelled){if(eventId){try{const event=await Calendar.ExpoCalendarEvent.get(eventId);await event.delete();}catch{}delete config.eventIds[lesson.id];}deleted++;continue;}if(eventId){try{const event=await Calendar.ExpoCalendarEvent.get(eventId);await event.update(details(lesson));updated++;continue;}catch{delete config.eventIds[lesson.id];}}
    const event=await calendar.createEvent(details(lesson));const newId=String((event as any).id??"");if(!newId)throw new Error("CALENDAR_EVENT_ID_MISSING");config.eventIds[lesson.id]=newId;created++;
   }catch{failed++;}}
  config.lastSyncAt=new Date().toISOString();await writeConfig(config);return{total:lessons.length,created,updated,deleted,failed};
 }
};
