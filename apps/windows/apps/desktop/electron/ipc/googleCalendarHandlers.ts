import {ipcMain,type IpcMainInvokeEvent} from "electron";
import type {GoogleCalendarService} from "../main/GoogleCalendarService";
import type {LessonRecord} from "../../../../packages/database/src/studentTypes";
import {apiFailure,apiSuccess,type ApiResult} from "../../../../packages/shared/src/api";
import {assertPayloadSize,assertTrustedSender,withTimeout} from "./security";

export type GoogleCalendarLessonSource=(fromIso:string,toIso:string)=>LessonRecord[]|Promise<LessonRecord[]>;

function calendarError(error:unknown):ApiResult<never>{const code=error instanceof Error?error.message:"UNKNOWN_ERROR";if(code==="UNTRUSTED_IPC_SENDER")return apiFailure("UNTRUSTED_IPC_SENDER","הבקשה נחסמה מטעמי אבטחה.",false);if(code==="INVALID_GOOGLE_CLIENT_ID")return apiFailure("INVALID_INPUT","מזהה אפליקציית Google אינו תקין.",false);if(code==="INVALID_GOOGLE_CLIENT_SECRET")return apiFailure("INVALID_INPUT","Client Secret של Google אינו תקין.",false);if(code==="GOOGLE_CALENDAR_NOT_CONFIGURED")return apiFailure("INVALID_INPUT","יש להגדיר Google OAuth Client ID לפני החיבור.",false);if(code==="GOOGLE_CLIENT_SECRET_REQUIRED")return apiFailure("INVALID_INPUT","יש לשמור Client Secret של Google לפני החיבור.",false);if(code==="GOOGLE_CALENDAR_NOT_CONNECTED"||code==="GOOGLE_CALENDAR_RECONNECT_REQUIRED")return apiFailure("DATABASE_OPERATION_FAILED","יש לחבר מחדש את Google Calendar.",false);if(code==="GOOGLE_OAUTH_TIMEOUT")return apiFailure("OPERATION_TIMEOUT","החיבור ל-Google לא הושלם בזמן. אפשר לנסות שוב.",false);return apiFailure("DATABASE_OPERATION_FAILED","לא ניתן להשלים את פעולת Google Calendar כעת.",false);}
async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>T|Promise<T>):Promise<ApiResult<T>>{try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action),210000));}catch(error){console.warn("[Google Calendar IPC] failure",error);return calendarError(error)}}
export function registerGoogleCalendarHandlers(service:GoogleCalendarService,listLessonsForSync:GoogleCalendarLessonSource):void{
 ipcMain.handle("google-calendar:get-status",event=>handle(event,undefined,()=>service.getStatus()));
 ipcMain.handle("google-calendar:set-client-id",(event,input)=>handle(event,input,()=>service.setClientId(typeof input?.clientId==="string"?input.clientId:"")));
 ipcMain.handle("google-calendar:set-client-secret",(event,input)=>handle(event,input,()=>service.setClientSecret(typeof input?.clientSecret==="string"?input.clientSecret:"")));
 ipcMain.handle("google-calendar:connect",event=>handle(event,undefined,()=>service.connect()));
 ipcMain.handle("google-calendar:disconnect",event=>handle(event,undefined,()=>service.disconnect()));
 ipcMain.handle("google-calendar:sync-now",event=>handle(event,undefined,async()=>{const from=new Date();from.setDate(from.getDate()-30);const to=new Date();to.setFullYear(to.getFullYear()+1);return service.syncLessons(await listLessonsForSync(from.toISOString(),to.toISOString()));}));
}
