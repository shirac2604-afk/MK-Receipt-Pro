import type { BusinessSettingsInput } from "../../../../packages/database/src/types";

function stringValue(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new Error("INVALID_INPUT");
  return value;
}
export function parseBusinessSettingsInput(value: unknown): BusinessSettingsInput {
  if (!value || typeof value !== "object") throw new Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  const firstReceiptNumber = Number(input.firstReceiptNumber);
  const autoLockMinutes = Number(input.autoLockMinutes);
  if (![0,5,10,15,30].includes(autoLockMinutes)) throw new Error("INVALID_INPUT");
  return {
    businessName: stringValue(input.businessName,150), ownerName: stringValue(input.ownerName,150),
    businessNumber: stringValue(input.businessNumber,20), taxStatus: input.taxStatus === "עוסק מורשה" ? "עוסק מורשה" : "עוסק פטור",
    phone: stringValue(input.phone ?? "",30), email: stringValue(input.email ?? "",200), address: stringValue(input.address ?? "",300),
    slogan: stringValue(input.slogan ?? "",200), logoPath: stringValue(input.logoPath ?? "",1000), signaturePath: stringValue(input.signaturePath ?? "",1000),
    brandColor: stringValue(input.brandColor ?? "#4F46E5",7), backupFolder: stringValue(input.backupFolder ?? "",1000), googleDriveFolder: stringValue(input.googleDriveFolder ?? "",1000),
    firstReceiptNumber, pin: stringValue(input.pin ?? "",8), autoLockMinutes: autoLockMinutes as 0|5|10|15|30,
  };
}
