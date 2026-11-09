import { describe,expect,it } from "vitest";
import { buildTaxAuthorityAuthorizationUrl } from "./TaxAuthorityOAuth2027";

describe("TaxAuthority OAuth 2027 browser authorization",()=>{
  it("builds the sandbox authorization-code URL without any client secret",()=>{
    const url=new URL(buildTaxAuthorityAuthorizationUrl({
      environment:"sandbox",
      clientId:"client-1",
      redirectUri:"http://localhost:43127/callback",
      scope:"scope-a",
    }));
    expect(url.hostname).toBe("openapi.taxes.gov.il");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:43127/callback");
    expect(url.toString()).not.toContain("secret");
  });

  it("keeps production authorization blocked until official endpoint is confirmed",()=>{
    expect(()=>buildTaxAuthorityAuthorizationUrl({
      environment:"production",
      clientId:"x",
      redirectUri:"http://localhost",
      scope:"scope",
    })).toThrow("TAX_AUTHORITY_OAUTH_2027_PRODUCTION_NOT_CONFIRMED");
  });
});
