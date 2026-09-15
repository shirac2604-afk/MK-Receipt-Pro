import {supabase} from "../../lib/supabase";

export type SubscriptionStatus = "trialing"|"active"|"past_due"|"suspended"|"cancelled";
export type AccessMode = "full"|"read_only";

export interface BusinessSubscription {
  planKey:string;
  status:SubscriptionStatus;
  expiresAt:string|null;
  graceEndsAt:string|null;
  accessMode:AccessMode;
}

export async function provisionMyBusiness():Promise<string>{
  const {data,error}=await supabase.rpc("provision_my_business");
  if(error)throw error;
  if(typeof data!=="string"||!data)throw new Error("BUSINESS_PROVISION_FAILED");
  return data;
}

export async function getBusinessSubscription(businessId:string):Promise<BusinessSubscription>{
  const {data,error}=await supabase.from("business_subscriptions")
    .select("plan_key,status,expires_at,grace_ends_at")
    .eq("business_id",businessId)
    .single();
  if(error)throw error;

  const status=data.status as SubscriptionStatus;
  const now=Date.now();
  const expiresAt=data.expires_at as string|null;
  const hasExpired=expiresAt!==null&&Date.parse(expiresAt)<=now;
  const accessMode:AccessMode=(status==="trialing"||status==="active")&&!hasExpired?"full":"read_only";

  return {
    planKey:data.plan_key as string,
    status,
    expiresAt,
    graceEndsAt:data.grace_ends_at as string|null,
    accessMode
  };
}
