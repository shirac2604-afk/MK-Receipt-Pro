import {supabase} from "../../lib/supabase";

export type CloudStudent={
 id:string;displayName:string;phone:string|null;email:string|null;schoolName:string|null;schoolGrade:string|null;
 focusNotes:string|null;defaultPriceAgorot:number;reminderEnabled:boolean;active:boolean;primaryGuardian:CloudGuardian|null;
};

export type CloudGuardian={id:string;displayName:string;relationship:string|null;phone:string|null;email:string|null;receivesReminders:boolean};

export type CloudStudentInput={
 id?:string;displayName:string;phone?:string;email?:string;schoolName?:string;schoolGrade?:string;focusNotes?:string;defaultPriceAgorot?:number;reminderEnabled?:boolean;guardianName?:string;guardianRelationship?:string;guardianPhone?:string;guardianEmail?:string;guardianReceivesReminders?:boolean;
};

const optional=(value:string|undefined,max:number)=>{const v=value?.trim()||"";if(v.length>max)throw new Error("STUDENT_FIELD_TOO_LONG");return v||null};
const phone=(value:string|null)=>{if(value&&!/^[0-9+()\- ]{6,20}$/.test(value))throw new Error("INVALID_STUDENT_PHONE");return value};
const email=(value:string|null)=>{if(value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error("INVALID_STUDENT_EMAIL");return value?.toLowerCase()??null};
const map=(row:any,guardian:CloudGuardian|null=null):CloudStudent=>({id:String(row.id),displayName:String(row.display_name),phone:row.phone?String(row.phone):null,email:row.email?String(row.email):null,schoolName:row.school_name?String(row.school_name):null,schoolGrade:row.school_grade?String(row.school_grade):null,focusNotes:row.focus_notes?String(row.focus_notes):null,defaultPriceAgorot:Number(row.default_price_agorot??0),reminderEnabled:Boolean(row.reminder_enabled),active:Boolean(row.active),primaryGuardian:guardian});
const mapGuardian=(row:any):CloudGuardian=>({id:String(row.id),displayName:String(row.display_name),relationship:row.relationship?String(row.relationship):null,phone:row.phone?String(row.phone):null,email:row.email?String(row.email):null,receivesReminders:Boolean(row.receives_reminders)});

export async function listCloudStudents(businessId:string):Promise<CloudStudent[]>{
 const {data,error}=await supabase.from("students").select("id,display_name,phone,email,school_name,school_grade,focus_notes,default_price_agorot,reminder_enabled,active").eq("business_id",businessId).eq("active",true).order("display_name",{ascending:true});
 if(error)throw new Error(`CLOUD_STUDENTS_LIST_FAILED:${error.message}`);
 const ids=(data??[]).map(row=>String(row.id));let guardians:any[]=[];
 if(ids.length){const result=await supabase.from("student_guardians").select("id,student_id,display_name,relationship,phone,email,receives_reminders").eq("business_id",businessId).eq("is_primary",true).in("student_id",ids);if(result.error)throw new Error(`CLOUD_STUDENT_GUARDIANS_LIST_FAILED:${result.error.message}`);guardians=result.data??[];}
 const byStudent=new Map(guardians.map(row=>[String(row.student_id),mapGuardian(row)]));
 return (data??[]).map(row=>map(row,byStudent.get(String(row.id))??null));
}

export async function saveCloudStudent(businessId:string,input:CloudStudentInput):Promise<CloudStudent>{
 const displayName=input.displayName.trim();
 if(displayName.length<2||displayName.length>160)throw new Error("INVALID_STUDENT_NAME");
 const amount=Math.max(0,Math.round(Number(input.defaultPriceAgorot??0)));
 if(!Number.isSafeInteger(amount)||amount>100_000_000)throw new Error("INVALID_STUDENT_PRICE");
 const payload={business_id:businessId,display_name:displayName,phone:phone(optional(input.phone,20)),email:email(optional(input.email,254)),school_name:optional(input.schoolName,160),school_grade:optional(input.schoolGrade,80),focus_notes:optional(input.focusNotes,4000),default_price_agorot:amount,reminder_enabled:Boolean(input.reminderEnabled),active:true,updated_at:new Date().toISOString()};
 const query=input.id?supabase.from("students").update(payload).eq("business_id",businessId).eq("id",input.id):supabase.from("students").insert(payload);
 const {data,error}=await query.select("id,display_name,phone,email,school_name,school_grade,focus_notes,default_price_agorot,reminder_enabled,active").single();
 if(error||!data)throw new Error(`CLOUD_STUDENT_SAVE_FAILED:${error?.message??"EMPTY"}`);
 const guardianName=optional(input.guardianName,160);let guardian:CloudGuardian|null=null;
 const existing=await supabase.from("student_guardians").select("id").eq("business_id",businessId).eq("student_id",data.id).eq("is_primary",true).maybeSingle();
 if(existing.error)throw new Error(`CLOUD_STUDENT_GUARDIAN_LOOKUP_FAILED:${existing.error.message}`);
 if(!guardianName){
  if(existing.data){const {error:removeError}=await supabase.from("student_guardians").delete().eq("business_id",businessId).eq("id",existing.data.id);if(removeError)throw new Error(`CLOUD_STUDENT_GUARDIAN_REMOVE_FAILED:${removeError.message}`);}
 }else{
  const guardianPayload={business_id:businessId,student_id:String(data.id),display_name:guardianName,relationship:optional(input.guardianRelationship,80),phone:phone(optional(input.guardianPhone,20)),email:email(optional(input.guardianEmail,254)),is_primary:true,receives_reminders:Boolean(input.guardianReceivesReminders),updated_at:new Date().toISOString()};
  const query=existing.data?supabase.from("student_guardians").update(guardianPayload).eq("business_id",businessId).eq("id",existing.data.id):supabase.from("student_guardians").insert(guardianPayload);
  const {data:guardianRow,error:guardianError}=await query.select("id,display_name,relationship,phone,email,receives_reminders").single();
  if(guardianError||!guardianRow)throw new Error(`CLOUD_STUDENT_GUARDIAN_SAVE_FAILED:${guardianError?.message??"EMPTY"}`);
  guardian=mapGuardian(guardianRow);
 }
 return map(data,guardian);
}

export async function archiveCloudStudent(businessId:string,id:string):Promise<void>{
 const {data,error}=await supabase.from("students").update({active:false,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",id).select("id").maybeSingle();
 if(error||!data)throw new Error(`CLOUD_STUDENT_ARCHIVE_FAILED:${error?.message??"NOT_FOUND"}`);
}
