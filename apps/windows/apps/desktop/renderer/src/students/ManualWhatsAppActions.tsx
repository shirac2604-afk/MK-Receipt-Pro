import React from "react";
import type { LessonCalendarItem } from "../../../../../packages/database/src/studentTypes";

interface Props {
  item: LessonCalendarItem;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

function draftFor(item: LessonCalendarItem): { phone: string; message: string } | null {
  const guardian = item.guardian;
  if (!guardian?.phone?.trim() || !guardian.receivesReminders || !item.student.active || !item.student.reminderEnabled || item.lesson.status !== "scheduled") return null;
  const startsAt = new Intl.DateTimeFormat("he-IL", { dateStyle: "full", timeStyle: "short" }).format(new Date(item.lesson.startsAt));
  return {
    phone: guardian.phone,
    message: `שלום ${guardian.displayName},\nתזכורת: ל${item.student.displayName} יש ${item.lesson.title} ב־${startsAt}.`,
  };
}

export function ManualWhatsAppActions({ item, onNotice, onError }: Props) {
  const draft = draftFor(item);
  if (!draft) return null;
  const { phone, message } = draft;
  async function copy(): Promise<void> {
    try {
      const result = await window.mkApi.reminders.copyManualWhatsApp(message);
      if (!result.success) throw new Error(result.error?.message || "לא ניתן להעתיק את התזכורת.");
      onNotice("נוסח התזכורת הועתק. אפשר להדביק אותו ב־WhatsApp Business.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "לא ניתן להעתיק את התזכורת.");
    }
  }
  async function open(): Promise<void> {
    try {
      const result = await window.mkApi.reminders.openManualWhatsApp(phone, message);
      if (!result.success) throw new Error(result.error?.message || "לא ניתן לפתוח את WhatsApp.");
      onNotice("נפתחה שיחת WhatsApp עם נוסח מוכן. ההודעה לא נשלחה — יש לאשר שליחה ב־WhatsApp.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "לא ניתן לפתוח את WhatsApp.");
    }
  }
  return <div className="manual-whatsapp-actions"><button className="secondary-button" onClick={() => void copy()}>העתק תזכורת</button><button className="secondary-button" title="ההודעה לא נשלחת לפני אישור ב־WhatsApp" onClick={() => void open()}>פתח WhatsApp</button></div>;
}
