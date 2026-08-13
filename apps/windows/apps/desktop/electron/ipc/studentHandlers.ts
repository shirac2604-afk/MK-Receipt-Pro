import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type { SupabaseCloudService } from "../main/SupabaseCloudService";
import { StudentManagementCloudService } from "../main/StudentManagementCloudService";
import type { StudentSaveInput } from "../../../../packages/database/src/studentTypes";
import { apiFailure, apiSuccess, type ApiResult } from "../../../../packages/shared/src/api";
import { assertPayloadSize, assertTrustedSender, withTimeout } from "./security";

function studentError(error: unknown): ApiResult<never> {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (code === "UNTRUSTED_IPC_SENDER") return apiFailure("UNTRUSTED_IPC_SENDER", "הבקשה נחסמה מטעמי אבטחה.", false);
  if (code === "INVALID_INPUT" || code.startsWith("INVALID_STUDENT") || code === "STUDENT_PAYER_NOT_FOUND_IN_BUSINESS") return apiFailure("INVALID_INPUT", "פרטי התלמיד, ההורה או הלקוח המשלם אינם תקינים.", false);
  if (code === "CLOUD_CONNECTION_REQUIRED_FOR_STUDENTS") return apiFailure("DATABASE_OPERATION_FAILED", "ניהול תלמידים דורש חיבור פעיל לחשבון הענן.", false);
  if (code === "OPERATION_TIMEOUT") return apiFailure("OPERATION_TIMEOUT", "הפעולה ארכה זמן רב מדי והופסקה בבטחה.");
  if (code.startsWith("CLOUD_STUDENT")) return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן להשלים את פעולת התלמידים מול הענן. הנתונים הקיימים לא שונו.");
  return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן להשלים את פעולת התלמידים.");
}
async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>T|Promise<T>):Promise<ApiResult<T>>{try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action)));}catch(error){console.warn("[Students IPC] failure",error);return studentError(error)}}
function parseSaveInput(raw:any):StudentSaveInput{return {
  ...(typeof raw?.id==="string"&&raw.id?{id:raw.id}:{}),displayName:typeof raw?.displayName==="string"?raw.displayName:"",
  phone:typeof raw?.phone==="string"?raw.phone:"",email:typeof raw?.email==="string"?raw.email:"",
  schoolName:typeof raw?.schoolName==="string"?raw.schoolName:"",schoolGrade:typeof raw?.schoolGrade==="string"?raw.schoolGrade:"",focusNotes:typeof raw?.focusNotes==="string"?raw.focusNotes:"",
  defaultPriceAgorot:Number.isFinite(raw?.defaultPriceAgorot)?Math.trunc(Number(raw.defaultPriceAgorot)):-1,payerCustomerId:typeof raw?.payerCustomerId==="string"?raw.payerCustomerId:"",reminderEnabled:raw?.reminderEnabled!==false,
  guardianName:typeof raw?.guardianName==="string"?raw.guardianName:"",guardianRelationship:typeof raw?.guardianRelationship==="string"?raw.guardianRelationship:"",guardianPhone:typeof raw?.guardianPhone==="string"?raw.guardianPhone:"",guardianEmail:typeof raw?.guardianEmail==="string"?raw.guardianEmail:"",guardianReceivesReminders:raw?.guardianReceivesReminders!==false
};}
export function registerStudentHandlers(supabaseCloud:SupabaseCloudService):void{const students=new StudentManagementCloudService(supabaseCloud);ipcMain.handle("students:list",event=>handle(event,undefined,()=>students.list()));ipcMain.handle("students:save",(event,input)=>handle(event,input,()=>students.save(parseSaveInput(input))));ipcMain.handle("students:deactivate",(event,input)=>handle(event,input,()=>students.deactivate(typeof input?.studentId==="string"?input.studentId:"")));}
