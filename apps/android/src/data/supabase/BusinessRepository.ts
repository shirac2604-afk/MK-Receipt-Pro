import {supabase} from "../../lib/supabase";
import {getBusinessLogoDataUrl} from "../../services/BusinessBrandingService";

export interface BusinessMembership{
 business_id:string;
 role:"owner"|"admin"|"member";
}

export interface BusinessProfile{
 id:string;
 businessName:string;
 ownerName:string;
 businessNumber:string;
 taxStatus:"עוסק פטור"|"עוסק מורשה";
 phone:string|null;
 email:string|null;
 address:string|null;
 slogan:string|null;
 logoStorageKey:string|null;
 logoDataUrl:string|null;
}

export async function getMyBusiness():Promise<BusinessMembership>{
 const {data,error}=await supabase.from("business_members")
  .select("business_id,role").limit(1).maybeSingle();
 if(error)throw error;
 if(!data)throw new Error("NO_BUSINESS_MEMBERSHIP");
 return data as BusinessMembership;
}

export async function getBusinessProfile(businessId:string):Promise<BusinessProfile>{
 const {data,error}=await supabase.from("businesses")
   .select("id,business_name,owner_name,business_number,tax_status,phone,email,address,slogan,logo_storage_key")
   .eq("id",businessId).single();
 if(error)throw error;
 let logoDataUrl:string|null=null;
 try{logoDataUrl=await getBusinessLogoDataUrl(data.logo_storage_key)}catch{logoDataUrl=null}
 return {
   id:data.id,
   businessName:data.business_name,
   ownerName:data.owner_name,
   businessNumber:data.business_number,
   taxStatus:data.tax_status,
   phone:data.phone,
   email:data.email,
   address:data.address,
   slogan:data.slogan,
   logoStorageKey:data.logo_storage_key,
   logoDataUrl
 };
}

export async function updateBusinessProfile(businessId:string,input:{
 businessName:string;ownerName:string;businessNumber:string;
 taxStatus:"עוסק פטור"|"עוסק מורשה";phone?:string;email?:string;address?:string;slogan?:string;
}){
 const {error}=await supabase.from("businesses").update({
   business_name:input.businessName.trim(),
   owner_name:input.ownerName.trim(),
   business_number:input.businessNumber.trim(),
   tax_status:input.taxStatus,
   phone:input.phone?.trim()||null,
   email:input.email?.trim().toLowerCase()||null,
   address:input.address?.trim()||null,
   slogan:input.slogan?.trim()||null,
   updated_at:new Date().toISOString()
 }).eq("id",businessId);
 if(error)throw error;
}
