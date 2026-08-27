import {supabase} from "../../lib/supabase";

export type CloudStudent={
 id:string;displayName:string;phone:string|null;email:string|null;schoolName:string|null;schoolGrade:string|null;
 focusNotes:string|null;defaultPriceAgorot:number;active:boolean;
};

export type CloudStudentInput={
 id?:string;displayName:string;phone?:string;email?:string;schoolName?:string;schoolGrade?:string;focusNotes?:string;defaultPriceAgorot?:number;
};

const optional=(value:string|undefined,max:number)=>{const v=value?.trim()||"";if(v.length>max)throw new Error("STUDENT_FIELD_TOO_LONG");return v||null};
const phone=(value:string|null)=>{if(value&&!/^[0-9+()\- ]{6,20}$/.test(value))throw new Error("INVALID_STUDENT_PHONE");return value};
const email=(value:string|null)=>{if(value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error("INVALID_STUDENT_EMAIL");return value?.toLowerCase()??null};
const map=(row:any):CloudStudent=>({id:String(row.id),displayName:String(row.display_name),phone:row.phone?String(row.phone):null,email:row.email?String(row.email):null,schoolName:row.school_name?String(row.school_name):null,schoolGrade:row.school_grade?String(row.school_grade):null,focusNotes:row.focus_notes?String(row.focus_notes):null,defaultPriceAgorot:Number(row.default_price_agorot??0),active:Boolean(row.active)});

export async function listCloudStudents(businessId:string):Promise<CloudStudent[]>{
 const {data,error}=await supabase.from("students").select("id,display_name,phone,email,school_name,school_grade,focus_notes,default_price_agorot,active").eq("business_id",businessId).eq("active",true).order("display_name",{ascending:true});
 if(error)throw new Error(`CLOUD_STUDENTS_LIST_FAILED:${error.message}`);
 return (data??[]).map(map);
}

export async function saveCloudStudent(businessId:string,input:CloudStudentInput):Promise<CloudStudent>{
 const displayName=input.displayName.trim();
 if(displayName.length<2||displayName.length>160)throw new Error("INVALID_STUDENT_NAME");
 const amount=Math.max(0,Math.round(Number(input.defaultPriceAgorot??0)));
 if(!Number.isSafeInteger(amount)||amount>100_000_000)throw new Error("INVALID_STUDENT_PRICE");
 const payload={business_id:businessId,display_name:displayName,phone:phone(optional(input.phone,20)),email:email(optional(input.email,254)),school_name:optional(input.schoolName,160),school_grade:optional(input.schoolGrade,80),focus_notes:optional(input.focusNotes,4000),default_price_agorot:amount,active:true,updated_at:new Date().toISOString()};
 const query=input.id?supabase.from("students").update(payload).eq("business_id",businessId).eq("id",input.id):supabase.from("students").insert(payload);
 const {data,error}=await query.select("id,display_name,phone,email,school_name,school_grade,focus_notes,default_price_agorot,active").single();
 if(error||!data)throw new Error(`CLOUD_STUDENT_SAVE_FAILED:${error?.message??"EMPTY"}`);
 return map(data);
}

export async function archiveCloudStudent(businessId:string,id:string):Promise<void>{
 const {data,error}=await supabase.from("students").update({active:false,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",id).select("id").maybeSingle();
 if(error||!data)throw new Error(`CLOUD_STUDENT_ARCHIVE_FAILED:${error?.message??"NOT_FOUND"}`);
}