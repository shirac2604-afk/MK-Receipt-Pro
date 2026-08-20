import type {ReminderAudience,ReminderChannel,ReminderStatus} from "./studentTypes";

export interface LessonReminderHistoryItem {
  id:string;
  lessonId:string;
  studentId:string;
  studentName:string;
  lessonTitle:string;
  lessonStartsAt:string;
  audience:ReminderAudience;
  channel:ReminderChannel;
  scheduledFor:string;
  status:ReminderStatus;
  sentAt:string|null;
  attemptCount:number;
  lastError:string|null;
}
