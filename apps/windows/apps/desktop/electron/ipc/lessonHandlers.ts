import {ipcMain,type IpcMainInvokeEvent} from "electron";
import type {SupabaseCloudService} from "../main/SupabaseCloudService";
import {LessonManagementCloudService} from "../main/LessonManagementCloudService";
import {LessonNotesCloudService} from "../main/LessonNotesCloudService";
import type {LocalStudentTestStore} from "../main/LocalStudentTestStore";
import {STUDENT_TEST_MODE} from "../main/SupabaseCloudConfig";
import type {LessonSeriesSaveInput} from "../../../../packages/database/src/studentTypes";
import {apiFailure,apiSuccess,type ApiResult} from "../../../../packages/shared/src/api";
import {assertPayloadSize,assertTrustedSender,withTimeout} from "./security";

function lessonError(error:unknown):ApiResult<never>{const code=error instanceof Error?error.message:"UNKNOWN_ERROR";if(code==="UNTRUSTED_IPC_SENDER")return apiFailure("UNTRUSTED_IPC_SENDER","הבקשה נחסמה מטעמי אבטחה.",false);if(code.startsWith("INVALID_LESSON")||code==="LESSON_STUDENT_NOT_FOUND")return apiFailure("INVALID_INPUT","פרטי השיעור אינם תקינים.",false);if(code==="CLOUD_CONNECTION_REQUIRED_FOR_LESSONS")return apiFailure("DATABASE_OPERATION_FAILED","ניהול שיעורים דורש חיבור פעיל לחשבון הבדיקה.",false);if(code==="OPERATION_TIMEOUT")return apiFailure("OPERATION_TIMEOUT","הפעולה ארכה זמן רב מדי והופסקה בבטחה.");return apiFailure("DATABASE_OPERATION_FAILED","לא ניתן להשלים את פעולת השיעורים. הנתונים הקיימים לא שונו.");}
async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>T|Promise<T>):Promise<ApiResult<T>>{try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action),30000));}catch(error){console.warn("[Lessons IPC] failure",error);return lessonError(error)}}
function parseSeries(raw:any):LessonSeriesSaveInput{return{studentId:typeof raw?.studentId==="string"?raw.studentId:"",title:typeof raw?.title==="string"?raw.title:"",weekday:Number(raw?.weekday) as 0|1|2|3|4|5|6,localStartTime:typeof raw?.localStartTime==="string"?raw.localStartTime:"",durationMinutes:Math.trunc(Number(raw?.durationMinutes)||0),recurrenceIntervalWeeks:Math.trunc(Number(raw?.recurrenceIntervalWeeks)||0),startsOn:typeof raw?.startsOn==="string"?raw.startsOn:"",endsOn:typeof raw?.endsOn==="string"?raw.endsOn:"",defaultPriceAgorot:Math.trunc(Number(raw?.defaultPriceAgorot)||0),parentReminderMinutes:Math.trunc(Number(raw?.parentReminderMinutes)||0),studentReminderMinutes:Math.trunc(Number(raw?.studentReminderMinutes)||0)};}
export function registerLessonHandlers(supabaseCloud:SupabaseCloudService,localStore:LocalStudentTestStore):void{
 const lessons=STUDENT_TEST_MODE?null:new LessonManagementCloudService(supabaseCloud),lessonNotes=STUDENT_TEST_MODE?null:new LessonNotesCloudService(supabaseCloud);
 ipcMain.handle("lessons:list-series",event=>handle(event,undefined,()=>STUDENT_TEST_MODE?localStore.listSeries():lessons!.listSeries()));
 ipcMain.handle("lessons:create-series",(event,input)=>handle(event,input,()=>{const parsed=parseSeries(input);return STUDENT_TEST_MODE?localStore.createIndividualSeries(parsed):lessons!.createIndividualSeries(parsed);}));
 ipcMain.handle("lessons:list-calendar",(event,input)=>handle(event,input,()=>{const from=typeof input?.fromIso==="string"?input.fromIso:"",to=typeof input?.toIso==="string"?input.toIso:"";return STUDENT_TEST_MODE?localStore.listIndividualCalendar(from,to):lessons!.listCalendar(from,to);}));
 ipcMain.handle("lessons:save-notes",(event,input)=>handle(event,input,()=>{const lessonId=typeof input?.lessonId==="string"?input.lessonId:"",summary=typeof input?.lessonSummary==="string"?input.lessonSummary:"",homework=typeof input?.homework==="string"?input.homework:"";return STUDENT_TEST_MODE?localStore.saveLessonNotes(lessonId,summary,homework):lessonNotes!.save(lessonId,summary,homework);}));
 ipcMain.handle("lessons:update-participant",(event,input)=>handle(event,input,async()=>{
   const participantId=typeof input?.participantId==="string"?input.participantId:"",attendance=typeof input?.attendanceStatus==="string"?input.attendanceStatus:"",payment=typeof input?.paymentStatus==="string"?input.paymentStatus:"",method=typeof input?.paymentMethod==="string"?input.paymentMethod:null,amount=Math.trunc(Number(input?.amountAgorot)||0);
   const updated=STUDENT_TEST_MODE?localStore.updateParticipant(participantId,attendance,payment,method,amount):await lessons!.updateParticipant(participantId,attendance,payment,method,amount);
   // TEST MODE: payments are tracked only; receipt issuance is disconnected.
   return{participant:updated,receipt:null};
 }));
}
