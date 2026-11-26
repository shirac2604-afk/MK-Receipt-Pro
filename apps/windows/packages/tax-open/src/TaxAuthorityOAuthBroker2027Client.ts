import type { TaxAuthorityOAuthTokenSet,TaxAuthorityOAuthTokenStore } from "./TaxAuthorityOAuth2027";

export interface TaxAuthorityOAuthBroker2027Options {
  endpoint:string;
  supabaseAccessTokenProvider:{getAccessToken():Promise<string>};
  tokenStore:TaxAuthorityOAuthTokenStore;
  now?:()=>Date;
  transport?:{fetch(input:string,init?:RequestInit):Promise<Response>};
}

interface BrokerResponse {
  ok:boolean;
  tokens?:{
    token_type:string;
    access_token:string;
    refresh_token:string;
    scope?:string;
    expires_in:number;
    consented_on?:number|null;
    refresh_token_expires_in:number;
  };
  error?:string;
}

function requireValue(value:string,name:string):string {
  const result=value.trim();
  if(!result)throw new Error(`TAX_AUTHORITY_OAUTH_BROKER_2027_MISSING_${name}`);
  return result;
}

export class TaxAuthorityOAuthBroker2027Client {
  private readonly now:()=>Date;
  private readonly transport:{fetch(input:string,init?:RequestInit):Promise<Response>};

  constructor(private readonly options:TaxAuthorityOAuthBroker2027Options){
    this.now=options.now??(()=>new Date());
    this.transport=options.transport??{fetch:(input,init)=>fetch(input,init)};
  }

  async exchangeAuthorizationCode(code:string):Promise<TaxAuthorityOAuthTokenSet> {
    return this.callBroker({action:"exchange_code",code:requireValue(code,"AUTHORIZATION_CODE")});
  }

  async refreshAccessToken():Promise<TaxAuthorityOAuthTokenSet> {
    const existing=await this.options.tokenStore.load();
    if(!existing?.refreshToken)throw new Error("TAX_AUTHORITY_OAUTH_2027_REFRESH_TOKEN_MISSING");
    return this.callBroker({action:"refresh_token",refreshToken:existing.refreshToken});
  }

  async getAccessToken():Promise<string> {
    const existing=await this.options.tokenStore.load();
    if(!existing)throw new Error("TAX_AUTHORITY_OAUTH_2027_AUTHENTICATION_REQUIRED");
    const obtained=Date.parse(existing.obtainedAt);
    const expiresAt=obtained+existing.expiresIn*1000;
    if(!Number.isFinite(obtained)||this.now().getTime()>=expiresAt-30_000){
      return (await this.refreshAccessToken()).accessToken;
    }
    return existing.accessToken;
  }

  private async callBroker(payload:Record<string,string>):Promise<TaxAuthorityOAuthTokenSet> {
    const userToken=requireValue(await this.options.supabaseAccessTokenProvider.getAccessToken(),"SUPABASE_USER_TOKEN");
    const response=await this.transport.fetch(requireValue(this.options.endpoint,"BROKER_ENDPOINT"),{
      method:"POST",
      headers:{Authorization:`Bearer ${userToken}`,"Content-Type":"application/json"},
      body:JSON.stringify(payload),
    });
    let parsed:BrokerResponse;
    try{parsed=await response.json() as BrokerResponse}catch{throw new Error("TAX_AUTHORITY_OAUTH_BROKER_2027_INVALID_RESPONSE")}
    if(!response.ok||!parsed.ok||!parsed.tokens)throw new Error(`TAX_AUTHORITY_OAUTH_BROKER_2027_FAILED: ${parsed.error??response.status}`);
    const value=parsed.tokens;
    if(!value.access_token||!value.refresh_token||!Number.isFinite(Number(value.expires_in))||!Number.isFinite(Number(value.refresh_token_expires_in))){
      throw new Error("TAX_AUTHORITY_OAUTH_BROKER_2027_INVALID_TOKEN_SET");
    }
    const tokens:TaxAuthorityOAuthTokenSet={
      tokenType:value.token_type||"Bearer",
      accessToken:value.access_token,
      refreshToken:value.refresh_token,
      scope:value.scope??"",
      expiresIn:Number(value.expires_in),
      refreshTokenExpiresIn:Number(value.refresh_token_expires_in),
      consentedOn:value.consented_on===undefined||value.consented_on===null?null:Number(value.consented_on),
      obtainedAt:this.now().toISOString(),
    };
    await this.options.tokenStore.save(tokens);
    return tokens;
  }
}
