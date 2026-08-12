import { describe, expect, it } from "vitest";
import type { ServiceResult } from "../packages/shared/src/result";

describe("foundation", () => {
  it("supports typed successful service results", () => {
    const result: ServiceResult<number> = { success: true, data: 1 };
    expect(result.success).toBe(true);
  });

  it("keeps the production app id stable", async () => {
    const pkg = await import("../package.json");
    expect(pkg.default.build.appId).toBe("il.co.mkreceipt.desktop");
  });
});
