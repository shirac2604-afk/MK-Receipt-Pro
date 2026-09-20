export type TaxAuthorityApiEnvironment="sandbox"|"production";

export type TaxAuthorityFileStatus="Uploaded"|"Approved"|"Rejected"|"";

export interface TaxAuthorityUploadLinksRequest {
  caseNumber:number;
  startPeriod:string;
  endPeriod:string;
  representorCompanyId?:number;
}

export interface TaxAuthorityUploadHeaders {
  "x-goog-content-length-range":string;
  "x-goog-resumable":string;
}

export interface TaxAuthorityUploadFileDescriptor {
  fileName:string;
  signUrl:string;
  fileUniqueId:string;
  headers:TaxAuthorityUploadHeaders;
}

export interface TaxAuthorityUploadLinksData {
  uniqueId:string;
  files:TaxAuthorityUploadFileDescriptor[];
}

export interface TaxAuthorityApiError {
  errorCode:number;
  message:string;
}

export interface TaxAuthorityUploadLinksResponse {
  success:boolean;
  data:TaxAuthorityUploadLinksData|null;
  error:TaxAuthorityApiError|null;
}

export interface TaxAuthorityFileStatusRequestItem {
  fileName:string;
}

export interface TaxAuthorityFileStatusResponseItem {
  fileName:string;
  status:TaxAuthorityFileStatus;
  description:string;
  uploadedDate:string;
  updatedDate:string;
  isFound:boolean;
  errorCode:number|null;
  errorMessage:string|null;
}

export interface TaxAuthorityApi2027Config {
  environment:TaxAuthorityApiEnvironment;
  enabled:boolean;
}

export const TAX_AUTHORITY_API_2027={
  specificationEdition:"1.0 / 3.2026",
  requiredFrom:"2027-01-01",
  uploadLinks:{
    sandbox:"https://ita-api.taxes.gov.il/shaam/tsandbox/UniStructFileUploadLinksApi/v1/UploadingFile/GetUrlsForUploadingFiles",
    production:"https://openapi.taxes.gov.il/shaam/production/UniStructFileUploadLinksApi/v1/UploadingFile/GetUrlsForUploadingFiles",
  },
  fileStatus:{
    sandbox:"https://ita-api.taxes.gov.il/shaam/tsandbox/FilesStatusApi/v1/Files/get-file-status",
    production:null,
  },
  oauth:"OAuth2: User Restricted",
  resumableChunkBytes:1_048_576,
  sandboxUploadLimitBytes:1_048_576,
} as const;

const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;

export function validateTaxAuthorityUploadLinksRequest(input:TaxAuthorityUploadLinksRequest):string[] {
  const issues:string[]=[];
  if(!/^\d{9}$/.test(String(input.caseNumber)))issues.push("caseNumber must contain exactly 9 digits");
  if(!DATE_PATTERN.test(input.startPeriod))issues.push("startPeriod must use YYYY-MM-DD");
  if(!DATE_PATTERN.test(input.endPeriod))issues.push("endPeriod must use YYYY-MM-DD");
  if(DATE_PATTERN.test(input.startPeriod)&&DATE_PATTERN.test(input.endPeriod)&&input.startPeriod>input.endPeriod)issues.push("startPeriod must not be later than endPeriod");
  if(input.representorCompanyId!==undefined&&!/^\d{1,9}$/.test(String(input.representorCompanyId)))issues.push("representorCompanyId must be numeric when supplied");
  return issues;
}

export function getTaxAuthorityUploadLinksUrl(environment:TaxAuthorityApiEnvironment):string {
  return TAX_AUTHORITY_API_2027.uploadLinks[environment];
}

export function getTaxAuthorityStatusUrl(environment:TaxAuthorityApiEnvironment):string|null {
  return TAX_AUTHORITY_API_2027.fileStatus[environment];
}

export function assertTaxAuthorityApiCanTransmit(config:TaxAuthorityApi2027Config):void {
  if(!config.enabled)throw new Error("TAX_AUTHORITY_API_2027_DISABLED");
  if(config.environment==="production"&&!TAX_AUTHORITY_API_2027.fileStatus.production){
    throw new Error("TAX_AUTHORITY_API_2027_PRODUCTION_NOT_CONFIRMED");
  }
}

export function maximumUploadBytesFromHeader(value:string):number|null {
  const match=/^\s*\d+\s*,\s*(\d+)\s*$/.exec(value);
  if(!match)return null;
  const parsed=Number(match[1]);
  return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
}

export function isFinalTaxAuthorityFileStatus(status:TaxAuthorityFileStatus):boolean {
  return status==="Approved"||status==="Rejected";
}
