import * as SecureStore from "expo-secure-store";
import {SyncRepository} from "../SyncRepository";
import {SyncEnvelope,SyncMutation,SyncResult} from "../../domain/sync";
import {CloudApiClient} from "./CloudApiClient";

const DEVICE_ID_KEY="mk_device_id";
const SERVER_REV_KEY="mk_server_revision";
const MUTATION_QUEUE_KEY="mk_mutation_queue";

function uuid(){
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
    const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}

export class CloudSyncRepository implements SyncRepository{
  constructor(private api:CloudApiClient){}

  async getDeviceId(){
    let id=await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if(!id){
      id=uuid();
      await SecureStore.setItemAsync(DEVICE_ID_KEY,id);
    }
    return id;
  }

  async getPendingMutations():Promise<SyncMutation[]>{
    const raw=await SecureStore.getItemAsync(MUTATION_QUEUE_KEY);
    if(!raw)return [];
    try{return JSON.parse(raw) as SyncMutation[];}catch{return [];}
  }

  async enqueueMutation(mutation:SyncMutation){
    const items=await this.getPendingMutations();
    items.push(mutation);
    await SecureStore.setItemAsync(MUTATION_QUEUE_KEY,JSON.stringify(items));
  }

  async applySyncResult(result:SyncResult){
    const pending=await this.getPendingMutations();
    const accepted=new Set(result.acceptedMutationIds);
    const remaining=pending.filter(item=>!accepted.has(item.mutationId));
    await SecureStore.setItemAsync(MUTATION_QUEUE_KEY,JSON.stringify(remaining));
    await SecureStore.setItemAsync(SERVER_REV_KEY,String(result.serverRevision));
  }

  async buildEnvelope():Promise<SyncEnvelope>{
    const deviceId=await this.getDeviceId();
    const pending=await this.getPendingMutations();
    const rev=Number(await SecureStore.getItemAsync(SERVER_REV_KEY)??"0");
    return {protocolVersion:1,deviceId,lastServerRevision:rev,mutations:pending};
  }

  async reserveReceiptNumber(){
    const deviceId=await this.getDeviceId();
    return this.api.reserveReceiptNumber(deviceId);
  }
}
