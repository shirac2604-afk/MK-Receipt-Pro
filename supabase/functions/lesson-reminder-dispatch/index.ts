import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

interface ReminderPayload {reminderId:string;}
interface ReminderRow {id:string;business_id:string;lesson_id:string;student_id:string;guardian_id:string|null;audience:"student"|"guardian";channel:"whatsapp"|"sms"|"email"|"in_app";status:string;}
interface StudentRow {display_name:string;phone:string|null;reminder_enabled:boolean;active:boolean;}
interface GuardianRow {display_name:string;phone:string|null;receives_reminders:boolean;}
interface LessonRow {title:string;starts_at:string;status:string;}

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
function digits(value:string){return value.replace(/\D/g,"")}
function isUuid(value:unknown):value is string{return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}

function readPublishableKey():string|null{
  const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if(raw){try{const parsed=JSON.parse(raw);if(typeof parsed?.default==="string"&&parsed.default)return parsed.default;}catch{console.warn("[lesson-reminder-dispatch] publishable key configuration is invalid");}}
  const legacy=Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  return legacy||null;
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"});
  const authorization=req.headers.get("authorization")?.trim()||"";
  if(!authorization.startsWith("Bearer "))return json(401,{ok:false,error:"AUTHENTICATION_REQUIRED"});

  let payload:ReminderPayload;
  try{payload=await req.json()}catch{return json(400,{ok:false,error:"INVALID_JSON"})}
  if(!isUuid(payload?.reminderId))return json(400,{ok:false,error:"INVALID_REMINDER_ID"});

  const url=Deno.env.get("SUPABASE_URL")?.trim();
  const publishableKey=readPublishableKey();
  if(!url||!publishableKey)return json(503,{ok:false,error:"FUNCTION_AUTH_NOT_CONFIGURED"});
  const client=createClient(url,publishableKey,{global:{headers:{Authorization:authorization}}});
  const token=authorization.slice("Bearer ".length);
  const{data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user)return json(401,{ok:false,error:"AUTHENTICATION_INVALID"});

  const{data:reminder,error:reminderError}=await client.from("lesson_reminders")
    .select("id,business_id,lesson_id,student_id,guardian_id,audience,channel,status")
    .eq("id",payload.reminderId).eq("status","sending").maybeSingle<ReminderRow>();
  if(reminderError){console.warn("[lesson-reminder-dispatch] reminder lookup failed",reminderError.code);return json(500,{ok:false,error:"REMINDER_LOOKUP_FAILED"});}
  if(!reminder)return json(404,{ok:false,error:"REMINDER_NOT_FOUND_OR_NOT_CLAIMED"});
  if(reminder.channel!=="whatsapp")return json(409,{ok:false,error:"CHANNEL_NOT_CONFIGURED"});

  const[studentResult,lessonResult]=await Promise.all([
    client.from("students").select("display_name,phone,reminder_enabled,active").eq("business_id",reminder.business_id).eq("id",reminder.student_id).maybeSingle<StudentRow>(),
    client.from("lessons").select("title,starts_at,status").eq("business_id",reminder.business_id).eq("id",reminder.lesson_id).maybeSingle<LessonRow>()
  ]);
  if(studentResult.error||lessonResult.error){console.warn("[lesson-reminder-dispatch] recipient lookup failed");return json(500,{ok:false,error:"REMINDER_CONTEXT_LOOKUP_FAILED"});}
  const student=studentResult.data,lesson=lessonResult.data;
  if(!student||!lesson)return json(404,{ok:false,error:"REMINDER_CONTEXT_NOT_FOUND"});
  if(!student.active||!student.reminder_enabled)return json(409,{ok:false,error:"STUDENT_REMINDERS_DISABLED"});
  if(lesson.status!=="scheduled")return json(409,{ok:false,error:"LESSON_NOT_SCHEDULED"});

  let recipientName=student.display_name,recipientPhone=student.phone;
  if(reminder.audience==="guardian"){
    if(!reminder.guardian_id)return json(409,{ok:false,error:"GUARDIAN_NOT_CONFIGURED"});
    const{data:guardian,error:guardianError}=await client.from("student_guardians")
      .select("display_name,phone,receives_reminders").eq("business_id",reminder.business_id).eq("id",reminder.guardian_id).maybeSingle<GuardianRow>();
    if(guardianError){console.warn("[lesson-reminder-dispatch] guardian lookup failed",guardianError.code);return json(500,{ok:false,error:"GUARDIAN_LOOKUP_FAILED"});}
    if(!guardian||!guardian.receives_reminders)return json(409,{ok:false,error:"GUARDIAN_REMINDERS_DISABLED"});
    recipientName=guardian.display_name;recipientPhone=guardian.phone;
  }

  const to=recipientPhone?digits(recipientPhone):"";
  if(to.length<8||to.length>15)return json(400,{ok:false,error:"INVALID_RECIPIENT_PHONE"});
  const starts=new Date(lesson.starts_at);
  if(Number.isNaN(starts.getTime()))return json(400,{ok:false,error:"INVALID_LESSON_DATE"});

  const metaToken=Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  const graphVersion=Deno.env.get("WHATSAPP_GRAPH_VERSION")?.trim();
  const templateName=Deno.env.get("WHATSAPP_REMINDER_TEMPLATE")?.trim();
  const templateLanguage=Deno.env.get("WHATSAPP_REMINDER_LANGUAGE")?.trim()||"he";
  if(!metaToken||!phoneNumberId||!graphVersion||!templateName)return json(503,{ok:false,error:"PROVIDER_NOT_CONFIGURED"});

  const dateText=new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Jerusalem"}).format(starts);
  const metaUrl=`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const body={messaging_product:"whatsapp",to,type:"template",template:{name:templateName,language:{code:templateLanguage},components:[{type:"body",parameters:[
    {type:"text",text:recipientName.slice(0,160)},
    {type:"text",text:student.display_name.slice(0,160)},
    {type:"text",text:lesson.title.slice(0,160)},
    {type:"text",text:dateText.slice(0,80)}
  ]}]}};

  let response:Response;
  try{response=await fetch(metaUrl,{method:"POST",headers:{authorization:`Bearer ${metaToken}`,"content-type":"application/json"},body:JSON.stringify(body),redirect:"error"});}
  catch{return json(502,{ok:false,error:"PROVIDER_NETWORK_ERROR"})}
  const raw=await response.text();
  if(!response.ok){console.warn("[lesson-reminder-dispatch] Meta rejected message",response.status);return json(502,{ok:false,error:"PROVIDER_REJECTED",status:response.status});}
  let parsed:unknown={};try{parsed=JSON.parse(raw)}catch{}
  const providerMessageId=(parsed as {messages?:Array<{id?:unknown}>})?.messages?.[0]?.id;
  if(typeof providerMessageId!=="string"||providerMessageId.length<3)return json(502,{ok:false,error:"PROVIDER_RESPONSE_INVALID"});
  return json(200,{ok:true,provider:"meta_whatsapp_cloud",providerMessageId});
});
