export type PaymentMethod = "cash" | "bank_transfer" | "bit" | "paybox";
export type ReceiptStatus = "active" | "cancelled";
export type ExpenseCategory = "ציוד" | "פרסום" | "משרד" | "נסיעות" | "תוכנה" | "הכשרה" | "אחר";

export interface BusinessSettings {
  businessName:string; ownerName:string; businessNumber:string; taxStatus:"עוסק פטור"|"עוסק מורשה";
  phone?:string; email?:string; address?:string; slogan?:string; brandColor?:string;
}
export interface Customer {
  id:string; displayName:string; phone:string|null; email:string|null; notes:string|null;
  createdAt:string; updatedAt:string;
}
export interface Receipt {
  id:string; receiptNumber:number; paymentDate:string; issuedAt:string; clientName:string;
  description:string; amountAgorot:number; paymentMethod:PaymentMethod; status:ReceiptStatus;
  clientPhone?:string|null; clientEmail?:string|null; referenceNumber?:string|null;
  originalPdfPath?:string|null; cancellationPdfPath?:string|null;
  cancelledAt?:string|null; cancellationReason?:string|null;
}
export interface Expense {
  id:string; expenseDate:string; supplierName:string; amountAgorot:number; category:string;
  paymentMethod:string|null; notes:string|null; attachmentPath:string|null;
  attachmentOriginalName:string|null; createdAt:string; updatedAt:string;
}
export interface ReceiptTemplate {
  id:string; name:string; customerId:string|null; description:string;
  amountAgorot:number; paymentMethod:PaymentMethod; createdAt:string; updatedAt:string;
}
export interface CloudSyncStatus {
  connected:boolean; state:"disconnected"|"idle"|"syncing"|"conflict"|"error";
  accountEmail:string|null; lastSyncAt:string|null; message:string|null; deviceId:string;
}
