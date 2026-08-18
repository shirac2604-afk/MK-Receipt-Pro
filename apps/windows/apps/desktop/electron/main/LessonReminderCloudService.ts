import type {SupabaseCloudService} from "./SupabaseCloudService";
import type {ClaimedLessonReminder,ReminderAudience,ReminderChannel} from "../../../../packages/database/src/studentTypes";

function mapReminder(row:any):ClaimedLessonReminder{return{reminderId:String(row.reminder_id),businessId:String(row.business_id),lessonId:String(row.lesson_id),studentId:String(row.student_id),guardianId:row.guardian_id?String(row.guardian_id):null,audience:String(row.audience) as ReminderAudience,channel:String(row.channel) as ReminderChannel,scheduledFor:String(row.scheduled_for),studentName:String(row.student_name??""),recipientName:String(row.recipient_name??""),recipientPhone:row.recipient_phone?String(row.recipient_phone):null,recipientEmail:row.recipient_email?String(row.recipient_email):null,lessonTitle:String(row.lesson_title??""),lessonStartsAt:String(row.lesson_starts_at)};}

export class LessonReminderCloudService{
 constructor(private readonly cloud:SupabaseCloudService){}
 private requireConnected():void{const status=this.cloud.getStatus();if(!status.connected||!status.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_REMINDERS");}
 async releaseStale():Promise<number>{this.requireConnected();const{data,error}=await this.cloud.getClient().rpc("release_stale_lesson_reminders");if(error)throw new Error(`CLOUD_REMINDER_RELEASE_FAILED:${error.message}`);return Number(data??0);}
 async claimDue(limit=20):Promise<ClaimedLessonReminder[]>{this.requireConnected();const safeLimit=Math.max(1,Math.min(100,Math.trunc(limit)));const{data,error}=await this.cloud.getClient().rpc("claim_due_lesson_reminders",{p_limit:safeLimit});if(error)throw new Error(`CLOUD_REMINDER_CLAIM_FAILED:${error.message}`);return(data??[]).map(mapReminder);}
 async finish(reminderId:string,success:boolean,errorMessage?:string):Promise<void>{this.requireConnected();if(!reminderId)throw new Error("INVALID_REMINDER_ID");const{error}=await this.cloud.getClient().rpc("finish_lesson_reminder",{p_reminder_id:reminderId,p_success:success,p_error:success?null:(errorMessage||"REMINDER_DELIVERY_FAILED")});if(error)throw new Error(`CLOUD_REMINDER_FINISH_FAILED:${error.message}`);}
 async pendingCount():Promise<number>{const status=this.cloud.getStatus();if(!status.connected||!status.businessId)return 0;const{count,error}=await this.cloud.getClient().from("lesson_reminders").select("id",{count:"exact",head:true}).eq("business_id",status.businessId).eq("status","pending");if(error)throw new Error(`CLOUD_REMINDER_COUNT_FAILED:${error.message}`);return count??0;}
}
