import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ReminderPayload {
  reminderId:string;
  channel:"whatsapp"|"sms"|"email"|"in_app";
  recipientPhone?:string|null;
  recipientEmail?:string|null;
  recipientName:string;
  studentName:string;
  lessonTitle:string;
  lessonStartsAt:string;
}

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
function digits(value:string){return value.replace(/\D/g,"")}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"});
  let payload:ReminderPayload;
  try{payload=await req.json()}catch{return json(400,{ok:false,error:"INVALID_JSON"})}
  if(!payload?.reminderId||!payload.studentName||!payload.recipientName||!payload.lessonTitle||!payload.lessonStartsAt)return json(400,{ok:false,error:"INVALID_REMINDER_PAYLOAD"});
  if(payload.channel!=="whatsapp")return json(409,{ok:false,error:"CHANNEL_NOT_CONFIGURED"});

  const token=Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  const graphVersion=Deno.env.get("WHATSAPP_GRAPH_VERSION")?.trim();
  const templateName=Deno.env.get("WHATSAPP_REMINDER_TEMPLATE")?.trim();
  const templateLanguage=Deno.env.get("WHATSAPP_REMINDER_LANGUAGE")?.trim()||"he";
  if(!token||!phoneNumberId||!graphVersion||!templateName)return json(503,{ok:false,error:"PROVIDER_NOT_CONFIGURED"});
  const to=payload.recipientPhone?digits(payload.recipientPhone):"";
  if(to.length<8||to.length>15)return json(400,{ok:false,error:"INVALID_RECIPIENT_PHONE"});
  const starts=new Date(payload.lessonStartsAt);
  if(Number.isNaN(starts.getTime()))return json(400,{ok:false,error:"INVALID_LESSON_DATE"});

  const dateText=new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Jerusalem"}).format(starts);
  const url=`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const body={
    messaging_product:"whatsapp",
    to,
    type:"template",
    template:{
      name:templateName,
      language:{code:templateLanguage},
      components:[{type:"body",parameters:[
        {type:"text",text:payload.recipientName.slice(0,160)},
        {type:"text",text:payload.studentName.slice(0,160)},
        {type:"text",text:payload.lessonTitle.slice(0,160)},
        {type:"text",text:dateText.slice(0,80)}
      ]}]
    }
  };

  let response:Response;
  try{response=await fetch(url,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(body),redirect:"error"})}
  catch{return json(502,{ok:false,error:"PROVIDER_NETWORK_ERROR"})}
  const raw=await response.text();
  if(!response.ok){console.warn("[lesson-reminder-dispatch] Meta error",response.status,raw.slice(0,500));return json(502,{ok:false,error:"PROVIDER_REJECTED",status:response.status})}
  let parsed:any={};try{parsed=JSON.parse(raw)}catch{}
  const providerMessageId=parsed?.messages?.[0]?.id;
  if(typeof providerMessageId!=="string"||providerMessageId.length<3)return json(502,{ok:false,error:"PROVIDER_RESPONSE_INVALID"});
  return json(200,{ok:true,provider:"meta_whatsapp_cloud",providerMessageId});
});
