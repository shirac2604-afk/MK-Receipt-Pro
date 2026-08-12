import {supabase} from "../../lib/supabase";
import {getCloudDeviceId} from "./DeviceRepository";
import {formatUnknownError} from "../../services/ErrorFormatter";

export async function reserveReceiptNumber(businessId:string){
 const deviceId=await getCloudDeviceId();
 if(!deviceId)throw new Error("DEVICE_NOT_REGISTERED");
 const {data,error}=await supabase.rpc("reserve_receipt_number",{
  p_business_id:businessId,
  p_device_id:deviceId,
  p_ttl_minutes:15
 });
 if(error)throw new Error(formatUnknownError(error));
 const row=Array.isArray(data)?data[0]:data;
 if(!row)throw new Error("RECEIPT_RESERVATION_EMPTY_RESPONSE");
 return {
  reservationId:String(row.reservation_id),
  receiptNumber:Number(row.receipt_number),
  expiresAt:String(row.expires_at)
 };
}
