import {CloudConfig} from "../../config/cloud";
import {Customer,Expense} from "../../domain/types";
import {ReceiptNumberReservation} from "../../domain/sync";

type Json=Record<string,unknown>|unknown[];

export class CloudApiClient {
  constructor(private config:CloudConfig, private accessToken:string){}

  private headers(){
    return {
      "Content-Type":"application/json",
      "apikey":this.config.publicApiKey,
      "Authorization":`Bearer ${this.accessToken}`
    };
  }

  private async request<T>(path:string, init?:RequestInit):Promise<T>{
    const response=await fetch(`${this.config.apiBaseUrl}${path}`,{
      ...init,
      headers:{...this.headers(),...(init?.headers??{})}
    });
    if(!response.ok){
      const body=await response.text().catch(()=>"");
      throw new Error(`CLOUD_REQUEST_FAILED_${response.status}:${body.slice(0,180)}`);
    }
    if(response.status===204)return undefined as T;
    return await response.json() as T;
  }

  async listCustomers():Promise<Customer[]>{
    return this.request<Customer[]>(
      `/rest/v1/customers?business_id=eq.${encodeURIComponent(this.config.businessId)}&is_archived=eq.false&order=display_name.asc`
    );
  }

  async createCustomer(input:{displayName:string;phone?:string;email?:string;notes?:string}):Promise<Customer>{
    const rows=await this.request<Customer[]>("/rest/v1/customers",{
      method:"POST",
      headers:{"Prefer":"return=representation"},
      body:JSON.stringify({
        business_id:this.config.businessId,
        display_name:input.displayName,
        phone:input.phone||null,
        email:input.email||null,
        notes:input.notes||null
      })
    });
    if(!rows[0])throw new Error("CUSTOMER_CREATE_EMPTY_RESPONSE");
    return rows[0];
  }

  async listExpenses():Promise<Expense[]>{
    return this.request<Expense[]>(
      `/rest/v1/expenses?business_id=eq.${encodeURIComponent(this.config.businessId)}&order=expense_date.desc`
    );
  }

  async createExpense(input:{
    expenseDate:string;supplierName:string;amountAgorot:number;category:string;
    paymentMethod?:string;notes?:string;
  }):Promise<Expense>{
    const rows=await this.request<Expense[]>("/rest/v1/expenses",{
      method:"POST",
      headers:{"Prefer":"return=representation"},
      body:JSON.stringify({
        business_id:this.config.businessId,
        expense_date:input.expenseDate,
        supplier_name:input.supplierName,
        amount_agorot:input.amountAgorot,
        category:input.category,
        payment_method:input.paymentMethod||null,
        notes:input.notes||null
      })
    });
    if(!rows[0])throw new Error("EXPENSE_CREATE_EMPTY_RESPONSE");
    return rows[0];
  }

  async reserveReceiptNumber(deviceId:string):Promise<ReceiptNumberReservation>{
    const rows=await this.request<Array<{
      reservation_id:string;receipt_number:number;expires_at:string;
    }>>("/rest/v1/rpc/reserve_receipt_number",{
      method:"POST",
      body:JSON.stringify({
        p_business_id:this.config.businessId,
        p_device_id:deviceId,
        p_ttl_minutes:15
      })
    });
    const row=rows[0];
    if(!row)throw new Error("RECEIPT_RESERVATION_EMPTY_RESPONSE");
    return {
      reservationId:row.reservation_id,
      receiptNumber:Number(row.receipt_number),
      expiresAt:row.expires_at
    };
  }
}
