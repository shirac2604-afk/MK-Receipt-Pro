import {SyncEnvelope,SyncMutation,SyncResult,ReceiptNumberReservation} from "../domain/sync";
export interface SyncRepository{
 getDeviceId():Promise<string>;
 getPendingMutations():Promise<SyncMutation[]>;
 enqueueMutation(mutation:SyncMutation):Promise<void>;
 applySyncResult(result:SyncResult):Promise<void>;
 buildEnvelope():Promise<SyncEnvelope>;
 reserveReceiptNumber():Promise<ReceiptNumberReservation>;
}
