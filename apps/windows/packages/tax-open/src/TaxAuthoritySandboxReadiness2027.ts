export interface TaxAuthoritySandboxReadinessInput {
  clientId:string;
  scope:string;
  redirectUri:string;
  brokerEndpoint:string;
  environment:"sandbox"|"production";
}

export interface TaxAuthoritySandboxReadinessResult {
  ready:boolean;
  issues:string[];
}

function isHttpUrl(value:string):boolean {
  try{
    const url=new URL(value);
    return url.protocol==="http:"||url.protocol==="https:";
  }catch{return false}
}

export function checkTaxAuthoritySandboxReadiness(input:TaxAuthoritySandboxReadinessInput):TaxAuthoritySandboxReadinessResult {
  const issues:string[]=[];
  if(input.environment!=="sandbox")issues.push("SANDBOX_REQUIRED");
  if(!input.clientId.trim())issues.push("CLIENT_ID_REQUIRED");
  if(!input.scope.trim())issues.push("SCOPE_REQUIRED");
  if(!input.redirectUri.trim()||!isHttpUrl(input.redirectUri))issues.push("VALID_REDIRECT_URI_REQUIRED");
  if(!input.brokerEndpoint.trim()||!isHttpUrl(input.brokerEndpoint))issues.push("VALID_BROKER_ENDPOINT_REQUIRED");
  return {ready:issues.length===0,issues};
}
