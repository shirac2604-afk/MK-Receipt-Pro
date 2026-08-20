import type {SupabaseClient} from "@supabase/supabase-js";
import type {SupabaseCloudService} from "./SupabaseCloudService";
import type {LessonRecord} from "../../../../packages/database/src/studentTypes";

function mapLesson(row:any):LessonRecord{return{id:String(row.id),businessId:String(row.business_id),seriesId:row.series_id?String(row.series_id):null,kind:row.kind,studentId:row.student_id?String(row.student_id):null,groupId:row.group_id?String(row.group_id):null,title:String(row.title??""),startsAt:String(row.starts_at),endsAt:String(row.ends_at),status:row.status,lessonSummary:row.lesson_summary?String(row.lesson_summary):null,homework:row.homework?String(row.homework):null};}

export class LessonNotesCloudService{
  private readonly cloud:SupabaseCloudService;
  private readonly client:SupabaseClient;
  constructor(cloud:SupabaseCloudService){this.cloud=cloud;this.client=cloud.getClient();}
  private requireBusinessId():string{const status=this.cloud.getStatus();if(!status.connected||!status.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_LESSONS");return status.businessId;}
  async save(lessonId:string,lessonSummary:string,homework:string):Promise<LessonRecord>{
    const businessId=this.requireBusinessId();
    const summary=lessonSummary.trim(),next=homework.trim();
    if(!lessonId)throw new Error("INVALID_LESSON_NOTES");
    if(summary.length>8000||next.length>4000)throw new Error("INVALID_LESSON_NOTES_LENGTH");
    const{data,error}=await this.client.from("lessons").update({lesson_summary:summary||null,homework:next||null,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",lessonId).select("id,business_id,series_id,kind,student_id,group_id,title,starts_at,ends_at,status,lesson_summary,homework").single();
    if(error||!data)throw new Error(`CLOUD_LESSON_NOTES_SAVE_FAILED:${error?.message??"EMPTY"}`);
    return mapLesson(data);
  }
}
