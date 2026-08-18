import {ipcMain,type IpcMainInvokeEvent} from "electron";
import type {DatabaseService} from "../../../../packages/database/src/DatabaseService";
import type {SupabaseCloudService} from "../main/SupabaseCloudService";
import {LessonManagementCloudService} from "../main/LessonManagementCloudService";
import {LessonReceiptCloudService} from "../main/LessonReceiptCloudService";
import type {LessonSeriesSaveInput} from "../../../../packages/database/src/studentTypes";
import {apiFailure,apiSuccess,type ApiResult} from "../../../../packages/shared/src/api";
import {assertPayloadSize,assertTrustedSender,withTimeout} from "./security";

function lessonError(error:unknown):ApiResult<never>{const code=error instanceof Error?error.message:"UNKNOWN_ERROR";if(code==="UNTRUSTED_IPC_SENDER")return apiFailure("UNTRUSTED_IPC_SENDER","הבקשה נחסמה מטעמי אבטחה.",false);if(code.startsWith("INVALID_LESSON")||code==="LESSON_STUDENT_NOT_FOUND")return apiFailure("INVALID_INPUT","פרטי השיעור אינם תקינים.",false);if(code==="CLOUD_CONNECTION_REQUIRED_FOR_LESSONS"||code==="CLOUD_CONNECTION_REQUIRED_FOR_LESSON_RECEIPT")return apiFailure("DATABASE_OPERATION_FAILED","ניהול שיעורים וקבלות אוטומטיות דורש חיבור פעיל לחשבון הענן.",false);if(code==="OPERATION_TIMEOUT")return apiFailure("OPERATION_TIMEOUT","הפעולה ארכה זמן רב מדי והופסקה בבטחה.");return apiFailure("DATABASE_OPERATION_FAILED","לא ניתן להשלים את פעולת השיעורים. הנתונים הקיימים לא שונו.");}
async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>T|Promise<T>):Promise<ApiResult<T>>{try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action),30000));}catch(error){console.warn("[Lessons IPC] failure",error);return lessonError(error)}}
function parseSeries(raw:any):LessonSeriesSaveInput{return{studentId:typeof raw?.studentId==="string"?raw.studentId:"",title:typeof raw?.title==="string"?raw.title:"",weekday:Number(raw?.weekday) as 0|1|2|3|4|5|6,localStartTime:typeof raw?.localStartTime==="string"?raw.localStartTime:"",durationMinutes:Math.trunc(Number(raw?.durationMinutes)||0),recurrenceIntervalWeeks:Math.trunc(Number(raw?.recurrenceIntervalWeeks)||0),startsOn:typeof raw?.startsOn==="string"?raw.startsOn:"",endsOn:typeof raw?.endsOn==="string"?raw.endsOn:"",defaultPriceAgorot:Math.trunc(Number(raw?.defaultPriceAgorot)||0),parentReminderMinutes:Math.trunc(Number(raw?.parentReminderMinutes)||0),studentReminderMinutes:Math.trunc(Number(raw?.studentReminderMinutes)||0)};}
export function registerLessonHandlers(supabaseCloud:SupabaseCloudService,databaseService:DatabaseService):void{
 const lessons=new LessonManagementCloudService(supabaseCloud),lessonReceipts=new LessonReceiptCloudService(supabaseCloud);const receiptInFlight=new Set<string>();
 ipcMain.handle("lessons:list-series",event=>handle(event,undefined,()=>lessons.listSeries()));
 ipcMain.handle("lessons:create-series",(event,input)=>handle(event,input,()=>lessons.createIndividualSeries(parseSeries(input))));
 ipcMain.handle("lessons:list-calendar",(event,input)=>handle(event,input,()=>lessons.listCalendar(typeof input?.fromIso==="string"?input.fromIso:"",typeof input?.toIso==="string"?input.toIso:"")));
 ipcMain.handle("lessons:update-participant",(event,input)=>handle(event,input,async()=>{
   const participantId=typeof input?.participantId==="string"?input.participantId:"";
   const updated=await lessons.updateParticipant(participantId,typeof input?.attendanceStatus==="string"?input.attendanceStatus:"",typeof input?.paymentStatus==="string"?input.paymentStatus:"",typeof input?.paymentMethod==="string"?input.paymentMethod:null,Math.trunc(Number(input?.amountAgorot)||0));
   if(updated.attendanceStatus!=="attended"||updated.paymentStatus!=="paid")return{participant:updated,receipt:null};
   if(receiptInFlight.has(participantId))throw new Error("LESSON_RECEIPT_ALREADY_IN_PROGRESS");receiptInFlight.add(participantId);
   try{
     const cloudReceipt=await lessonReceipts.issue(participantId);
     const localInput={customerId:cloudReceipt.customerId,clientName:cloudReceipt.clientName,...(cloudReceipt.clientPhone?{clientPhone:cloudReceipt.clientPhone}:{}),...(cloudReceipt.clientEmail?{clientEmail:cloudReceipt.clientEmail}:{}),description:cloudReceipt.description,amountAgorot:cloudReceipt.amountAgorot,paymentDate:cloudReceipt.paymentDate,paymentMethod:cloudReceipt.paymentMethod,referenceNumber:cloudReceipt.referenceNumber};
     const localResult=await databaseService.issueReceipt(localInput,cloudReceipt.receiptNumber);
     let warningCode=localResult.warningCode;
     if(localResult.pdfCreated&&localResult.pdfPath){try{await supabaseCloud.uploadReceiptPdf(cloudReceipt.receiptId,cloudReceipt.receiptNumber,localResult.pdfPath);}catch(error){warningCode=error instanceof Error?error.message:"CLOUD_RECEIPT_PDF_UPLOAD_FAILED";await lessonReceipts.recordWarning(participantId,warningCode);}}
     else if(warningCode)await lessonReceipts.recordWarning(participantId,warningCode);
     return{participant:{...updated,receiptId:cloudReceipt.receiptId},receipt:{id:cloudReceipt.receiptId,receiptNumber:cloudReceipt.receiptNumber,pdfCreated:localResult.pdfCreated,pdfPath:localResult.pdfPath,warningCode:warningCode??null}};
   }finally{receiptInFlight.delete(participantId);}
 }));
}
