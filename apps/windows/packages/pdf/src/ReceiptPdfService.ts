import { BrowserWindow } from "electron";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderReceiptHtml } from "./ReceiptTemplateV1";
import type { PdfCreationResult, ReceiptPdfModel } from "./types";

export class ReceiptPdfService {
  constructor(private readonly documentsRoot: string, private readonly getLogoPath?: () => string | null | undefined) {}

  async createOriginal(model: ReceiptPdfModel): Promise<PdfCreationResult> {
    return this.create(model, "Original");
  }

  async createCancellation(model: ReceiptPdfModel): Promise<PdfCreationResult> {
    return this.create(model, "Cancelled");
  }

  private async create(model: ReceiptPdfModel, suffix: "Original" | "Cancelled"): Promise<PdfCreationResult> {
    const month = model.paymentDate.slice(5, 7);
    const year = model.paymentDate.slice(0, 4);
    const directory = path.join(this.documentsRoot, "מפתחות להצלחה", "קבלות", year, month);
    fs.mkdirSync(directory, { recursive: true });
    const fileSuffix = suffix === "Original" ? "מקור" : "ביטול";
    const finalPath = path.join(directory, `קבלה-${model.receiptNumber}-${fileSuffix}.pdf`);
    if (fs.existsSync(finalPath)) {
      const existing=fs.readFileSync(finalPath);
      if(existing.length<1000)throw new Error("PDF_EXISTING_FILE_CONFLICT");
      return {path:finalPath,fileHash:createHash("sha256").update(existing).digest("hex"),fileSize:existing.length,createdAt:fs.statSync(finalPath).mtime.toISOString(),templateVersion:1};
    }
    const tempPath = `${finalPath}.tmp`;
    const logoPath = model.business.logoPath && fs.existsSync(model.business.logoPath) ? model.business.logoPath : this.getLogoPath?.();
    const logoDataUrl = logoPath && fs.existsSync(logoPath)
      ? `data:image/${path.extname(logoPath).toLowerCase().replace(".", "") === "jpg" ? "jpeg" : path.extname(logoPath).toLowerCase().replace(".", "")};base64,${fs.readFileSync(logoPath).toString("base64")}` : undefined;
    const html = renderReceiptHtml(model, logoDataUrl);
    const htmlPath = path.join(directory, `.receipt-${model.receiptNumber}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
    });
    try {
      await pdfWindow.loadURL(pathToFileURL(htmlPath).toString());
      const data = await pdfWindow.webContents.printToPDF({
        pageSize: "A4", printBackground: true, preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      fs.writeFileSync(tempPath, data);
      if (data.length < 1000) throw new Error("PDF_VERIFICATION_FAILED");
      fs.renameSync(tempPath, finalPath);
      const fileHash = createHash("sha256").update(data).digest("hex");
      return { path: finalPath, fileHash, fileSize: data.length, createdAt: new Date().toISOString(), templateVersion: 2 };
    } finally {
      pdfWindow.destroy();
      try { fs.rmSync(htmlPath, { force: true }); } catch {}
      try { fs.rmSync(tempPath, { force: true }); } catch {}
    }
  }
}
