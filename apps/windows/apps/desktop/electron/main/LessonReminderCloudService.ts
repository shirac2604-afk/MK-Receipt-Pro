import type {SupabaseCloudService} from "./SupabaseCloudService";
import type {ClaimedLessonReminder,ReminderAudience,ReminderChannel,ReminderStatus} from "../../../../packages/database/src/studentTypes";
import type {LessonReminderHistoryItem} from "../../../../packages/database/src/reminderHistoryTypes";

function mapReminder(row:any):ClaimedLessonReminder{return{reminderId:String(row.reminder_id),businessId:String(row.business_id),lessonId:String(row.lesson_id),studentId:String(row.student_id),guardianId:row.guardian_id?String(row.guardian_id):null,audience:String(row.audience) as ReminderAudience,channel:String(row.channel) as ReminderChannel,scheduledFor:String(row.scheduled_for),studentName:String(row.student_name??""),recipientName:String(row.recipient_name??""),recipientPhone:row.recipient_phone?String(row.recipient_phone):null,recipientEmail:row.recipient_email?String(row.recipient_email):null,lessonTitle:String(row.lesson_title??""),lessonStartsAt:String(row.lesson_starts_at)};}

export class LessonReminderCloudService{
 constructor(private readonly cloud:SupabaseCloudService){}
 private requireBusinessId():string{const status=this.cloud.getStatus();if(!status.connected||!status.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_REMINDERS");return status.businessId;}
 async releaseStale():Promise<number>{this.requireBusinessId();const{data,error}=await this.cloud.getClient().rpc("release_stale_lesson_reminders");if(error)throw new Error(`CLOUD_REMINDER_RELEASE_FAILED:${error.message}`);return Number(data??0);}
 async claimDue(limit=20):Promise<ClaimedLessonReminder[]>{this.requireBusinessId();const safeLimit=Math.max(1,Math.min(100,Math.trunc(limit)));const{data,error}=await this.cloud.getClient().rpc("claim_due_lesson_reminders",{p_limit:safeLimit});if(error)throw new Error(`CLOUD_REMINDER_CLAIM_FAILED:${error.message}`);return(data??[]).map(mapReminder);}
 async finish(reminderId:string,success:boolean,errorMessage?:string):Promise<void>{this.requireBusinessId();if(!reminderId)throw new Error("INVALID_REMINDER_ID");const{error}=await this.cloud.getClient().rpc("finish_lesson_reminder",{p_reminder_id:reminderId,p_success:success,p_error:success?null:(errorMessage||"REMINDER_DELIVERY_FAILED")});if(error)throw new Error(`CLOUD_REMINDER_FINISH_FAILED:${error.message}`);}
 async pendingCount():Promise<number>{const status=this.cloud.getStatus();if(!status.connected||!status.businessId)return 0;const{count,error}=await this.cloud.getClient().from("lesson_reminders").select("id",{count:"exact",head:true}).eq("business_id",status.businessId).eq("status","pending");if(error)throw new Error(`CLOUD_REMINDER_COUNT_FAILED:${error.message}`);return count??0;}
 async listRecent(limit=50):Promise<LessonReminderHistoryItem[]>{
  const businessId=this.requireBusinessId(),safeLimit=Math.max(1,Math.min(100,Math.trunc(limit)));
  const client=this.cloud.getClient();
  const{data:rows,error}=await client.from("lesson_reminders").select("id,lesson_id,student_id,audience,channel,scheduled_for,status,sent_at,attempt_count,last_error").eq("business_id",businessId).order("scheduled_for",{ascending:false}).limit(safeLimit);
  if(error)throw new Error(`CLOUD_REMINDER_HISTORY_FAILED:${error.message}`);
  if(!(rows??[]).length)return[];
  const lessonIds=[...new Set((rows??[]).map((r:any)=>String(r.lesson_id)))],studentIds=[...new Set((rows??[]).map((r:any)=>String(r.student_id)))];
  const[lessonResult,studentResult]=await Promise.all([client.from("lessons").select("id,title,starts_at").eq("business_id",businessId).in("id",lessonIds),client.from("students").select("id,display_name").eq("business_id",businessId).in("id",studentIds)]);
  if(lessonResult.error||studentResult.error)throw new Error("CLOUD_REMINDER_HISTORY_JOIN_FAILED");
  const lessonMap=new Map((lessonResult.data??[]).map((r:any)=>[String(r.id),{title:String(r.title??""),startsAt:String(r.starts_at)}]));
  const studentMap=new Map((studentResult.data??[]).map((r:any)=>[String(r.id),String(r.display_name??"")]));
  return(rows??[]).map((r:any)=>{const lesson=lessonMap.get(String(r.lesson_id));return{id:String(r.id),lessonId:String(r.lesson_id),studentId:String(r.student_id),studentName:studentMap.get(String(r.student_id))??"",lessonTitle:lesson?.title??"",lessonStartsAt:lesson?.startsAt??"",audience:String(r.audience) as ReminderAudience,channel:String(r.channel) as ReminderChannel,scheduledFor:String(r.scheduled_for),status:String(r.status) as ReminderStatus,sentAt:r.sent_at?String(r.sent_at):null,attemptCount:Number(r.attempt_count??0),lastError:r.last_error?String(r.last_error):null};});
 }
 async retryFailed(reminderId:string):Promise<void>{
  const businessId=this.requireBusinessId();if(!reminderId)throw new Error("INVALID_REMINDER_ID");
  const{data,error}=await this.cloud.getClient().from("lesson_reminders").update({status:"pending",last_error:null,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",reminderId).eq("status","failed").select("id").maybeSingle();
  if(error)throw new Error(`CLOUD_REMINDER_RETRY_FAILED:${error.message}`);if(!data)throw new Error("REMINDER_NOT_FAILED_OR_NOT_FOUND");
 }
}
