import {CloudApiClient} from "../data/cloud/CloudApiClient";

export class SharedDataService{
  constructor(private api:CloudApiClient){}

  customers(){
    return this.api.listCustomers();
  }

  addCustomer(input:{displayName:string;phone?:string;email?:string;notes?:string}){
    if(!input.displayName.trim())throw new Error("CUSTOMER_NAME_REQUIRED");
    return this.api.createCustomer({...input,displayName:input.displayName.trim()});
  }

  expenses(){
    return this.api.listExpenses();
  }

  addExpense(input:{expenseDate:string;supplierName:string;amountAgorot:number;category:string;paymentMethod?:string;notes?:string}){
    if(!input.supplierName.trim() || input.amountAgorot<=0)throw new Error("EXPENSE_INPUT_INVALID");
    return this.api.createExpense({...input,supplierName:input.supplierName.trim()});
  }
}
