import {supabase} from "../../lib/supabase";
import type {Customer,Expense} from "../../domain/types";

function mapCustomer(row:any):Customer{
 return {
  id:row.id,displayName:row.display_name,phone:row.phone,email:row.email,notes:row.notes,
  createdAt:row.created_at,updatedAt:row.updated_at
 };
}
function mapExpense(row:any):Expense{
 return {
  id:row.id,expenseDate:row.expense_date,supplierName:row.supplier_name,
  amountAgorot:Number(row.amount_agorot),category:row.category,paymentMethod:row.payment_method,
  notes:row.notes,attachmentPath:row.attachment_storage_key,
  attachmentOriginalName:row.attachment_original_name,
  createdAt:row.created_at,updatedAt:row.updated_at
 };
}

export class LiveDataRepository{
 constructor(private businessId:string){}

 async customers():Promise<Customer[]>{
  const {data,error}=await supabase.from("customers")
   .select("*").eq("business_id",this.businessId).eq("is_archived",false)
   .order("display_name",{ascending:true});
  if(error)throw error;
  return (data??[]).map(mapCustomer);
 }

 async addCustomer(input:{displayName:string;phone?:string;email?:string;notes?:string}){
  const {data,error}=await supabase.from("customers").insert({
   business_id:this.businessId,
   display_name:input.displayName.trim(),
   phone:input.phone?.trim()||null,
   email:input.email?.trim().toLowerCase()||null,
   notes:input.notes?.trim()||null
  }).select("*").single();
  if(error)throw error;
  return mapCustomer(data);
 }

 async expenses():Promise<Expense[]>{
  const {data,error}=await supabase.from("expenses").select("*")
   .eq("business_id",this.businessId)
   .order("expense_date",{ascending:false});
  if(error)throw error;
  return (data??[]).map(mapExpense);
 }

 async addExpense(input:{expenseDate:string;supplierName:string;amountAgorot:number;category:string;paymentMethod?:string;notes?:string}){
  const {data,error}=await supabase.from("expenses").insert({
   business_id:this.businessId,
   expense_date:input.expenseDate,
   supplier_name:input.supplierName.trim(),
   amount_agorot:input.amountAgorot,
   category:input.category,
   payment_method:input.paymentMethod||null,
   notes:input.notes?.trim()||null
  }).select("*").single();
  if(error)throw error;
  return mapExpense(data);
 }


 async setExpenseAttachment(expenseId:string,storageKey:string,originalName:string){
  const {data,error}=await supabase.from("expenses")
   .update({
     attachment_storage_key:storageKey,
     attachment_original_name:originalName,
     updated_at:new Date().toISOString()
   })
   .eq("business_id",this.businessId)
   .eq("id",expenseId)
   .select("*")
   .single();
  if(error)throw error;
  return mapExpense(data);
 }
}
