import type { IssueReceiptInput, PaymentMethod } from "../../../database/src/types";
import { MoneyService } from "../money/MoneyService";

const paymentMethods = new Set<PaymentMethod>([
  "cash", "bank_transfer", "bit", "paybox",
]);

export class ReceiptValidationService {
  validate(input: IssueReceiptInput): IssueReceiptInput {
    const clientName = input.clientName.trim();
    const description = input.description.trim();
    if (clientName.length < 2 || clientName.length > 150) throw new Error("INVALID_CLIENT_NAME");
    if (description.length < 2 || description.length > 1000) throw new Error("INVALID_DESCRIPTION");
    MoneyService.assertValidAgorot(input.amountAgorot);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) throw new Error("INVALID_PAYMENT_DATE");
    if (!paymentMethods.has(input.paymentMethod)) throw new Error("INVALID_PAYMENT_METHOD");
    if (input.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail)) throw new Error("INVALID_CLIENT_EMAIL");

    return {
      clientName,
      description,
      amountAgorot: input.amountAgorot,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      ...(input.clientPhone ? { clientPhone: input.clientPhone.trim() } : {}),
      ...(input.clientEmail ? { clientEmail: input.clientEmail.trim().toLowerCase() } : {}),
      ...(input.referenceNumber ? { referenceNumber: input.referenceNumber.trim() } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
    };
  }
}
