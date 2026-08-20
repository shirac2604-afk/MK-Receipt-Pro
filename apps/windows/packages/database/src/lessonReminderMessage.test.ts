import {describe,expect,it} from "vitest";
import {buildLessonReminderMessage} from "./lessonReminderMessage";
import type {ClaimedLessonReminder} from "./studentTypes";

const base:ClaimedLessonReminder={reminderId:"r1",businessId:"b1",lessonId:"l1",studentId:"s1",guardianId:null,audience:"student",channel:"whatsapp",scheduledFor:"2026-08-18T12:00:00.000Z",studentName:"יואב כהן",recipientName:"יואב כהן",recipientPhone:"0500000000",recipientEmail:null,lessonTitle:"שיעור אנגלית",lessonStartsAt:"2026-08-18T14:00:00.000Z"};

describe("buildLessonReminderMessage",()=>{
 it("builds a student reminder",()=>{const result=buildLessonReminderMessage(base);expect(result.subject).toContain("יואב כהן");expect(result.text).toContain("תזכורת לשיעור שלך");expect(result.text).toContain("שיעור אנגלית");});
 it("builds a guardian reminder naming the student",()=>{const result=buildLessonReminderMessage({...base,guardianId:"g1",audience:"guardian",recipientName:"רונית כהן"});expect(result.text).toContain("שלום רונית כהן");expect(result.text).toContain("תזכורת לשיעור של יואב כהן");});
 it("rejects invalid lesson dates",()=>{expect(()=>buildLessonReminderMessage({...base,lessonStartsAt:"not-a-date"})).toThrow("INVALID_REMINDER_LESSON_DATE")});
});
