import type {SupabaseCloudService} from "./SupabaseCloudService";
import type {PaymentMethod} from "../../../../packages/database/src/types";

export interface AtomicLessonReceiptResult{
  receiptId:string;
  receiptNumber:number;
  issuedAt:string|null;
  customerId:string;
  clientName:string;
  clientPhone:string|null;
  clientEmail:string|null;
  description:string;
  amountAgorot:number;
  paymentDate:string;
  paymentMethod:PaymentMethod;
  referenceNumber:string;
}

export class LessonReceiptCloudService{
  constructor(private readonly cloud:SupabaseCloudService){}
  async issue(participantId:string):Promise<AtomicLessonReceiptResult>{
    const status=this.cloud.getStatus();
    if(!status.connected||!status.businessId||!status.deviceId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_LESSON_RECEIPT");
    const{data,error}=await this.cloud.getClient().rpc("issue_lesson_receipt",{p_participant_id:participantId,p_device_id:status.deviceId});
    if(error)throw new Error(`CLOUD_LESSON_RECEIPT_FAILED:${error.message}`);
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.receipt_id||!row?.receipt_number||!row?.customer_id)throw new Error("CLOUD_LESSON_RECEIPT_EMPTY");
    return{receiptId:String(row.receipt_id),receiptNumber:Number(row.receipt_number),issuedAt:row.issued_at?String(row.issued_at):null,customerId:String(row.customer_id),clientName:String(row.client_name??""),clientPhone:row.client_phone?String(row.client_phone):null,clientEmail:row.client_email?String(row.client_email):null,description:String(row.description??""),amountAgorot:Number(row.amount_agorot??0),paymentDate:String(row.payment_date),paymentMethod:String(row.payment_method) as PaymentMethod,referenceNumber:String(row.reference_number??"")};
  }
  async recordWarning(participantId:string,message:string):Promise<void>{
    const status=this.cloud.getStatus();if(!status.connected||!status.businessId)return;
    await this.cloud.getClient().from("lesson_participants").update({receipt_error:message.slice(0,1000),updated_at:new Date().toISOString()}).eq("business_id",status.businessId).eq("id",participantId);
  }
}
