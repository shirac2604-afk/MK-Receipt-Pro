import { clipboard, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import { apiFailure, apiSuccess, type ApiResult } from "../../../../packages/shared/src/api";
import { createManualWhatsAppUrl, normalizeManualWhatsAppMessage } from "../main/ManualWhatsAppService";
import { assertPayloadSize, assertTrustedSender, withTimeout } from "./security";

type ManualWhatsAppPayload = { phone?: unknown; message?: unknown };

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function manualWhatsAppError(error: unknown): ApiResult<never> {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (code === "UNTRUSTED_IPC_SENDER") return apiFailure("UNTRUSTED_IPC_SENDER", "הבקשה נחסמה מטעמי אבטחה.", false);
  if (code === "INVALID_MANUAL_WHATSAPP_PHONE") return apiFailure("INVALID_INPUT", "מספר הטלפון של ההורה אינו תקין לפתיחת WhatsApp.", false);
  if (code === "INVALID_MANUAL_WHATSAPP_MESSAGE") return apiFailure("INVALID_INPUT", "נוסח התזכורת אינו תקין.", false);
  if (code === "OPERATION_TIMEOUT") return apiFailure("OPERATION_TIMEOUT", "פתיחת WhatsApp ארכה זמן רב מדי. אפשר לנסות שוב.", false);
  return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן להשלים את פעולת WhatsApp כעת.", false);
}

async function handle<T>(event: IpcMainInvokeEvent, payload: unknown, action: () => T | Promise<T>): Promise<ApiResult<T>> {
  try {
    assertTrustedSender(event);
    assertPayloadSize(payload);
    return apiSuccess(await withTimeout(Promise.resolve().then(action), 10_000));
  } catch (error) {
    return manualWhatsAppError(error);
  }
}

export function registerManualWhatsAppHandlers(): void {
  ipcMain.handle("reminders:copy-manual-whatsapp", (event, input: ManualWhatsAppPayload) =>
    handle(event, input, () => {
      clipboard.writeText(normalizeManualWhatsAppMessage(text(input?.message)));
    }),
  );
  ipcMain.handle("reminders:open-manual-whatsapp", (event, input: ManualWhatsAppPayload) =>
    handle(event, input, async () => {
      const url = createManualWhatsAppUrl({ phone: text(input?.phone), message: text(input?.message) });
      await shell.openExternal(url);
    }),
  );
}
