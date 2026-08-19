import {ipcMain,type IpcMainInvokeEvent} from "electron";
import type {ReminderDispatchService} from "../main/ReminderDispatchService";
import {STUDENT_TEST_MODE} from "../main/SupabaseCloudConfig";
import {apiFailure,apiSuccess,type ApiResult} from "../../../../packages/shared/src/api";
import {assertPayloadSize,assertTrustedSender,withTimeout} from "./security";

function reminderError(error:unknown):ApiResult<never>{
 const code=error instanceof Error?error.message:"UNKNOWN_ERROR";
 if(code==="UNTRUSTED_IPC_SENDER")return apiFailure("UNTRUSTED_IPC_SENDER","הבקשה נחסמה מטעמי אבטחה.",false);
 if(code==="CLOUD_CONNECTION_REQUIRED_FOR_REMINDERS")return apiFailure("DATABASE_OPERATION_FAILED","בדיקת תזכורות דורשת חיבור פעיל לחשבון הענן.",false);
 if(code==="REMINDER_NOT_FAILED_OR_NOT_FOUND")return apiFailure("INVALID_INPUT","ניתן לנסות מחדש רק תזכורת שנכשלה.",false);
 if(code==="OPERATION_TIMEOUT")return apiFailure("OPERATION_TIMEOUT","בדיקת התזכורות ארכה זמן רב מדי והופסקה בבטחה.");
 return apiFailure("DATABASE_OPERATION_FAILED","לא ניתן לבדוק את תור התזכורות כעת.");
}

async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>T|Promise<T>):Promise<ApiResult<T>>{
 try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action),30000));}
 catch(error){console.warn("[Reminders IPC] failure",error);return reminderError(error);}
}

export function registerReminderHandlers(service:ReminderDispatchService):void{
 ipcMain.handle("reminders:get-status",event=>handle(event,undefined,()=>STUDENT_TEST_MODE?{providerId:"local-test-disabled",configured:false,running:false}:service.getStatus()));
 ipcMain.handle("reminders:dispatch-now",(event,input)=>handle(event,input,()=>STUDENT_TEST_MODE?{providerId:"local-test-disabled",configured:false,claimed:0,sent:0,failed:0,skipped:0}:service.dispatchDue(Math.trunc(Number(input?.limit)||20))));
 ipcMain.handle("reminders:list-recent",(event,input)=>handle(event,input,()=>STUDENT_TEST_MODE?[]:service.listRecent(Math.trunc(Number(input?.limit)||50))));
 ipcMain.handle("reminders:retry-failed",(event,input)=>handle(event,input,()=>STUDENT_TEST_MODE?undefined:service.retryFailed(typeof input?.reminderId==="string"?input.reminderId:"")));
}
