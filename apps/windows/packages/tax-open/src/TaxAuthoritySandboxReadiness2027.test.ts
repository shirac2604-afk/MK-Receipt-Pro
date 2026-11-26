import { describe,expect,it } from "vitest";
import { checkTaxAuthoritySandboxReadiness } from "./TaxAuthoritySandboxReadiness2027";

describe("Tax Authority 2027 sandbox readiness",()=>{
  it("reports ready only when all public sandbox configuration is present",()=>{
    expect(checkTaxAuthoritySandboxReadiness({
      environment:"sandbox",
      clientId:"client-id",
      scope:"scope",
      redirectUri:"http://localhost:43127/callback",
      brokerEndpoint:"https://example.supabase.co/functions/v1/tax-authority-oauth-2027",
    })).toEqual({ready:true,issues:[]});
  });

  it("never treats production as sandbox-ready",()=>{
    const result=checkTaxAuthoritySandboxReadiness({
      environment:"production",
      clientId:"x",
      scope:"y",
      redirectUri:"http://localhost",
      brokerEndpoint:"https://example.com/broker",
    });
    expect(result.ready).toBe(false);
    expect(result.issues).toContain("SANDBOX_REQUIRED");
  });
});
