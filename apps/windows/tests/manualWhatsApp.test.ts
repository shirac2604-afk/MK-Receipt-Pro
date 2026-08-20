import { describe, expect, it } from "vitest";
import { createManualWhatsAppUrl, normalizeManualWhatsAppMessage } from "../apps/desktop/electron/main/ManualWhatsAppService";

describe("manual WhatsApp helper", () => {
  it("converts a local Israeli phone to a safe wa.me URL", () => {
    const url = new URL(createManualWhatsAppUrl({ phone: "052-000-0000", message: "תזכורת לשיעור" }));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/972520000000");
    expect(url.searchParams.get("text")).toBe("תזכורת לשיעור");
  });

  it("rejects missing phone numbers and oversized messages", () => {
    expect(() => createManualWhatsAppUrl({ phone: "", message: "תזכורת" })).toThrow("INVALID_MANUAL_WHATSAPP_PHONE");
    expect(() => normalizeManualWhatsAppMessage("א".repeat(2_001))).toThrow("INVALID_MANUAL_WHATSAPP_MESSAGE");
  });
});
