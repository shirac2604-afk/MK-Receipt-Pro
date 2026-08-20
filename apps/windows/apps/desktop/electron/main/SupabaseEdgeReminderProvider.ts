import type {SupabaseClient} from "@supabase/supabase-js";
import type {ReminderChannel} from "../../../../packages/database/src/studentTypes";
import type {ReminderDeliveryRequest,ReminderDeliveryResult,ReminderProvider} from "./ReminderDispatchService";

interface EdgeFunctionResponse {
  ok?:boolean;
  error?:string;
  provider?:string;
  providerMessageId?:string;
}

export class SupabaseEdgeReminderProvider implements ReminderProvider {
  readonly id="supabase-edge-meta-whatsapp";
  readonly configured:boolean;
  private readonly client:SupabaseClient;

  constructor(client:SupabaseClient,enabled:boolean){this.client=client;this.configured=enabled;}
  supports(channel:ReminderChannel):boolean{return channel==="whatsapp";}

  async send(request:ReminderDeliveryRequest):Promise<ReminderDeliveryResult>{
    if(!this.configured)return{success:false,errorCode:"REMINDER_PROVIDER_NOT_CONFIGURED"};
    const r=request.reminder;
    // The server resolves every recipient and message field from the claimed reminder.
    // The desktop client may only nominate a reminder it has already claimed through RLS.
    const{data,error}=await this.client.functions.invoke<EdgeFunctionResponse>("lesson-reminder-dispatch",{body:{reminderId:r.reminderId}});
    if(error){
      const message=String(error.message||"");
      if(message.includes("503"))return{success:false,errorCode:"REMINDER_PROVIDER_NOT_CONFIGURED"};
      return{success:false,errorCode:"REMINDER_EDGE_FUNCTION_FAILED"};
    }
    if(data?.ok===true&&typeof data.providerMessageId==="string")return{success:true,providerMessageId:data.providerMessageId};
    return{success:false,errorCode:typeof data?.error==="string"?data.error:"REMINDER_PROVIDER_RESPONSE_INVALID"};
  }
}
