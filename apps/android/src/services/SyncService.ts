import {SyncRepository} from "../data/SyncRepository";
import {SyncResult} from "../domain/sync";
export interface SyncTransport{pushAndPull(payload:unknown):Promise<SyncResult>;}
export class SyncService{
 constructor(private repo:SyncRepository,private transport:SyncTransport){}
 async syncNow(){const envelope=await this.repo.buildEnvelope();const result=await this.transport.pushAndPull(envelope);await this.repo.applySyncResult(result);return result;}
 async reserveReceiptNumber(){return this.repo.reserveReceiptNumber();}
}
