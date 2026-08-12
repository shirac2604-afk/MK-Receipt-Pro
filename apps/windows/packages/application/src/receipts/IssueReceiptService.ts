import { randomUUID } from "node:crypto";
import type { BusinessSettingsRecord, IssueReceiptCoreResult, IssueReceiptInput } from "../../../database/src/types";
import type { DatabaseConnection } from "../../../database/src/DatabaseConnection";
import type { ReceiptRepository } from "../../../database/src/repositories/ReceiptRepository";
import { ReceiptValidationService } from "../../../domain/src/receipts/ReceiptValidationService";
import { ReceiptSnapshotService } from "../../../domain/src/receipts/ReceiptSnapshotService";
import { ReceiptHashService } from "../../../domain/src/receipts/ReceiptHashService";

export class IssueReceiptService {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly repository: ReceiptRepository,
    private readonly getBusinessSettings: () => BusinessSettingsRecord,
    private readonly validation = new ReceiptValidationService(),
    private readonly snapshots = new ReceiptSnapshotService(),
    private readonly hashes = new ReceiptHashService(),
  ) {}

  execute(rawInput: IssueReceiptInput, cloudReceiptNumber?:number): IssueReceiptCoreResult {
    const input = this.validation.validate(rawInput);
    const business = this.getBusinessSettings();
    return this.connection.transaction(() => {
      const customerInput = {
        name: input.clientName,
        phone: input.clientPhone ?? null,
        email: input.clientEmail ?? null,
        ...(input.customerId ? { customerId: input.customerId } : {}),
      };
      const customerId = this.repository.saveOrUpdateCustomer(customerInput);
      const receiptNumber = cloudReceiptNumber===undefined ? this.repository.allocateNextNumber() : this.repository.adoptCloudReceiptNumber(cloudReceiptNumber);
      const issuedAt = new Date().toISOString();
      const id = randomUUID();
      const snapshot = this.snapshots.create({...input,customerId}, business);
      const contentHash = this.hashes.create([
        String(receiptNumber), issuedAt, snapshot.businessJson, snapshot.clientJson, snapshot.receiptJson, "active",
      ]);
      this.repository.insert({
        id, receiptNumber, paymentDate: input.paymentDate, issuedAt,
        clientName: input.clientName, clientPhone: input.clientPhone ?? null,
        clientEmail: input.clientEmail ?? null, description: input.description,
        amountAgorot: input.amountAgorot, paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber ?? null, customerId,
        businessSnapshotJson: snapshot.businessJson, clientSnapshotJson: snapshot.clientJson,
        receiptSnapshotJson: snapshot.receiptJson, contentHash,
      });
      const receipt = this.repository.latest();
      if (!receipt || receipt.receiptNumber !== receiptNumber) throw new Error("RECEIPT_INSERT_VERIFICATION_FAILED");
      const status = this.repository.status();
      return { receipt, nextReceiptNumber: status.nextReceiptNumber };
    });
  }
}
