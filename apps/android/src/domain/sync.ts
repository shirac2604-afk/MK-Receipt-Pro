export type EntityType="receipt"|"customer"|"expense"|"receipt_template"|"business_settings";
export type MutationKind="create"|"update"|"cancel";
export interface SyncMutation<T=unknown>{mutationId:string;deviceId:string;entityType:EntityType;entityId:string;kind:MutationKind;baseRevision:number|null;payload:T;createdAt:string;}
export interface SyncEnvelope{protocolVersion:1;deviceId:string;lastServerRevision:number;mutations:SyncMutation[];}
export interface SyncResult{serverRevision:number;acceptedMutationIds:string[];conflicts:Array<{mutationId:string;entityType:EntityType;entityId:string;reason:string;}>;}
export interface ReceiptNumberReservation{reservationId:string;receiptNumber:number;expiresAt:string;}
