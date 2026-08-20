export interface ManualWhatsAppDraft {
  phone: string;
  message: string;
}

const MAX_MESSAGE_LENGTH = 2_000;

function normalizePhone(rawPhone: string): string {
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Israeli contacts are often stored locally (for example, 05X...). wa.me
  // requires the international form, without the plus sign.
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    digits = `972${digits.slice(1)}`;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error("INVALID_MANUAL_WHATSAPP_PHONE");
  return digits;
}

function normalizeMessage(rawMessage: string): string {
  const message = rawMessage.trim();
  if (!message || message.length > MAX_MESSAGE_LENGTH) throw new Error("INVALID_MANUAL_WHATSAPP_MESSAGE");
  return message;
}

export function createManualWhatsAppUrl(draft: ManualWhatsAppDraft): string {
  const phone = normalizePhone(draft.phone);
  const message = normalizeMessage(draft.message);
  const url = new URL(`https://wa.me/${phone}`);
  url.searchParams.set("text", message);
  return url.toString();
}

export function normalizeManualWhatsAppMessage(rawMessage: string): string {
  return normalizeMessage(rawMessage);
}
