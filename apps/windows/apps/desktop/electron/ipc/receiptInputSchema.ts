import type { IssueReceiptInput, PaymentMethod } from "../../../../packages/database/src/types";

const PAYMENT_METHODS = new Set<PaymentMethod>(["cash", "bank_transfer", "bit", "paybox"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("INVALID_INPUT");
  const normalized = value.trim();
  if (normalized.length > max) throw new Error("INVALID_INPUT");
  return normalized;
}

export function parseIssueReceiptInput(value: unknown): IssueReceiptInput {
  if (!isObject(value)) throw new Error("INVALID_INPUT");
  const clientName = optionalText(value.clientName, 150);
  const description = optionalText(value.description, 1000);
  const paymentDate = optionalText(value.paymentDate, 10);
  const paymentMethod = value.paymentMethod;
  const amountAgorot = value.amountAgorot;

  if (!clientName || !description || !paymentDate) throw new Error("INVALID_INPUT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new Error("INVALID_INPUT");
  if (!Number.isInteger(amountAgorot) || Number(amountAgorot) <= 0 || Number(amountAgorot) > 999_999_999) throw new Error("INVALID_INPUT");
  if (typeof paymentMethod !== "string" || !PAYMENT_METHODS.has(paymentMethod as PaymentMethod)) throw new Error("INVALID_INPUT");

  const clientEmail = optionalText(value.clientEmail, 200);
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) throw new Error("INVALID_INPUT");

  const clientPhone = optionalText(value.clientPhone, 30);
  const referenceNumber = optionalText(value.referenceNumber, 100);
  const customerId = optionalText(value.customerId, 100);

  return {
    clientName,
    description,
    paymentDate,
    paymentMethod: paymentMethod as PaymentMethod,
    amountAgorot: Number(amountAgorot),
    ...(clientPhone !== undefined ? { clientPhone } : {}),
    ...(clientEmail !== undefined ? { clientEmail } : {}),
    ...(referenceNumber !== undefined ? { referenceNumber } : {}),
    ...(customerId !== undefined ? { customerId } : {}),
  };
}
