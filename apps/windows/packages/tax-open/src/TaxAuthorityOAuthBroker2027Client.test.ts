import { describe,expect,it } from "vitest";
import { TaxAuthorityOAuthBroker2027Client } from "./TaxAuthorityOAuthBroker2027Client";
import type { TaxAuthorityOAuthTokenSet } from "./TaxAuthorityOAuth2027";

function tokens(overrides:Partial<TaxAuthorityOAuthTokenSet>={}):TaxAuthorityOAuthTokenSet{
  return {tokenType:"Bearer",accessToken:"old-access",refreshToken:"old-refresh",scope:"scope",expiresIn:600,refreshTokenExpiresIn:7776000,consentedOn:1,obtainedAt:"2026-11-09T10:00:00.000Z",...overrides};
}

describe("TaxAuthorityOAuthBroker2027Client",()=>{
  it("exchanges code through authenticated server broker and stores tokens",async()=>{
    let saved:TaxAuthorityOAuthTokenSet|null=null;
    let authorization="";
    const client=new TaxAuthorityOAuthBroker2027Client({
      endpoint:"https://example.supabase.co/functions/v1/tax-authority-oauth-2027",
      supabaseAccessTokenProvider:{getAccessToken:async()=>"user-jwt"},
      tokenStore:{load:async()=>null,save:async(v)=>{saved=v},clear:async()=>{}},
      now:()=>new Date("2026-11-09T10:00:00.000Z"),
      transport:{fetch:async(_url,init)=>{
        authorization=String((init?.headers as Record<string,string>).Authorization??"");
        return new Response(JSON.stringify({ok:true,tokens:{token_type:"Bearer",access_token:"A",refresh_token:"R",scope:"scope",expires_in:601,refresh_token_expires_in:7776000,consented_on:1}}),{status:200,headers:{"Content-Type":"application/json"}});
      }},
    });
    expect((await client.exchangeAuthorizationCode("code")).accessToken).toBe("A");
    expect(authorization).toBe("Bearer user-jwt");
    expect(saved?.refreshToken).toBe("R");
  });

  it("rotates refresh token when current access token is expired",async()=>{
    let saved:TaxAuthorityOAuthTokenSet|null=null;
    let body="";
    const client=new TaxAuthorityOAuthBroker2027Client({
      endpoint:"https://example.supabase.co/functions/v1/tax-authority-oauth-2027",
      supabaseAccessTokenProvider:{getAccessToken:async()=>"user-jwt"},
      tokenStore:{load:async()=>tokens({expiresIn:10}),save:async(v)=>{saved=v},clear:async()=>{}},
      now:()=>new Date("2026-11-09T10:01:00.000Z"),
      transport:{fetch:async(_url,init)=>{
        body=String(init?.body??"");
        return new Response(JSON.stringify({ok:true,tokens:{token_type:"Bearer",access_token:"A2",refresh_token:"R2",scope:"scope",expires_in:601,refresh_token_expires_in:7776000,consented_on:1}}),{status:200,headers:{"Content-Type":"application/json"}});
      }},
    });
    expect(await client.getAccessToken()).toBe("A2");
    expect(JSON.parse(body).refreshToken).toBe("old-refresh");
    expect(saved?.refreshToken).toBe("R2");
  });
});
