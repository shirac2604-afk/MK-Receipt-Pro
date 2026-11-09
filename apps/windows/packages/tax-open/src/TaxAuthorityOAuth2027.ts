export type TaxAuthorityOAuthEnvironment="sandbox"|"production";

export interface TaxAuthorityOAuthEndpoints {
  authorize:string;
}

export const TAX_AUTHORITY_OAUTH_2027={
  sandbox:{
    authorize:"https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/authorize",
  },
  production:null,
} as const satisfies Record<TaxAuthorityOAuthEnvironment,TaxAuthorityOAuthEndpoints|null>;

export interface TaxAuthorityOAuthPublicConfig {
  environment:TaxAuthorityOAuthEnvironment;
  clientId:string;
  redirectUri:string;
  scope:string;
}

export interface TaxAuthorityOAuthTokenSet {
  tokenType:string;
  accessToken:string;
  refreshToken:string;
  scope:string;
  expiresIn:number;
  refreshTokenExpiresIn:number;
  consentedOn:number|null;
  obtainedAt:string;
}

export interface TaxAuthorityOAuthTokenStore {
  load():Promise<TaxAuthorityOAuthTokenSet|null>;
  save(tokens:TaxAuthorityOAuthTokenSet):Promise<void>;
  clear():Promise<void>;
}

function required(value:string,name:string):string {
  const result=value.trim();
  if(!result)throw new Error(`TAX_AUTHORITY_OAUTH_2027_MISSING_${name}`);
  return result;
}

export function buildTaxAuthorityAuthorizationUrl(config:TaxAuthorityOAuthPublicConfig):string {
  const endpoints=TAX_AUTHORITY_OAUTH_2027[config.environment];
  if(!endpoints)throw new Error("TAX_AUTHORITY_OAUTH_2027_PRODUCTION_NOT_CONFIRMED");
  const url=new URL(endpoints.authorize);
  url.searchParams.set("response_type","code");
  url.searchParams.set("client_id",required(config.clientId,"CLIENT_ID"));
  url.searchParams.set("scope",required(config.scope,"SCOPE"));
  url.searchParams.set("redirect_uri",required(config.redirectUri,"REDIRECT_URI"));
  return url.toString();
}
