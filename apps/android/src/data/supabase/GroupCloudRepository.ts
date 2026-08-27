import {supabase} from "../../lib/supabase";
import type {CloudStudent} from "./StudentCloudRepository";

export type CloudStudentGroup={
 id:string;name:string;description:string|null;active:boolean;memberIds:string[];members:CloudStudent[];
};

export type CloudStudentGroupInput={id?:string;name:string;description?:string;studentIds:string[]};

const mapStudent=(row:any):CloudStudent=>({id:String(row.id),displayName:String(row.display_name),phone:row.phone?String(row.phone):null,email:row.email?String(row.email):null,schoolName:row.school_name?String(row.school_name):null,schoolGrade:row.school_grade?String(row.school_grade):null,focusNotes:row.focus_notes?String(row.focus_notes):null,defaultPriceAgorot:Number(row.default_price_agorot??0),reminderEnabled:Boolean(row.reminder_enabled),active:Boolean(row.active),primaryGuardian:null});

export async function listCloudStudentGroups(businessId:string):Promise<CloudStudentGroup[]>{
 const {data:groups,error:groupsError}=await supabase.from("student_groups").select("id,name,description,active").eq("business_id",businessId).eq("active",true).order("name");
 if(groupsError)throw new Error(`CLOUD_GROUP_LIST_FAILED:${groupsError.message}`);
 if(!(groups??[]).length)return [];
 const groupIds=(groups??[]).map(row=>String(row.id));
 const {data:members,error:membersError}=await supabase.from("student_group_members").select("group_id,student_id").eq("business_id",businessId).in("group_id",groupIds).is("left_at",null);
 if(membersError)throw new Error(`CLOUD_GROUP_MEMBERS_FAILED:${membersError.message}`);
 const studentIds=[...new Set((members??[]).map(row=>String(row.student_id)))];
 let students:CloudStudent[]=[];
 if(studentIds.length){
  const {data,error}=await supabase.from("students").select("id,display_name,phone,email,school_name,school_grade,focus_notes,default_price_agorot,reminder_enabled,active").eq("business_id",businessId).eq("active",true).in("id",studentIds);
  if(error)throw new Error(`CLOUD_GROUP_STUDENTS_FAILED:${error.message}`);
  students=(data??[]).map(mapStudent);
 }
 const byId=new Map(students.map(student=>[student.id,student]));
 const idsByGroup=new Map<string,string[]>();
 for(const member of members??[]){const id=String(member.group_id);idsByGroup.set(id,[...(idsByGroup.get(id)??[]),String(member.student_id)]);}
 return (groups??[]).map(row=>{const memberIds=idsByGroup.get(String(row.id))??[];return{id:String(row.id),name:String(row.name),description:row.description?String(row.description):null,active:Boolean(row.active),memberIds,members:memberIds.map(id=>byId.get(id)).filter((student):student is CloudStudent=>Boolean(student))};});
}

export async function saveCloudStudentGroup(businessId:string,input:CloudStudentGroupInput):Promise<void>{
 const name=input.name.trim(),description=input.description?.trim()||null,studentIds=[...new Set(input.studentIds.filter(Boolean))];
 if(name.length<2||name.length>160)throw new Error("INVALID_GROUP_NAME");
 if((description?.length??0)>2000)throw new Error("INVALID_GROUP_DESCRIPTION");
 if(!studentIds.length)throw new Error("GROUP_REQUIRES_MEMBER");
 const {data:checked,error:checkedError}=await supabase.from("students").select("id").eq("business_id",businessId).eq("active",true).in("id",studentIds);
 if(checkedError||(checked??[]).length!==studentIds.length)throw new Error("GROUP_MEMBER_NOT_FOUND");
 let groupId=input.id;
 if(groupId){
  const {error}=await supabase.from("student_groups").update({name,description,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",groupId);
  if(error)throw new Error(`CLOUD_GROUP_SAVE_FAILED:${error.message}`);
 }else{
  const {data,error}=await supabase.from("student_groups").insert({business_id:businessId,name,description,active:true}).select("id").single();
  if(error||!data)throw new Error(`CLOUD_GROUP_SAVE_FAILED:${error?.message??"EMPTY"}`);
  groupId=String(data.id);
 }
 const {data:current,error:currentError}=await supabase.from("student_group_members").select("student_id").eq("business_id",businessId).eq("group_id",groupId).is("left_at",null);
 if(currentError)throw new Error(`CLOUD_GROUP_MEMBERS_FAILED:${currentError.message}`);
 const currentIds=new Set((current??[]).map(row=>String(row.student_id))),wantedIds=new Set(studentIds),now=new Date().toISOString();
 const remove=[...currentIds].filter(id=>!wantedIds.has(id));
 if(remove.length){const {error}=await supabase.from("student_group_members").update({left_at:now}).eq("business_id",businessId).eq("group_id",groupId).in("student_id",remove).is("left_at",null);if(error)throw new Error(`CLOUD_GROUP_MEMBER_REMOVE_FAILED:${error.message}`);}
 for(const studentId of studentIds.filter(id=>!currentIds.has(id))){
  const {data:existing,error:existingError}=await supabase.from("student_group_members").select("student_id").eq("business_id",businessId).eq("group_id",groupId).eq("student_id",studentId).maybeSingle();
  if(existingError)throw new Error(`CLOUD_GROUP_MEMBER_LOOKUP_FAILED:${existingError.message}`);
  const result=existing?await supabase.from("student_group_members").update({joined_at:now,left_at:null}).eq("business_id",businessId).eq("group_id",groupId).eq("student_id",studentId):await supabase.from("student_group_members").insert({business_id:businessId,group_id:groupId,student_id:studentId});
  if(result.error)throw new Error(`CLOUD_GROUP_MEMBER_SAVE_FAILED:${result.error.message}`);
 }
}

export async function archiveCloudStudentGroup(businessId:string,id:string):Promise<void>{
 const {data,error}=await supabase.from("student_groups").update({active:false,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",id).select("id").maybeSingle();
 if(error||!data)throw new Error(`CLOUD_GROUP_ARCHIVE_FAILED:${error?.message??"NOT_FOUND"}`);
}
