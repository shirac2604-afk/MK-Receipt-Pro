import {describe,expect,it} from "vitest";
import {
  TAX_AUTHORITY_API_2027,
  assertTaxAuthorityApiCanTransmit,
  getTaxAuthorityStatusUrl,
  getTaxAuthorityUploadLinksUrl,
  isFinalTaxAuthorityFileStatus,
  maximumUploadBytesFromHeader,
  validateTaxAuthorityUploadLinksRequest,
} from "./TaxAuthorityApi2027";

describe("TaxAuthorityApi2027",()=>{
  it("matches the March 2026 specification metadata",()=>{
    expect(TAX_AUTHORITY_API_2027.specificationEdition).toBe("1.0 / 3.2026");
    expect(TAX_AUTHORITY_API_2027.requiredFrom).toBe("2027-01-01");
    expect(TAX_AUTHORITY_API_2027.resumableChunkBytes).toBe(1_048_576);
  });

  it("validates the upload-link request",()=>{
    expect(validateTaxAuthorityUploadLinksRequest({
      caseNumber:39375365,
      startPeriod:"2026-01-01",
      endPeriod:"2026-12-31",
    })).toEqual([]);

    expect(validateTaxAuthorityUploadLinksRequest({
      caseNumber:123,
      startPeriod:"01/01/2026",
      endPeriod:"2025-12-31",
    }).length).toBeGreaterThan(0);
  });

  it("keeps production transmission disabled until explicitly enabled and confirmed",()=>{
    expect(()=>assertTaxAuthorityApiCanTransmit({environment:"sandbox",enabled:false})).toThrow("TAX_AUTHORITY_API_2027_DISABLED");
    expect(()=>assertTaxAuthorityApiCanTransmit({environment:"production",enabled:true})).toThrow("TAX_AUTHORITY_API_2027_PRODUCTION_NOT_CONFIRMED");
  });

  it("exposes sandbox endpoints and leaves unconfirmed production status endpoint unavailable",()=>{
    expect(getTaxAuthorityUploadLinksUrl("sandbox")).toContain("tsandbox");
    expect(getTaxAuthorityUploadLinksUrl("production")).toContain("production");
    expect(getTaxAuthorityStatusUrl("sandbox")).toContain("get-file-status");
    expect(getTaxAuthorityStatusUrl("production")).toBeNull();
  });

  it("parses upload size limits and final statuses",()=>{
    expect(maximumUploadBytesFromHeader("0,1048576")).toBe(1_048_576);
    expect(maximumUploadBytesFromHeader("bad-value")).toBeNull();
    expect(isFinalTaxAuthorityFileStatus("Uploaded")).toBe(false);
    expect(isFinalTaxAuthorityFileStatus("Approved")).toBe(true);
    expect(isFinalTaxAuthorityFileStatus("Rejected")).toBe(true);
  });
});
