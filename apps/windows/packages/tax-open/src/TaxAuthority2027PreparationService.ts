import crypto from "node:crypto";
import type {
  TaxAuthorityFileStatusResponseItem,
  TaxAuthorityUploadFileDescriptor,
  TaxAuthorityUploadLinksRequest,
  TaxAuthorityUploadLinksResponse,
} from "./TaxAuthorityApi2027";
import type {
  TaxAuthorityResumableUploadResult,
  TaxAuthorityUploadPayload,
} from "./TaxAuthorityApi2027Client";

export type PreparedTransmissionStatus="Pending"|"Uploaded"|"Approved"|"Rejected"|"Error";
export type PreparedTransmissionFileKind="INI"|"BKM"|"OTHER";

export interface TaxAuthority2027ApiPort {
  requestUploadLinks(input:TaxAuthorityUploadLinksRequest):Promise<TaxAuthorityUploadLinksResponse>;
  uploadFile(descriptor:TaxAuthorityUploadFileDescriptor,payload:TaxAuthorityUploadPayload):Promise<TaxAuthorityResumableUploadResult>;
  getFileStatuses(items:Array<{fileName:string}>):Promise<TaxAuthorityFileStatusResponseItem[]>;
}

export interface TaxAuthority2027PersistencePort {
  create(input:{
    id:string;
    environment:"sandbox"|"production";
    caseNumber:string;
    startPeriod:string;
    endPeriod:string;
    transmissionUniqueId?:string|null;
    fileUniqueId:string;
    fileName:string;
    fileKind:PreparedTransmissionFileKind;
  }):unknown;
  updateStatus(input:{
    fileUniqueId:string;
    status:PreparedTransmissionStatus;
    description?:string;
    errorCode?:number|null;
    errorMessage?:string|null;
    uploadedAt?:string|null;
    statusUpdatedAt?:string|null;
  }):unknown;
}

export interface TaxAuthority2027PreparationServiceOptions {
  environment:"sandbox"|"production";
  api:TaxAuthority2027ApiPort;
  persistence:TaxAuthority2027PersistencePort;
  now?:()=>Date;
  createId?:()=>string;
}

export interface PreparedTaxAuthorityTransmission {
  transmissionUniqueId:string;
  files:TaxAuthorityUploadFileDescriptor[];
}

function classifyFile(name:string):PreparedTransmissionFileKind {
  const normalized=name.trim().toUpperCase();
  if(normalized==="INI.TXT"||normalized.endsWith("/INI.TXT"))return "INI";
  if(normalized==="BKMVDATA.TXT"||normalized.endsWith("/BKMVDATA.TXT")||normalized.includes("BKM"))return "BKM";
  return "OTHER";
}

function mapStatus(status:string):PreparedTransmissionStatus {
  if(status==="Uploaded"||status==="Approved"||status==="Rejected")return status;
  return "Error";
}

export class TaxAuthority2027PreparationService {
  private readonly now:()=>Date;
  private readonly createId:()=>string;

  constructor(private readonly options:TaxAuthority2027PreparationServiceOptions){
    this.now=options.now??(()=>new Date());
    this.createId=options.createId??(()=>crypto.randomUUID());
  }

  async prepare(input:TaxAuthorityUploadLinksRequest):Promise<PreparedTaxAuthorityTransmission> {
    const response=await this.options.api.requestUploadLinks(input);
    if(!response.success||!response.data){
      const message=response.error?.message||"unknown upload-links failure";
      throw new Error(`TAX_AUTHORITY_API_2027_PREPARE_FAILED: ${message}`);
    }
    for(const descriptor of response.data.files){
      this.options.persistence.create({
        id:this.createId(),
        environment:this.options.environment,
        caseNumber:String(input.caseNumber).padStart(9,"0"),
        startPeriod:input.startPeriod,
        endPeriod:input.endPeriod,
        transmissionUniqueId:response.data.uniqueId,
        fileUniqueId:descriptor.fileUniqueId,
        fileName:descriptor.fileName,
        fileKind:classifyFile(descriptor.fileName),
      });
    }
    return {transmissionUniqueId:response.data.uniqueId,files:response.data.files};
  }

  async upload(descriptor:TaxAuthorityUploadFileDescriptor,payload:TaxAuthorityUploadPayload):Promise<TaxAuthorityResumableUploadResult> {
    try{
      const result=await this.options.api.uploadFile(descriptor,payload);
      const at=this.now().toISOString();
      this.options.persistence.updateStatus({fileUniqueId:descriptor.fileUniqueId,status:"Uploaded",uploadedAt:at,statusUpdatedAt:at});
      return result;
    }catch(error){
      this.options.persistence.updateStatus({
        fileUniqueId:descriptor.fileUniqueId,
        status:"Error",
        errorMessage:error instanceof Error?error.message:String(error),
        statusUpdatedAt:this.now().toISOString(),
      });
      throw error;
    }
  }

  async refreshStatuses(fileUniqueIds:string[]):Promise<TaxAuthorityFileStatusResponseItem[]> {
    const ids=[...new Set(fileUniqueIds.map(value=>value.trim()).filter(Boolean))];
    if(ids.length===0)throw new Error("TAX_AUTHORITY_API_2027_NO_FILE_IDS");
    const statuses=await this.options.api.getFileStatuses(ids.map(fileName=>({fileName})));
    for(const item of statuses){
      if(!item.fileName)continue;
      this.options.persistence.updateStatus({
        fileUniqueId:item.fileName,
        status:item.isFound?mapStatus(item.status):"Error",
        description:item.description||"",
        errorCode:item.errorCode,
        errorMessage:item.errorMessage,
        uploadedAt:item.uploadedDate||null,
        statusUpdatedAt:item.updatedDate||this.now().toISOString(),
      });
    }
    return statuses;
  }
}
