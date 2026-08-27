import {supabase} from "../../lib/supabase";

export type CloudLessonItem={
  lessonId:string;participantId:string;studentId:string;studentName:string;title:string;startsAt:string;endsAt:string;kind:"individual"|"group";
  attendance:"scheduled"|"attended"|"absent"|"cancelled"|"late_cancelled";
  payment:"unpaid"|"paid"|"waived"|"refunded";amountAgorot:number;paymentMethod:string|null;
  summary:string|null;homework:string|null;
};

export type LessonSeriesInput={studentId:string;title:string;startsOn:string;localStartTime:string;durationMinutes:number;recurrenceIntervalWeeks:number;endsOn?:string;defaultPriceAgorot:number;parentReminderMinutes:number;studentReminderMinutes:number;};
export type GroupLessonSeriesInput={groupId:string;title:string;startsOn:string;localStartTime:string;durationMinutes:number;recurrenceIntervalWeeks:number;endsOn?:string;defaultPriceAgorot:number;parentReminderMinutes:number;studentReminderMinutes:number;};

const occurrenceLimit=26;
const ymd=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

function map(row:any,student:any,participant:any):CloudLessonItem{
 return {
  lessonId:String(row.id),participantId:String(participant.id),studentId:String(student.id),studentName:String(student.display_name),title:String(row.title),startsAt:String(row.starts_at),endsAt:String(row.ends_at),kind:row.kind==="group"?"group":"individual",
  attendance:participant.attendance_status,payment:participant.payment_status,amountAgorot:Number(participant.amount_agorot??0),paymentMethod:participant.payment_method??null,
  summary:row.lesson_summary??null,homework:row.homework??null
 };
}

function occurrenceDates(startsOn:string,intervalWeeks:number,endsOn?:string):string[]{
 const first=new Date(`${startsOn}T12:00:00`), end=endsOn?new Date(`${endsOn}T12:00:00`):null;
 if(Number.isNaN(first.getTime())||intervalWeeks<1)return[];
 const dates:string[]=[];
 for(let index=0;index<occurrenceLimit;index++){
  const next=new Date(first);next.setDate(first.getDate()+index*intervalWeeks*7);
  if(end&&next>end)break;
  dates.push(ymd(next));
 }
 return dates;
}

export async function listCloudLessonCalendar(businessId:string,fromIso:string,toIso:string):Promise<CloudLessonItem[]>{
 const {data:lessons,error:lessonError}=await supabase.from("lessons")
  .select("id,student_id,kind,title,starts_at,ends_at,lesson_summary,homework")
  .eq("business_id",businessId).gte("starts_at",fromIso).lt("starts_at",toIso).order("starts_at");
 if(lessonError)throw lessonError;
 const rows=lessons??[];if(!rows.length)return[];
 const lessonIds=rows.map((row:any)=>String(row.id));
 const participantResult=await supabase.from("lesson_participants").select("id,lesson_id,student_id,attendance_status,payment_status,amount_agorot,payment_method").eq("business_id",businessId).in("lesson_id",lessonIds);
 if(participantResult.error)throw participantResult.error;
 const participantRows=participantResult.data??[];
 const studentIds=[...new Set(participantRows.map((row:any)=>row.student_id).filter(Boolean).map(String))];
 if(!studentIds.length)return [];
 const studentResult=await supabase.from("students").select("id,display_name").eq("business_id",businessId).in("id",studentIds);
 if(studentResult.error)throw studentResult.error;
 const participantsByLesson=new Map<string,any[]>();
 for(const participant of participantRows){const key=String(participant.lesson_id);participantsByLesson.set(key,[...(participantsByLesson.get(key)??[]),participant]);}
 const students=new Map((studentResult.data??[]).map((row:any)=>[String(row.id),row]));
 return rows.flatMap((row:any)=>(participantsByLesson.get(String(row.id))??[]).flatMap(participant=>{const student=students.get(String(participant.student_id));return student?[map(row,student,participant)]:[]}));
}

export async function createCloudLessonSeries(businessId:string,input:LessonSeriesInput):Promise<void>{
 if(!input.studentId||input.title.trim().length<2||input.title.trim().length>160||!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn)||!/^\d{2}:\d{2}$/.test(input.localStartTime)||input.durationMinutes<15||input.durationMinutes>480||input.recurrenceIntervalWeeks<1||input.recurrenceIntervalWeeks>12||!Number.isInteger(input.defaultPriceAgorot)||input.defaultPriceAgorot<0||!Number.isInteger(input.parentReminderMinutes)||!Number.isInteger(input.studentReminderMinutes)||input.parentReminderMinutes<0||input.parentReminderMinutes>10080||input.studentReminderMinutes<0||input.studentReminderMinutes>10080)throw new Error("INVALID_LESSON_SERIES");
 const studentResult=await supabase.from("students").select("id,payer_customer_id").eq("business_id",businessId).eq("id",input.studentId).eq("active",true).single();
 if(studentResult.error||!studentResult.data)throw new Error("LESSON_STUDENT_NOT_FOUND");
 const weekday=new Date(`${input.startsOn}T12:00:00`).getDay();
 const seriesResult=await supabase.from("lesson_series").insert({business_id:businessId,kind:"individual",student_id:input.studentId,group_id:null,title:input.title.trim(),weekday,local_start_time:input.localStartTime,duration_minutes:input.durationMinutes,recurrence_interval_weeks:input.recurrenceIntervalWeeks,starts_on:input.startsOn,ends_on:input.endsOn||null,default_price_agorot:input.defaultPriceAgorot,parent_reminder_minutes:input.parentReminderMinutes,student_reminder_minutes:input.studentReminderMinutes,active:true}).select("id").single();
 if(seriesResult.error||!seriesResult.data)throw seriesResult.error??new Error("LESSON_SERIES_CREATE_FAILED");
 for(const date of occurrenceDates(input.startsOn,input.recurrenceIntervalWeeks,input.endsOn)){
  const start=new Date(`${date}T${input.localStartTime}:00`),end=new Date(start.getTime()+input.durationMinutes*60_000);
  const lessonResult=await supabase.from("lessons").upsert({business_id:businessId,series_id:seriesResult.data.id,kind:"individual",student_id:input.studentId,group_id:null,title:input.title.trim(),starts_at:start.toISOString(),ends_at:end.toISOString(),status:"scheduled"},{onConflict:"series_id,starts_at",ignoreDuplicates:true}).select("id").maybeSingle();
  let lessonId=lessonResult.data?.id;
  if(lessonResult.error)throw lessonResult.error;
  if(!lessonId){const found=await supabase.from("lessons").select("id").eq("business_id",businessId).eq("series_id",seriesResult.data.id).eq("starts_at",start.toISOString()).single();if(found.error||!found.data)throw found.error??new Error("LESSON_LOOKUP_FAILED");lessonId=found.data.id;}
  const participantResult=await supabase.from("lesson_participants").upsert({business_id:businessId,lesson_id:lessonId,student_id:input.studentId,payer_customer_id:studentResult.data.payer_customer_id??null,attendance_status:"scheduled",payment_status:"unpaid",amount_agorot:input.defaultPriceAgorot,payment_method:null,paid_at:null},{onConflict:"lesson_id,student_id",ignoreDuplicates:true});
  if(participantResult.error)throw participantResult.error;
 }
}

export async function createCloudGroupLessonSeries(businessId:string,input:GroupLessonSeriesInput):Promise<void>{
 if(!input.groupId||input.title.trim().length<2||input.title.trim().length>160||!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn)||!/^\d{2}:\d{2}$/.test(input.localStartTime)||input.durationMinutes<15||input.durationMinutes>480||input.recurrenceIntervalWeeks<1||input.recurrenceIntervalWeeks>12||!Number.isInteger(input.defaultPriceAgorot)||input.defaultPriceAgorot<0||!Number.isInteger(input.parentReminderMinutes)||!Number.isInteger(input.studentReminderMinutes)||input.parentReminderMinutes<0||input.parentReminderMinutes>10080||input.studentReminderMinutes<0||input.studentReminderMinutes>10080)throw new Error("INVALID_GROUP_LESSON_SERIES");
 const {data:members,error:membersError}=await supabase.from("student_group_members").select("student_id").eq("business_id",businessId).eq("group_id",input.groupId).is("left_at",null);
 if(membersError)throw new Error(`CLOUD_GROUP_MEMBERS_FAILED:${membersError.message}`);
 const studentIds=[...new Set((members??[]).map(row=>String(row.student_id)))];
 if(!studentIds.length)throw new Error("GROUP_REQUIRES_MEMBER");
 const {data:students,error:studentsError}=await supabase.from("students").select("id,payer_customer_id").eq("business_id",businessId).eq("active",true).in("id",studentIds);
 if(studentsError||(students??[]).length!==studentIds.length)throw new Error("GROUP_MEMBER_NOT_FOUND");
 const payerByStudent=new Map((students??[]).map((student:any)=>[String(student.id),student.payer_customer_id??null]));
 const weekday=new Date(`${input.startsOn}T12:00:00`).getDay();
 const {data:series,error:seriesError}=await supabase.from("lesson_series").insert({business_id:businessId,kind:"group",student_id:null,group_id:input.groupId,title:input.title.trim(),weekday,local_start_time:input.localStartTime,duration_minutes:input.durationMinutes,recurrence_interval_weeks:input.recurrenceIntervalWeeks,starts_on:input.startsOn,ends_on:input.endsOn||null,default_price_agorot:input.defaultPriceAgorot,parent_reminder_minutes:input.parentReminderMinutes,student_reminder_minutes:input.studentReminderMinutes,active:true}).select("id").single();
 if(seriesError||!series)throw seriesError??new Error("GROUP_LESSON_SERIES_CREATE_FAILED");
 for(const date of occurrenceDates(input.startsOn,input.recurrenceIntervalWeeks,input.endsOn)){
  const start=new Date(`${date}T${input.localStartTime}:00`),end=new Date(start.getTime()+input.durationMinutes*60_000);
  const lessonResult=await supabase.from("lessons").upsert({business_id:businessId,series_id:series.id,kind:"group",student_id:null,group_id:input.groupId,title:input.title.trim(),starts_at:start.toISOString(),ends_at:end.toISOString(),status:"scheduled"},{onConflict:"series_id,starts_at",ignoreDuplicates:true}).select("id").maybeSingle();
  if(lessonResult.error)throw lessonResult.error;
  let lessonId=lessonResult.data?.id;
  if(!lessonId){const found=await supabase.from("lessons").select("id").eq("business_id",businessId).eq("series_id",series.id).eq("starts_at",start.toISOString()).single();if(found.error||!found.data)throw found.error??new Error("GROUP_LESSON_LOOKUP_FAILED");lessonId=found.data.id;}
  for(const studentId of studentIds){const {error}=await supabase.from("lesson_participants").upsert({business_id:businessId,lesson_id:lessonId,student_id:studentId,payer_customer_id:payerByStudent.get(studentId)??null,attendance_status:"scheduled",payment_status:"unpaid",amount_agorot:input.defaultPriceAgorot,payment_method:null,paid_at:null},{onConflict:"lesson_id,student_id",ignoreDuplicates:true});if(error)throw error;}
 }
}

export async function updateCloudLessonParticipant(businessId:string,item:CloudLessonItem,attendance:CloudLessonItem["attendance"],payment:CloudLessonItem["payment"],paymentMethod:string|null=item.paymentMethod):Promise<void>{
 const paid=payment==="paid";
 const {error}=await supabase.from("lesson_participants").update({attendance_status:attendance,payment_status:payment,payment_method:paid?paymentMethod:null,paid_at:paid?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",item.participantId);
 if(error)throw error;
}

export async function saveCloudLessonNotes(businessId:string,lessonId:string,summary:string,homework:string):Promise<void>{
 const {error}=await supabase.from("lessons").update({lesson_summary:summary.trim()||null,homework:homework.trim()||null,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",lessonId);
 if(error)throw error;
}
