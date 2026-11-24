import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OpenFormatService } from "../packages/tax-open/src/OpenFormatService";
import type { DatabaseConnection } from "../packages/database/src/DatabaseConnection";
import type { BusinessSettingsRecord } from "../packages/database/src/types";

describe("open format application export with isolated synthetic data", () => {
  it("exports receipts from the application query without writing to the source", () => {
    // The A000 path field is only 50 characters. A short, unique folder at the
    // drive root keeps this test realistic on the Windows CI runner.
    const targetRoot = path.join(path.parse(os.tmpdir()).root, `tx-${crypto.randomBytes(4).toString("hex")}`);
    if (fs.existsSync(targetRoot)) throw new Error("Test target already exists");
    const originalRegistration = process.env.MK_TAX_SOFTWARE_REGISTRATION_NUMBER;
    process.env.MK_TAX_SOFTWARE_REGISTRATION_NUMBER = "00000000";
    const receipts = Array.from({ length: 1000 }, (_, index) => ({
      id: `synthetic-${index + 1}`,
      receipt_number: index + 1,
      payment_date: "2026-08-01",
      issued_at: "2026-08-01T10:00:00.000Z",
      client_name: `לקוח בדיקה ${index + 1}`,
      client_phone: null,
      amount_agorot: 10000,
      payment_method: "cash" as const,
      reference_number: null,
      status: "active" as const,
    }));
    const queries: string[] = [];
    const connection = {
      prepare(sql: string) {
        queries.push(sql);
        if (!sql.includes("FROM receipts") || !sql.trimStart().startsWith("SELECT")) {
          throw new Error("Unexpected query against isolated receipt source");
        }
        return { all(fromDate: string, toDate: string) {
          return receipts.filter(row => row.payment_date >= fromDate && row.payment_date <= toDate);
        } };
      },
    } as unknown as DatabaseConnection;
    const business = {
      businessName: "עסק בדיקה",
      ownerName: "יצרן בדיקה",
      businessNumber: "999999999",
      taxStatus: "עוסק פטור",
      address: "רחוב בדיקה 1, עיר בדיקה",
    } as BusinessSettingsRecord;

    try {
      const result = new OpenFormatService(connection, () => business).export({
        fromDate: "2026-08-01", toDate: "2026-08-31", targetRoot,
      });
      expect(queries).toHaveLength(1);
      expect(receipts).toHaveLength(1000);
      expect(result.documentCount).toBe(1000);
      expect(result.counts.total).toBe(2002);
      expect(result.validation.valid, result.validation.errors.join("; ")).toBe(true);

      const ini = fs.readFileSync(result.iniPath);
      const data = fs.readFileSync(result.dataArchivePath);
      expect(ini.subarray(0, 4).toString("ascii")).toBe("A000");
      expect(ini.subarray(24, 33).toString("ascii")).toBe(business.businessNumber);
      expect(ini.subarray(56, 64).toString("ascii")).toBe("00000000");
      expect(data.subarray(0, 4).toString("ascii")).toBe("A100");
      expect(data.length).toBeLessThan(4 * 1024 * 1024);
      expect(fs.readFileSync(result.report26Path, "utf8")).toContain("תוכנה: חשבוניות MK-Receipt-Pro");
      expect(fs.readFileSync(result.report54Path, "utf8")).toContain("תוכנה: חשבוניות MK-Receipt-Pro");
      const audit = JSON.parse(fs.readFileSync(path.join(result.folderPath, "OPEN-FORMAT-PRODUCTION-AUDIT.json"), "utf8"));
      expect(audit.submissionReady).toBe(false);
      expect(audit.issues).toContain("שם העסק חסר או מכיל ערך בדיקה.");
    } finally {
      if (originalRegistration === undefined) delete process.env.MK_TAX_SOFTWARE_REGISTRATION_NUMBER;
      else process.env.MK_TAX_SOFTWARE_REGISTRATION_NUMBER = originalRegistration;
      if (path.basename(targetRoot).startsWith("tx-") && path.dirname(targetRoot) === path.parse(os.tmpdir()).root) {
        fs.rmSync(targetRoot, { recursive: true, force: true });
      }
    }
  });
});
