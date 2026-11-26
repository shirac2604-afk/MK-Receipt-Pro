export type TaxAuthorityMobileEnvironment="sandbox"|"production";

export interface TaxAuthorityMobileTokenSet {
  tokenType:string;
  accessToken:string;
  refreshToken:string;
  scope:string;
  expiresIn:number;
  refreshTokenExpiresIn:number;
  consentedOn:number|null;
  obtainedAt:string;
}

export interface TaxAuthorityMobileConfig {
  environment:TaxAuthorityMobileEnvironment;
  clientId:string;
  redirectUri:string;
  scope:string;
  brokerEndpoint:string;
}

export const TAX_AUTHORITY_MOBILE_OAUTH={
  sandboxAuthorize:"https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/authorize",
  productionAuthorize:null as string|null,
} as const;

function required(value:string,name:string):string{
  const result=value.trim();
  if(!result)throw new Error(`TAX_AUTHORITY_MOBILE_2027_MISSING_${name}`);
  return result;
}

export function buildTaxAuthorityMobileAuthorizationUrl(config:TaxAuthorityMobileConfig):string{
  if(config.environment==="production"&&!TAX_AUTHORITY_MOBILE_OAUTH.productionAuthorize){
    throw new Error("TAX_AUTHORITY_MOBILE_2027_PRODUCTION_NOT_CONFIRMED");
  }
  const base=config.environment==="sandbox"?TAX_AUTHORITY_MOBILE_OAUTH.sandboxAuthorize:TAX_AUTHORITY_MOBILE_OAUTH.productionAuthorize!;
  const url=new URL(base);
  url.searchParams.set("response_type","code");
  url.searchParams.set("client_id",required(config.clientId,"CLIENT_ID"));
  url.searchParams.set("scope",required(config.scope,"SCOPE"));
  url.searchParams.set("redirect_uri",required(config.redirectUri,"REDIRECT_URI"));
  return url.toString();
}
