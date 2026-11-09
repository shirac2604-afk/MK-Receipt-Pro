import { describe,expect,it } from "vitest";
import { TaxAuthorityOAuth2027Client,type TaxAuthorityOAuthTokenSet } from "./TaxAuthorityOAuth2027";

function tokenSet(overrides:Partial<TaxAuthorityOAuthTokenSet>={}):TaxAuthorityOAuthTokenSet {
  return {tokenType:"Bearer",accessToken:"access-1",refreshToken:"refresh-1",scope:"scope",expiresIn:601,refreshTokenExpiresIn:7776000,consentedOn:1,obtainedAt:"2026-11-09T10:00:00.000Z",...overrides};
}

describe("TaxAuthorityOAuth2027Client",()=>{
  it("builds the sandbox authorization-code URL",()=>{
    const client=new TaxAuthorityOAuth2027Client(
      {environment:"sandbox",clientId:"client-1",clientSecretProvider:{getClientSecret:async()=>"secret"},redirectUri:"http://localhost:43127/callback",scope:"scope-a"},
      {load:async()=>null,save:async()=>{},clear:async()=>{}},
    );
    const url=new URL(client.buildAuthorizationUrl());
    expect(url.hostname).toBe("openapi.taxes.gov.il");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:43127/callback");
  });

  it("exchanges authorization code and persists returned rotating tokens",async()=>{
    let saved:TaxAuthorityOAuthTokenSet|null=null;
    let auth="";
    const client=new TaxAuthorityOAuth2027Client(
      {environment:"sandbox",clientId:"client-1",clientSecretProvider:{getClientSecret:async()=>"secret-1"},redirectUri:"http://localhost/callback",scope:"scope"},
      {load:async()=>null,save:async(value)=>{saved=value},clear:async()=>{}},
      {now:()=>new Date("2026-11-09T10:00:00.000Z"),transport:{fetch:async(_url,init)=>{
        auth=String((init?.headers as Record<string,string>).Authorization??"");
        return new Response(JSON.stringify({token_type:"Bearer",access_token:"A",refresh_token:"R",scope:"scope",expires_in:601,refresh_token_expires_in:7776000,consented_on:1}),{status:200,headers:{"Content-Type":"application/json"}});
      }}},
    );
    const result=await client.exchangeAuthorizationCode("code-1");
    expect(auth.startsWith("Basic ")).toBe(true);
    expect(result.accessToken).toBe("A");
    expect(saved?.refreshToken).toBe("R");
  });

  it("refreshes an expired token and replaces the refresh token",async()=>{
    let saved:TaxAuthorityOAuthTokenSet|null=null;
    const client=new TaxAuthorityOAuth2027Client(
      {environment:"sandbox",clientId:"client-1",clientSecretProvider:{getClientSecret:async()=>"secret-1"},redirectUri:"http://localhost/callback",scope:"scope"},
      {load:async()=>tokenSet({expiresIn:10}),save:async(value)=>{saved=value},clear:async()=>{}},
      {now:()=>new Date("2026-11-09T10:01:00.000Z"),transport:{fetch:async()=>new Response(JSON.stringify({token_type:"Bearer",access_token:"A2",refresh_token:"R2",scope:"scope",expires_in:601,refresh_token_expires_in:7776000,consented_on:1}),{status:200,headers:{"Content-Type":"application/json"}})}},
    );
    expect(await client.getAccessToken()).toBe("A2");
    expect(saved?.refreshToken).toBe("R2");
  });

  it("keeps production OAuth blocked until official endpoints are confirmed",()=>{
    const client=new TaxAuthorityOAuth2027Client(
      {environment:"production",clientId:"x",clientSecretProvider:{getClientSecret:async()=>"y"},redirectUri:"http://localhost",scope:"scope"},
      {load:async()=>null,save:async()=>{},clear:async()=>{}},
    );
    expect(()=>client.buildAuthorizationUrl()).toThrow("TAX_AUTHORITY_OAUTH_2027_PRODUCTION_NOT_CONFIRMED");
  });
});
