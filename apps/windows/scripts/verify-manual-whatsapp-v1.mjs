import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const service = read("apps/desktop/electron/main/ManualWhatsAppService.ts");
const handlers = read("apps/desktop/electron/ipc/manualWhatsAppHandlers.ts");
const preload = read("apps/desktop/electron/preload/preload.ts");
const individual = read("apps/desktop/renderer/src/students/LessonsScreen.tsx");
const groups = read("apps/desktop/renderer/src/students/GroupsScreen.tsx");
const actions = read("apps/desktop/renderer/src/students/ManualWhatsAppActions.tsx");

const checks = [
  [service.includes("https://wa.me/${phone}") && service.includes("digits = `972${digits.slice(1)}`"), "safe WhatsApp URL and local Israeli normalization"],
  [service.includes("MAX_MESSAGE_LENGTH") && service.includes("INVALID_MANUAL_WHATSAPP_MESSAGE"), "message length is bounded"],
  [handlers.includes("assertTrustedSender(event)") && handlers.includes("assertPayloadSize(payload)"), "manual actions require the trusted renderer"],
  [handlers.includes("clipboard.writeText") && handlers.includes("shell.openExternal(url)"), "copy and draft-opening actions are handled by Electron"],
  [preload.includes("copyManualWhatsApp") && preload.includes("openManualWhatsApp"), "renderer receives only explicit manual actions"],
  [actions.includes("guardian.receivesReminders") && actions.includes("item.student.reminderEnabled") && actions.includes("item.lesson.status !== \"scheduled\""), "actions require consent, enabled reminders, and a scheduled lesson"],
  [individual.includes("<ManualWhatsAppActions") && groups.includes("<ManualWhatsAppActions"), "manual helper is available for individual and group lessons"],
  [actions.includes("ההודעה לא נשלחה") && !actions.includes("dispatchNow"), "user-facing flow stays manual"],
];

let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed++;
}
console.log(`Manual WhatsApp contract: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
