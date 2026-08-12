import {SyncService} from "./SyncService";
export class ReceiptIssuanceGuard{
 constructor(private sync:SyncService){}
 async prepareIssue(){
  const reservation=await this.sync.reserveReceiptNumber();
  if(!reservation?.receiptNumber)throw new Error("RECEIPT_NUMBER_RESERVATION_REQUIRED");
  return reservation;
 }
}
