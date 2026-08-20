import type {ClaimedLessonReminder} from "./studentTypes";

export interface ReminderMessage{subject:string;text:string;}

function formatDateTime(iso:string):string{
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))throw new Error("INVALID_REMINDER_LESSON_DATE");
 return new Intl.DateTimeFormat("he-IL",{weekday:"long",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
}

export function buildLessonReminderMessage(reminder:ClaimedLessonReminder):ReminderMessage{
 const recipient=reminder.recipientName.trim()||reminder.studentName.trim()||"שלום";
 const when=formatDateTime(reminder.lessonStartsAt);
 const audienceLine=reminder.audience==="guardian"?`תזכורת לשיעור של ${reminder.studentName}`:"תזכורת לשיעור שלך";
 return{
  subject:`תזכורת לשיעור – ${reminder.studentName}`,
  text:[`שלום ${recipient},`,`${audienceLine} נקבע ל${when}.`,reminder.lessonTitle?`נושא/מפגש: ${reminder.lessonTitle}.`:"","אם חל שינוי, נשמח לעדכון מראש.","מפתחות להצלחה"].filter(Boolean).join("\n")
 };
}
