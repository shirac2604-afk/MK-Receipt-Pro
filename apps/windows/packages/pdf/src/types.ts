export interface ReceiptPdfModel {
  receiptId: string;
  receiptNumber: number;
  issuedAt: string;
  paymentDate: string;
  business: {
    businessName: string;
    ownerName: string;
    businessNumber: string;
    taxStatus: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    slogan: string | null;
    logoPath?: string | null;
  };
  client: { name: string; phone: string | null; email: string | null };
  cancellation?: { cancelledAt: string; reason: string };
  receipt: {
    description: string;
    amountAgorot: number;
    paymentMethod: string;
    referenceNumber: string | null;
  };
}

export interface PdfCreationResult {
  path: string;
  fileHash: string;
  fileSize: number;
  createdAt: string;
  templateVersion: number;
}
