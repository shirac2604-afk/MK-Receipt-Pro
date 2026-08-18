import type {StudentGroupRecord,StudentRecord} from "./studentTypes";

export interface StudentGroupWithMembers extends StudentGroupRecord {
  members: StudentRecord[];
}

export interface StudentGroupSaveInput {
  id?: string;
  name: string;
  description?: string;
  studentIds: string[];
}

export interface GroupLessonSeriesSaveInput {
  groupId: string;
  title: string;
  weekday: 0|1|2|3|4|5|6;
  localStartTime: string;
  durationMinutes: number;
  recurrenceIntervalWeeks: number;
  startsOn: string;
  endsOn?: string;
  defaultPriceAgorot: number;
  parentReminderMinutes: number;
  studentReminderMinutes: number;
}
