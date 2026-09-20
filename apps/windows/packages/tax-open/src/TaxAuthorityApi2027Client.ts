import {
  assertTaxAuthorityApiCanTransmit,
  getTaxAuthorityStatusUrl,
  getTaxAuthorityUploadLinksUrl,
  maximumUploadBytesFromHeader,
  TAX_AUTHORITY_API_2027,
  type TaxAuthorityApi2027Config,
  type TaxAuthorityFileStatusRequestItem,
  type TaxAuthorityFileStatusResponseItem,
  type TaxAuthorityUploadFileDescriptor,
  type TaxAuthorityUploadLinksRequest,
  type TaxAuthorityUploadLinksResponse,
  validateTaxAuthorityUploadLinksRequest,
} from "./TaxAuthorityApi2027";

export interface TaxAuthorityOAuthTokenProvider {
  getAccessToken():Promise<string>;
}

export interface TaxAuthorityHttpTransport {
  fetch(input:string,init?:RequestInit):Promise<Response>;
}

export interface TaxAuthorityUploadPayload {
  fileName:string;
  bytes:Uint8Array;
  contentType?:string;
}

export interface TaxAuthorityResumableUploadResult {
  fileUniqueId:string;
  uploadUrl:string;
  bytesUploaded:number;
  finalHttpStatus:number;
}

export interface TaxAuthorityApi2027ClientOptions {
  config:TaxAuthorityApi2027Config;
  tokenProvider:TaxAuthorityOAuthTokenProvider;
  transport?:TaxAuthorityHttpTransport;
}

function defaultTransport():TaxAuthorityHttpTransport {
  return {fetch:(input,init)=>fetch(input,init)};
}

function requireBearerToken(value:string):string {
  const token=value.trim();
  if(!token)throw new Error("TAX_AUTHORITY_API_2027_EMPTY_ACCESS_TOKEN");
  return token;
}

function requireJsonObject(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("TAX_AUTHORITY_API_2027_INVALID_JSON_RESPONSE");
  return value as Record<string,unknown>;
}

function ensureSandboxPayloadAllowed(config:TaxAuthorityApi2027Config,payload:TaxAuthorityUploadPayload):void {
  if(config.environment!=="sandbox")return;
  const name=payload.fileName.toLowerCase();
  const contentType=(payload.contentType??"").toLowerCase();
  if(!name.endsWith(".pdf")&&contentType!=="application/pdf")throw new Error("TAX_AUTHORITY_API_2027_SANDBOX_PDF_ONLY");
  if(payload.bytes.byteLength>TAX_AUTHORITY_API_2027.sandboxUploadLimitBytes)throw new Error("TAX_AUTHORITY_API_2027_SANDBOX_FILE_TOO_LARGE");
}

function descriptorLimit(descriptor:TaxAuthorityUploadFileDescriptor):number {
  const parsed=maximumUploadBytesFromHeader(descriptor.headers["x-goog-content-length-range"]);
  if(parsed===null)throw new Error("TAX_AUTHORITY_API_2027_INVALID_UPLOAD_SIZE_HEADER");
  return parsed;
}

export class TaxAuthorityApi2027Client {
  private readonly transport:TaxAuthorityHttpTransport;
  constructor(private readonly options:TaxAuthorityApi2027ClientOptions){
    this.transport=options.transport??defaultTransport();
  }

  async requestUploadLinks(input:TaxAuthorityUploadLinksRequest):Promise<TaxAuthorityUploadLinksResponse> {
    assertTaxAuthorityApiCanTransmit(this.options.config);
    const issues=validateTaxAuthorityUploadLinksRequest(input);
    if(issues.length)throw new Error(`TAX_AUTHORITY_API_2027_INVALID_REQUEST: ${issues.join(" | ")}`);
    const token=requireBearerToken(await this.options.tokenProvider.getAccessToken());
    const response=await this.transport.fetch(getTaxAuthorityUploadLinksUrl(this.options.config.environment),{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(input),
    });
    const body=requireJsonObject(await response.json()) as unknown as TaxAuthorityUploadLinksResponse;
    if(!response.ok)throw new Error(`TAX_AUTHORITY_API_2027_UPLOAD_LINKS_HTTP_${response.status}`);
    if(typeof body.success!=="boolean")throw new Error("TAX_AUTHORITY_API_2027_INVALID_UPLOAD_LINKS_RESPONSE");
    return body;
  }

  async initiateResumableUpload(descriptor:TaxAuthorityUploadFileDescriptor):Promise<string> {
    assertTaxAuthorityApiCanTransmit(this.options.config);
    const response=await this.transport.fetch(descriptor.signUrl,{
      method:"POST",
      headers:{...descriptor.headers},
      redirect:"manual",
    });
    if(response.status!==201)throw new Error(`TAX_AUTHORITY_API_2027_RESUMABLE_INIT_HTTP_${response.status}`);
    const location=response.headers.get("location")?.trim();
    if(!location)throw new Error("TAX_AUTHORITY_API_2027_RESUMABLE_LOCATION_MISSING");
    return location;
  }

  async uploadFile(descriptor:TaxAuthorityUploadFileDescriptor,payload:TaxAuthorityUploadPayload):Promise<TaxAuthorityResumableUploadResult> {
    assertTaxAuthorityApiCanTransmit(this.options.config);
    ensureSandboxPayloadAllowed(this.options.config,payload);
    const maxBytes=descriptorLimit(descriptor);
    if(payload.bytes.byteLength>maxBytes)throw new Error("TAX_AUTHORITY_API_2027_FILE_EXCEEDS_SERVER_LIMIT");
    const uploadUrl=await this.initiateResumableUpload(descriptor);
    const chunkSize=TAX_AUTHORITY_API_2027.resumableChunkBytes;
    const total=payload.bytes.byteLength;
    let finalHttpStatus=0;
    if(total===0){
      const response=await this.transport.fetch(uploadUrl,{method:"PUT",headers:{"Content-Range":"bytes */0"},body:new Uint8Array()});
      finalHttpStatus=response.status;
      if(![200,201,308].includes(response.status))throw new Error(`TAX_AUTHORITY_API_2027_UPLOAD_HTTP_${response.status}`);
    }else{
      for(let start=0;start<total;start+=chunkSize){
        const endExclusive=Math.min(start+chunkSize,total);
        const chunk=payload.bytes.slice(start,endExclusive);
        const response=await this.transport.fetch(uploadUrl,{
          method:"PUT",
          headers:{"Content-Range":`bytes ${start}-${endExclusive-1}/${total}`,...(payload.contentType?{"Content-Type":payload.contentType}:{})},
          body:chunk,
        });
        finalHttpStatus=response.status;
        const isLast=endExclusive===total;
        if(!isLast&&response.status!==308)throw new Error(`TAX_AUTHORITY_API_2027_CHUNK_HTTP_${response.status}`);
        if(isLast&&![200,201,308].includes(response.status))throw new Error(`TAX_AUTHORITY_API_2027_FINAL_CHUNK_HTTP_${response.status}`);
      }
    }
    return {fileUniqueId:descriptor.fileUniqueId,uploadUrl,bytesUploaded:total,finalHttpStatus};
  }

  async getFileStatuses(items:TaxAuthorityFileStatusRequestItem[]):Promise<TaxAuthorityFileStatusResponseItem[]> {
    assertTaxAuthorityApiCanTransmit(this.options.config);
    if(items.length===0)throw new Error("TAX_AUTHORITY_API_2027_STATUS_EMPTY_REQUEST");
    const url=getTaxAuthorityStatusUrl(this.options.config.environment);
    if(!url)throw new Error("TAX_AUTHORITY_API_2027_STATUS_URL_NOT_AVAILABLE");
    const token=requireBearerToken(await this.options.tokenProvider.getAccessToken());
    const response=await this.transport.fetch(url,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(items),
    });
    if(!response.ok)throw new Error(`TAX_AUTHORITY_API_2027_STATUS_HTTP_${response.status}`);
    const body=await response.json();
    if(!Array.isArray(body))throw new Error("TAX_AUTHORITY_API_2027_INVALID_STATUS_RESPONSE");
    return body as TaxAuthorityFileStatusResponseItem[];
  }
}
