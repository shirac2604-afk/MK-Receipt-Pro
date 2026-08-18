import type {SupabaseClient} from "@supabase/supabase-js";
import type {SupabaseCloudService} from "./SupabaseCloudService";
import {LessonReminderCloudService} from "./LessonReminderCloudService";
import type {ClaimedLessonReminder,ReminderChannel} from "../../../../packages/database/src/studentTypes";
import type {LessonReminderHistoryItem} from "../../../../packages/database/src/reminderHistoryTypes";
import {buildLessonReminderMessage} from "../../../../packages/database/src/lessonReminderMessage";

export interface ReminderDeliveryRequest {
  reminder: ClaimedLessonReminder;
  subject: string;
  text: string;
}

export interface ReminderDeliveryResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
}

export interface ReminderProvider {
  readonly id: string;
  readonly configured: boolean;
  supports(channel:ReminderChannel):boolean;
  send(request:ReminderDeliveryRequest):Promise<ReminderDeliveryResult>;
}

export class DisabledReminderProvider implements ReminderProvider {
  readonly id="disabled";
  readonly configured=false;
  supports():boolean{return false;}
  async send():Promise<ReminderDeliveryResult>{return{success:false,errorCode:"REMINDER_PROVIDER_NOT_CONFIGURED"};}
}

export interface ReminderDispatchSummary {
  providerId:string;
  configured:boolean;
  claimed:number;
  sent:number;
  failed:number;
  skipped:number;
}

export class ReminderDispatchService {
  private readonly cloud:SupabaseCloudService;
  private readonly client:SupabaseClient;
  private readonly history:LessonReminderCloudService;
  private provider:ReminderProvider;
  private running=false;

  constructor(cloud:SupabaseCloudService,provider:ReminderProvider=new DisabledReminderProvider()){
    this.cloud=cloud;
    this.client=cloud.getClient();
    this.history=new LessonReminderCloudService(cloud);
    this.provider=provider;
  }

  setProvider(provider:ReminderProvider):void{this.provider=provider;}
  getStatus(){return{providerId:this.provider.id,configured:this.provider.configured,running:this.running};}
  listRecent(limit=50):Promise<LessonReminderHistoryItem[]>{return this.history.listRecent(limit);}
  retryFailed(reminderId:string):Promise<void>{return this.history.retryFailed(reminderId);}

  private requireBusinessId():string{
    const status=this.cloud.getStatus();
    if(!status.connected||!status.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_REMINDERS");
    return status.businessId;
  }

  async dispatchDue(limit=20):Promise<ReminderDispatchSummary>{
    const provider=this.provider;
    if(!provider.configured)return{providerId:provider.id,configured:false,claimed:0,sent:0,failed:0,skipped:0};
    if(this.running)return{providerId:provider.id,configured:true,claimed:0,sent:0,failed:0,skipped:0};
    this.running=true;
    try{
      this.requireBusinessId();
      const staleResult=await this.client.rpc("release_stale_lesson_reminders");
      if(staleResult.error)throw new Error(`REMINDER_STALE_RELEASE_FAILED:${staleResult.error.message}`);
      const{data,error}=await this.client.rpc("claim_due_lesson_reminders",{p_limit:Math.max(1,Math.min(100,Math.trunc(limit)))});
      if(error)throw new Error(`REMINDER_CLAIM_FAILED:${error.message}`);
      const reminders=(data??[]) as ClaimedLessonReminder[];
      let sent=0,failed=0,skipped=0;
      for(const reminder of reminders){
        if(!provider.supports(reminder.channel)){
          skipped++;
          await this.finish(reminder.reminderId,false,"REMINDER_CHANNEL_NOT_SUPPORTED");
          continue;
        }
        try{
          const message=buildLessonReminderMessage(reminder);
          const result=await provider.send({reminder,subject:message.subject,text:message.text});
          if(result.success){sent++;await this.finish(reminder.reminderId,true,null);}else{failed++;await this.finish(reminder.reminderId,false,result.errorCode??"REMINDER_PROVIDER_SEND_FAILED");}
        }catch(error){failed++;await this.finish(reminder.reminderId,false,error instanceof Error?error.message:"REMINDER_PROVIDER_SEND_FAILED");}
      }
      return{providerId:provider.id,configured:true,claimed:reminders.length,sent,failed,skipped};
    }finally{this.running=false;}
  }

  private async finish(reminderId:string,success:boolean,errorCode:string|null):Promise<void>{
    this.requireBusinessId();
    const{error}=await this.client.rpc("finish_lesson_reminder",{p_reminder_id:reminderId,p_success:success,p_error:errorCode});
    if(error)throw new Error(`REMINDER_FINISH_FAILED:${error.message}`);
  }
}
