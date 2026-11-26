import { supabase } from "../lib/supabase";
import type { TaxAuthorityMobileConfig,TaxAuthorityMobileTokenSet } from "./TaxAuthorityMobile2027";
import { TaxAuthorityMobile2027SecureStore } from "./TaxAuthorityMobile2027SecureStore";

interface BrokerResponse{
  ok:boolean;
  tokens?:{
    token_type:string;access_token:string;refresh_token:string;scope?:string;
    expires_in:number;refresh_token_expires_in:number;consented_on?:number|null;
  };
  error?:string;
}

export class TaxAuthorityMobile2027BrokerClient{
  constructor(
    private readonly config:TaxAuthorityMobileConfig,
    private readonly store=new TaxAuthorityMobile2027SecureStore(),
    private readonly now:()=>Date=()=>new Date(),
  ){}

  async exchangeAuthorizationCode(code:string):Promise<TaxAuthorityMobileTokenSet>{
    return this.call({action:"exchange_code",code:code.trim()});
  }

  async refreshAccessToken():Promise<TaxAuthorityMobileTokenSet>{
    const existing=await this.store.load();
    if(!existing?.refreshToken)throw new Error("TAX_AUTHORITY_MOBILE_2027_REFRESH_TOKEN_MISSING");
    return this.call({action:"refresh_token",refreshToken:existing.refreshToken});
  }

  async getAccessToken():Promise<string>{
    const existing=await this.store.load();
    if(!existing)throw new Error("TAX_AUTHORITY_MOBILE_2027_AUTHENTICATION_REQUIRED");
    const obtained=Date.parse(existing.obtainedAt);
    const expiresAt=obtained+existing.expiresIn*1000;
    if(!Number.isFinite(obtained)||this.now().getTime()>=expiresAt-30_000){
      return (await this.refreshAccessToken()).accessToken;
    }
    return existing.accessToken;
  }

  async disconnect():Promise<void>{await this.store.clear()}

  private async call(payload:Record<string,string>):Promise<TaxAuthorityMobileTokenSet>{
    if(!payload.code&&!payload.refreshToken)throw new Error("TAX_AUTHORITY_MOBILE_2027_INVALID_BROKER_REQUEST");
    const{data:{session},error}=await supabase.auth.getSession();
    if(error||!session?.access_token)throw new Error("TAX_AUTHORITY_MOBILE_2027_SUPABASE_SESSION_REQUIRED");
    const response=await fetch(this.config.brokerEndpoint,{
      method:"POST",
      headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
      body:JSON.stringify(payload),
    });
    let body:BrokerResponse;
    try{body=await response.json() as BrokerResponse}catch{throw new Error("TAX_AUTHORITY_MOBILE_2027_BROKER_INVALID_RESPONSE")}
    if(!response.ok||!body.ok||!body.tokens)throw new Error(`TAX_AUTHORITY_MOBILE_2027_BROKER_FAILED: ${body.error??response.status}`);
    const t=body.tokens;
    const tokens:TaxAuthorityMobileTokenSet={
      tokenType:t.token_type||"Bearer",
      accessToken:t.access_token,
      refreshToken:t.refresh_token,
      scope:t.scope??"",
      expiresIn:Number(t.expires_in),
      refreshTokenExpiresIn:Number(t.refresh_token_expires_in),
      consentedOn:t.consented_on===undefined||t.consented_on===null?null:Number(t.consented_on),
      obtainedAt:this.now().toISOString(),
    };
    if(!tokens.accessToken||!tokens.refreshToken||!Number.isFinite(tokens.expiresIn)||tokens.expiresIn<=0)throw new Error("TAX_AUTHORITY_MOBILE_2027_INVALID_TOKEN_SET");
    await this.store.save(tokens);
    return tokens;
  }
}
