import {ipcMain,type IpcMainInvokeEvent} from "electron";
import type {SupabaseCloudService} from "../main/SupabaseCloudService";
import {GroupManagementCloudService} from "../main/GroupManagementCloudService";
import {GroupLessonCloudService} from "../main/GroupLessonCloudService";
import type {LocalStudentTestStore} from "../main/LocalStudentTestStore";
import {STUDENT_TEST_MODE} from "../main/SupabaseCloudConfig";
import type {StudentGroupSaveInput,GroupLessonSeriesSaveInput} from "../../../../packages/database/src/groupTypes";
import {apiFailure,apiSuccess,type ApiResult} from "../../../../packages/shared/src/api";
import {assertPayloadSize,assertTrustedSender,withTimeout} from "./security";
function groupError(error:unknown):ApiResult<never>{const code=error instanceof Error?error.message:"UNKNOWN_ERROR";if(code==="UNTRUSTED_IPC_SENDER")return apiFailure("UNTRUSTED_IPC_SENDER","הבקשה נחסמה מטעמי אבטחה.",false);if(code.includes("INVALID_GROUP")||code==="GROUP_REQUIRES_MEMBER"||code==="GROUP_MEMBER_NOT_FOUND"||code==="GROUP_NOT_FOUND")return apiFailure("INVALID_INPUT","פרטי הקבוצה או חברי הקבוצה אינם תקינים.",false);if(code==="CLOUD_CONNECTION_REQUIRED_FOR_GROUPS")return apiFailure("DATABASE_OPERATION_FAILED","ניהול קבוצות דורש חיבור פעיל לחשבון הענן.",false);return apiFailure("DATABASE_OPERATION_FAILED","לא ניתן להשלים את פעולת הקבוצה כעת.");}
async function handle<T>(event:IpcMainInvokeEvent,payload:unknown,action:()=>Promise<T>|T):Promise<ApiResult<T>>{try{assertTrustedSender(event);assertPayloadSize(payload);return apiSuccess(await withTimeout(Promise.resolve().then(action),30000));}catch(error){console.warn("[Groups IPC] failure",error);return groupError(error)}}
function parseGroup(raw:any):StudentGroupSaveInput{return{...(typeof raw?.id==="string"&&raw.id?{id:raw.id}:{}),name:typeof raw?.name==="string"?raw.name:"",description:typeof raw?.description==="string"?raw.description:"",studentIds:Array.isArray(raw?.studentIds)?raw.studentIds.filter((x:any)=>typeof x==="string"):[]};}
function parseSeries(raw:any):GroupLessonSeriesSaveInput{return{groupId:typeof raw?.groupId==="string"?raw.groupId:"",title:typeof raw?.title==="string"?raw.title:"",weekday:Number(raw?.weekday) as 0|1|2|3|4|5|6,localStartTime:typeof raw?.localStartTime==="string"?raw.localStartTime:"",durationMinutes:Math.trunc(Number(raw?.durationMinutes)||0),recurrenceIntervalWeeks:Math.trunc(Number(raw?.recurrenceIntervalWeeks)||0),startsOn:typeof raw?.startsOn==="string"?raw.startsOn:"",endsOn:typeof raw?.endsOn==="string"?raw.endsOn:"",defaultPriceAgorot:Math.trunc(Number(raw?.defaultPriceAgorot)||0),parentReminderMinutes:Math.trunc(Number(raw?.parentReminderMinutes)||0),studentReminderMinutes:Math.trunc(Number(raw?.studentReminderMinutes)||0)};}
export function registerGroupHandlers(cloud:SupabaseCloudService,localStore:LocalStudentTestStore):void{
 const groups=STUDENT_TEST_MODE?null:new GroupManagementCloudService(cloud),lessons=STUDENT_TEST_MODE?null:new GroupLessonCloudService(cloud);
 ipcMain.handle("groups:list",e=>handle(e,undefined,()=>STUDENT_TEST_MODE?localStore.listGroups():groups!.list()));
 ipcMain.handle("groups:save",(e,input)=>handle(e,input,()=>{const parsed=parseGroup(input);return STUDENT_TEST_MODE?localStore.saveGroup(parsed):groups!.save(parsed);}));
 ipcMain.handle("groups:deactivate",(e,input)=>handle(e,input,()=>{const groupId=typeof input?.groupId==="string"?input.groupId:"";return STUDENT_TEST_MODE?localStore.deactivateGroup(groupId):groups!.deactivate(groupId);}));
 ipcMain.handle("groups:create-series",(e,input)=>handle(e,input,()=>{const parsed=parseSeries(input);return STUDENT_TEST_MODE?localStore.createGroupSeries(parsed):lessons!.createSeries(parsed);}));
 ipcMain.handle("groups:list-calendar",(e,input)=>handle(e,input,()=>{const from=typeof input?.fromIso==="string"?input.fromIso:"",to=typeof input?.toIso==="string"?input.toIso:"";return STUDENT_TEST_MODE?localStore.listGroupCalendar(from,to):lessons!.listCalendar(from,to);}));
}
