import type { BusinessSettingsRecord, IssueReceiptInput } from "../../../database/src/types";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export class ReceiptSnapshotService {
  create(input: IssueReceiptInput, business: BusinessSettingsRecord) {
    const businessSnapshot = {
      businessName: business.businessName,
      ownerName: business.ownerName,
      businessNumber: business.businessNumber,
      taxStatus: business.taxStatus,
      phone: business.phone,
      email: business.email,
      address: business.address,
      slogan: business.slogan,
      logoPath: business.logoPath,
    };
    const clientSnapshot = {
      name: input.clientName,
      phone: input.clientPhone ?? null,
      email: input.clientEmail ?? null,
    };
    const receiptSnapshot = {
      description: input.description,
      amountAgorot: input.amountAgorot,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber ?? null,
    };
    return {
      businessJson: canonical(businessSnapshot),
      clientJson: canonical(clientSnapshot),
      receiptJson: canonical(receiptSnapshot),
    };
  }
}
