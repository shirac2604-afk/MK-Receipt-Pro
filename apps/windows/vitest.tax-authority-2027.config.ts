import { defineConfig } from "vitest/config";

export default defineConfig({
  test:{
    include:[
      "packages/tax-open/src/TaxAuthorityApi2027.test.ts",
      "packages/tax-open/src/TaxAuthorityApi2027Client.test.ts",
      "packages/tax-open/src/TaxAuthorityOAuth2027.test.ts",
      "packages/tax-open/src/TaxAuthorityOAuthBroker2027Client.test.ts",
      "packages/tax-open/src/TaxAuthority2027PreparationService.test.ts",
      "packages/tax-open/src/TaxAuthoritySandboxReadiness2027.test.ts",
      "packages/database/src/repositories/TaxAuthorityTransmissionRepository.test.ts",
    ],
    environment:"node",
  },
});
