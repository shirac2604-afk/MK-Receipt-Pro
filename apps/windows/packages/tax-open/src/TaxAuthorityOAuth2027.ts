import { Buffer } from "node:buffer";

export type TaxAuthorityOAuthEnvironment="sandbox"|"production";

export interface TaxAuthorityOAuthEndpoints {
  authorize:string;
  token:string;
}

export const TAX_AUTHORITY_OAUTH_2027={
  sandbox:{
    authorize:"https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/authorize",
    token:"https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/token",
  },
  production:null,
} as const satisfies Record<TaxAuthorityOAuthEnvironment,TaxAuthorityOAuthEndpoints|null>;

export interface TaxAuthorityOAuthClientConfig {
  environment:TaxAuthorityOAuthEnvironment;
  clientId:string;
  clientSecretProvider:{getClientSecret():Promise<string>};
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

export interface TaxAuthorityOAuthTransport {
  fetch(input:string,init?:RequestInit):Promise<Response>;
}

function endpoints(environment:TaxAuthorityOAuthEnvironment):TaxAuthorityOAuthEndpoints {
  const value=TAX_AUTHORITY_OAUTH_2027[environment];
  if(!value)throw new Error("TAX_AUTHORITY_OAUTH_2027_PRODUCTION_NOT_CONFIRMED");
  return value;
}

function clean(value:string,name:string):string {
  const result=value.trim();
  if(!result)throw new Error(`TAX_AUTHORITY_OAUTH_2027_MISSING_${name}`);
  return result;
}

function parseTokenResponse(input:unknown,now:Date):TaxAuthorityOAuthTokenSet {
  if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("TAX_AUTHORITY_OAUTH_2027_INVALID_TOKEN_RESPONSE");
  const body=input as Record<string,unknown>;
  const tokenType=String(body.token_type??"").trim();
  const accessToken=String(body.access_token??"").trim();
  const refreshToken=String(body.refresh_token??"").trim();
  const scope=String(body.scope??"").trim();
  const expiresIn=Number(body.expires_in);
  const refreshTokenExpiresIn=Number(body.refresh_token_expires_in);
  const consentedOn=body.consented_on===undefined||body.consented_on===null?null:Number(body.consented_on);
  if(!tokenType||!accessToken||!refreshToken||!Number.isFinite(expiresIn)||expiresIn<=0||!Number.isFinite(refreshTokenExpiresIn)||refreshTokenExpiresIn<=0){
    throw new Error("TAX_AUTHORITY_OAUTH_2027_INVALID_TOKEN_RESPONSE");
  }
  return {tokenType,accessToken,refreshToken,scope,expiresIn,refreshTokenExpiresIn,consentedOn:Number.isFinite(consentedOn as number)?consentedOn:null,obtainedAt:now.toISOString()};
}

export class TaxAuthorityOAuth2027Client {
  private readonly transport:TaxAuthorityOAuthTransport;
  private readonly now:()=>Date;

  constructor(
    private readonly config:TaxAuthorityOAuthClientConfig,
    private readonly tokenStore:TaxAuthorityOAuthTokenStore,
    options?:{transport?:TaxAuthorityOAuthTransport;now?:()=>Date},
  ){
    this.transport=options?.transport??{fetch:(input,init)=>fetch(input,init)};
    this.now=options?.now??(()=>new Date());
  }

  buildAuthorizationUrl():string {
    const ep=endpoints(this.config.environment);
    const url=new URL(ep.authorize);
    url.searchParams.set("response_type","code");
    url.searchParams.set("client_id",clean(this.config.clientId,"CLIENT_ID"));
    url.searchParams.set("scope",clean(this.config.scope,"SCOPE"));
    url.searchParams.set("redirect_uri",clean(this.config.redirectUri,"REDIRECT_URI"));
    return url.toString();
  }

  async exchangeAuthorizationCode(code:string):Promise<TaxAuthorityOAuthTokenSet> {
    const ep=endpoints(this.config.environment);
    const clientId=clean(this.config.clientId,"CLIENT_ID");
    const secret=clean(await this.config.clientSecretProvider.getClientSecret(),"CLIENT_SECRET");
    const authorizationCode=clean(code,"AUTHORIZATION_CODE");
    const body=new URLSearchParams({
      grant_type:"authorization_code",
      code:authorizationCode,
      redirect_uri:clean(this.config.redirectUri,"REDIRECT_URI"),
      scope:clean(this.config.scope,"SCOPE"),
    });
    const response=await this.transport.fetch(ep.token,{
      method:"POST",
      headers:{
        Authorization:`Basic ${Buffer.from(`${clientId}:${secret}`,"utf8").toString("base64")}`,
        "Content-Type":"application/x-www-form-urlencoded",
      },
      body:body.toString(),
    });
    if(!response.ok)throw new Error(`TAX_AUTHORITY_OAUTH_2027_TOKEN_HTTP_${response.status}`);
    const tokens=parseTokenResponse(await response.json(),this.now());
    await this.tokenStore.save(tokens);
    return tokens;
  }

  async refreshAccessToken():Promise<TaxAuthorityOAuthTokenSet> {
    const ep=endpoints(this.config.environment);
    const existing=await this.tokenStore.load();
    if(!existing?.refreshToken)throw new Error("TAX_AUTHORITY_OAUTH_2027_REFRESH_TOKEN_MISSING");
    const secret=clean(await this.config.clientSecretProvider.getClientSecret(),"CLIENT_SECRET");
    const body=new URLSearchParams({
      client_id:clean(this.config.clientId,"CLIENT_ID"),
      scope:clean(this.config.scope,"SCOPE"),
      refresh_token:existing.refreshToken,
      grant_type:"refresh_token",
      client_secret:secret,
    });
    const response=await this.transport.fetch(ep.token,{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:body.toString(),
    });
    if(!response.ok)throw new Error(`TAX_AUTHORITY_OAUTH_2027_REFRESH_HTTP_${response.status}`);
    const next=parseTokenResponse(await response.json(),this.now());
    // Refresh tokens are rotated. Save the new set before returning it.
    await this.tokenStore.save(next);
    return next;
  }

  async getAccessToken():Promise<string> {
    const tokens=await this.tokenStore.load();
    if(!tokens)throw new Error("TAX_AUTHORITY_OAUTH_2027_AUTHENTICATION_REQUIRED");
    const obtained=Date.parse(tokens.obtainedAt);
    const expiresAt=obtained+tokens.expiresIn*1000;
    if(!Number.isFinite(obtained)||this.now().getTime()>=expiresAt-30_000){
      return (await this.refreshAccessToken()).accessToken;
    }
    return tokens.accessToken;
  }

  async disconnect():Promise<void> {
    await this.tokenStore.clear();
  }
}
