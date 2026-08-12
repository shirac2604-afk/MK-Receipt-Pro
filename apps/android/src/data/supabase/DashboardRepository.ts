import {supabase} from "../../lib/supabase";

export interface DashboardSnapshot{
  receiptsCount:number;
  incomeAgorot:number;
  expensesCount:number;
  expensesAgorot:number;
  customersCount:number;
  nextReceiptNumber:number;
  devicesCount:number;
}

export async function getDashboardSnapshot(businessId:string):Promise<DashboardSnapshot>{
  const [receiptsResult,expensesResult,customersResult,sequenceResult,devicesResult]=await Promise.all([
    supabase.from("receipts")
      .select("amount_agorot,status")
      .eq("business_id",businessId),
    supabase.from("expenses")
      .select("amount_agorot")
      .eq("business_id",businessId),
    supabase.from("customers")
      .select("id",{count:"exact",head:true})
      .eq("business_id",businessId)
      .eq("is_archived",false),
    supabase.from("receipt_sequences")
      .select("next_number")
      .eq("business_id",businessId)
      .maybeSingle(),
    supabase.from("devices")
      .select("id",{count:"exact",head:true})
      .eq("business_id",businessId)
  ]);

  if(receiptsResult.error)throw receiptsResult.error;
  if(expensesResult.error)throw expensesResult.error;
  if(customersResult.error)throw customersResult.error;
  if(sequenceResult.error)throw sequenceResult.error;
  if(devicesResult.error)throw devicesResult.error;

  const activeReceipts=(receiptsResult.data??[]).filter((r:any)=>r.status!=="cancelled");
  return {
    receiptsCount:activeReceipts.length,
    incomeAgorot:activeReceipts.reduce((sum:number,r:any)=>sum+Number(r.amount_agorot||0),0),
    expensesCount:(expensesResult.data??[]).length,
    expensesAgorot:(expensesResult.data??[]).reduce((sum:number,e:any)=>sum+Number(e.amount_agorot||0),0),
    customersCount:customersResult.count??0,
    nextReceiptNumber:Number(sequenceResult.data?.next_number??1001),
    devicesCount:devicesResult.count??0
  };
}
