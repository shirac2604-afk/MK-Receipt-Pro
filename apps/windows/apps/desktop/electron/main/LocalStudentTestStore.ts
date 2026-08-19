import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {generateWeeklyOccurrenceDates} from "../../../../packages/database/src/studentAutomation";
import type {GroupLessonSeriesSaveInput,StudentGroupSaveInput,StudentGroupWithMembers} from "../../../../packages/database/src/groupTypes";
import type {AttendanceStatus,LessonCalendarItem,LessonParticipantRecord,LessonPaymentStatus,LessonRecord,LessonSeriesRecord,LessonSeriesSaveInput,StudentGroupRecord,StudentRecord,StudentSaveInput,StudentWithGuardian} from "../../../../packages/database/src/studentTypes";
import type {PaymentMethod} from "../../../../packages/database/src/types";

const BUSINESS_ID="local-student-test";
const PAYMENT_METHODS=new Set<PaymentMethod>(["cash","bank_transfer","bit","paybox"]);

type LocalGroup={record:StudentGroupRecord;studentIds:string[]};
type LocalState={version:1;students:StudentWithGuardian[];groups:LocalGroup[];series:LessonSeriesRecord[];lessons:LessonRecord[];participants:LessonParticipantRecord[]};

function emptyState():LocalState{return{version:1,students:[],groups:[],series:[],lessons:[],participants:[]};}
function now(){return new Date().toISOString();}
function id(prefix:string){return `${prefix}-${crypto.randomUUID()}`;}
function opt(value:unknown,max:number){if(typeof value!=="string")return null;const x=value.trim();if(!x)return null;if(x.length>max)throw new Error("INVALID_INPUT");return x;}
function phone(value:string|null){if(value&&!/^[0-9+()\- ]{6,20}$/.test(value))throw new Error("INVALID_STUDENT_PHONE");}
function email(value:string|null){if(value&&(value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))throw new Error("INVALID_STUDENT_EMAIL");}
function datePlus(value:string,days:number){const d=new Date(`${value}T12:00:00Z`);if(Number.isNaN(d.getTime()))throw new Error("INVALID_LESSON_DATE");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function localDateTime(date:string,time:string){const d=new Date(`${date}T${time}:00`);if(Number.isNaN(d.getTime()))throw new Error("INVALID_LESSON_DATETIME");return d;}

export class LocalStudentTestStore{
 private readonly filePath:string;
 private state:LocalState;
 constructor(userDataPath:string){this.filePath=path.join(userDataPath,"student-module","student-test-data.json");this.state=this.read();}
 private read():LocalState{try{const raw=JSON.parse(fs.readFileSync(this.filePath,"utf8"));if(raw?.version===1&&Array.isArray(raw.students)&&Array.isArray(raw.groups)&&Array.isArray(raw.series)&&Array.isArray(raw.lessons)&&Array.isArray(raw.participants))return raw as LocalState;}catch{}return emptyState();}
 private persist(){fs.mkdirSync(path.dirname(this.filePath),{recursive:true});const tmp=`${this.filePath}.tmp`;fs.writeFileSync(tmp,JSON.stringify(this.state,null,2),"utf8");fs.renameSync(tmp,this.filePath);}

 listStudents():StudentWithGuardian[]{return this.state.students.filter(x=>x.active).sort((a,b)=>a.displayName.localeCompare(b.displayName,"he")).map(x=>structuredClone(x));}
 saveStudent(input:StudentSaveInput):StudentWithGuardian{
  const displayName=String(input.displayName??"").trim();if(displayName.length<2||displayName.length>160)throw new Error("INVALID_STUDENT_INPUT");
  if(!Number.isInteger(input.defaultPriceAgorot)||input.defaultPriceAgorot<0||input.defaultPriceAgorot>100_000_000)throw new Error("INVALID_STUDENT_PRICE");
  const studentPhone=opt(input.phone,20),studentEmail=opt(input.email,254)?.toLowerCase()??null;phone(studentPhone);email(studentEmail);
  const schoolName=opt(input.schoolName,160),schoolGrade=opt(input.schoolGrade,80),focusNotes=opt(input.focusNotes,4000),ts=now();
  let existing=input.id?this.state.students.find(x=>x.id===input.id):undefined;
  const studentId=existing?.id??id("student");
  const createdAt=existing?.createdAt??ts;
  const guardianName=opt(input.guardianName,160),guardianPhone=opt(input.guardianPhone,20),guardianEmail=opt(input.guardianEmail,254)?.toLowerCase()??null;phone(guardianPhone);email(guardianEmail);
  const primaryGuardian=guardianName?{id:existing?.primaryGuardian?.id??id("guardian"),businessId:BUSINESS_ID,studentId,displayName:guardianName,relationship:opt(input.guardianRelationship,80),phone:guardianPhone,email:guardianEmail,isPrimary:true,receivesReminders:Boolean(input.guardianReceivesReminders),createdAt:existing?.primaryGuardian?.createdAt??ts,updatedAt:ts}:null;
  const saved:StudentWithGuardian={id:studentId,businessId:BUSINESS_ID,displayName,phone:studentPhone,email:studentEmail,schoolName,schoolGrade,focusNotes,defaultPriceAgorot:input.defaultPriceAgorot,payerCustomerId:null,reminderEnabled:Boolean(input.reminderEnabled),active:true,createdAt,updatedAt:ts,primaryGuardian};
  if(existing)this.state.students=this.state.students.map(x=>x.id===studentId?saved:x);else this.state.students.push(saved);this.persist();return structuredClone(saved);
 }
 deactivateStudent(studentId:string){const found=this.state.students.find(x=>x.id===studentId);if(!found)throw new Error("INVALID_STUDENT_INPUT");found.active=false;found.updatedAt=now();for(const g of this.state.groups)g.studentIds=g.studentIds.filter(x=>x!==studentId);this.persist();}

 listGroups():StudentGroupWithMembers[]{const students=new Map(this.state.students.filter(x=>x.active).map(x=>[x.id,x]));return this.state.groups.filter(x=>x.record.active).map(g=>({...structuredClone(g.record),members:g.studentIds.map(id=>students.get(id)).filter(Boolean).map(x=>{const {primaryGuardian:_,...student}=x!;return structuredClone(student);})})).sort((a,b)=>a.name.localeCompare(b.name,"he"));}
 saveGroup(input:StudentGroupSaveInput):StudentGroupWithMembers{
  const name=String(input.name??"").trim(),description=String(input.description??"").trim();if(name.length<2||name.length>160||description.length>2000)throw new Error("INVALID_GROUP");
  const studentIds=[...new Set(input.studentIds.filter(Boolean))];if(!studentIds.length)throw new Error("GROUP_REQUIRES_MEMBER");
  const active=new Set(this.state.students.filter(x=>x.active).map(x=>x.id));if(studentIds.some(x=>!active.has(x)))throw new Error("GROUP_MEMBER_NOT_FOUND");
  const ts=now(),existing=input.id?this.state.groups.find(x=>x.record.id===input.id):undefined,record:StudentGroupRecord={id:existing?.record.id??id("group"),businessId:BUSINESS_ID,name,description:description||null,active:true,createdAt:existing?.record.createdAt??ts,updatedAt:ts};
  const saved={record,studentIds};if(existing)this.state.groups=this.state.groups.map(x=>x.record.id===record.id?saved:x);else this.state.groups.push(saved);this.persist();return this.listGroups().find(x=>x.id===record.id)!;
 }
 deactivateGroup(groupId:string){const g=this.state.groups.find(x=>x.record.id===groupId);if(!g)throw new Error("GROUP_NOT_FOUND");g.record.active=false;g.record.updatedAt=now();this.persist();}

 listSeries():LessonSeriesRecord[]{return this.state.series.filter(x=>x.active).map(x=>structuredClone(x));}
 createIndividualSeries(input:LessonSeriesSaveInput):LessonSeriesRecord{
  const student=this.state.students.find(x=>x.id===input.studentId&&x.active);if(!student)throw new Error("LESSON_STUDENT_NOT_FOUND");
  const series=this.makeSeries("individual",input.studentId,null,input);this.generateSeries(series,[student.id]);return structuredClone(series);
 }
 createGroupSeries(input:GroupLessonSeriesSaveInput):LessonSeriesRecord{
  const group=this.state.groups.find(x=>x.record.id===input.groupId&&x.record.active);if(!group)throw new Error("GROUP_NOT_FOUND");if(!group.studentIds.length)throw new Error("GROUP_REQUIRES_MEMBER");
  const series=this.makeSeries("group",null,input.groupId,input);this.generateSeries(series,group.studentIds);return structuredClone(series);
 }
 private makeSeries(kind:"individual"|"group",studentId:string|null,groupId:string|null,input:LessonSeriesSaveInput|GroupLessonSeriesSaveInput):LessonSeriesRecord{
  if(String(input.title??"").trim().length<2||String(input.title).trim().length>160||!Number.isInteger(input.weekday)||input.weekday<0||input.weekday>6||!/^\d{2}:\d{2}$/.test(input.localStartTime)||input.durationMinutes<15||input.durationMinutes>480||input.recurrenceIntervalWeeks<1||input.recurrenceIntervalWeeks>12||input.defaultPriceAgorot<0)throw new Error("INVALID_LESSON_SERIES");
  const series:LessonSeriesRecord={id:id("series"),businessId:BUSINESS_ID,kind,studentId,groupId,title:String(input.title).trim(),weekday:input.weekday,localStartTime:input.localStartTime,durationMinutes:input.durationMinutes,recurrenceIntervalWeeks:input.recurrenceIntervalWeeks,startsOn:input.startsOn,endsOn:input.endsOn||null,defaultPriceAgorot:input.defaultPriceAgorot,parentReminderMinutes:Math.max(0,Math.min(10080,input.parentReminderMinutes)),studentReminderMinutes:Math.max(0,Math.min(10080,input.studentReminderMinutes)),active:true};this.state.series.push(series);return series;
 }
 private generateSeries(series:LessonSeriesRecord,studentIds:string[]){const horizon=series.endsOn??datePlus(series.startsOn,182),dates=generateWeeklyOccurrenceDates(series,horizon);for(const date of dates){const start=localDateTime(date,series.localStartTime),end=new Date(start.getTime()+series.durationMinutes*60000),existing=this.state.lessons.find(x=>x.seriesId===series.id&&x.startsAt===start.toISOString());let lesson=existing;if(!lesson){lesson={id:id("lesson"),businessId:BUSINESS_ID,seriesId:series.id,kind:series.kind,studentId:series.studentId,groupId:series.groupId,title:series.title,startsAt:start.toISOString(),endsAt:end.toISOString(),status:"scheduled",lessonSummary:null,homework:null};this.state.lessons.push(lesson);}for(const studentId of studentIds){if(this.state.participants.some(x=>x.lessonId===lesson.id&&x.studentId===studentId))continue;this.state.participants.push({id:id("participant"),businessId:BUSINESS_ID,lessonId:lesson.id,studentId,payerCustomerId:null,attendanceStatus:"scheduled",paymentStatus:"unpaid",amountAgorot:series.defaultPriceAgorot,paymentMethod:null,paidAt:null,receiptId:null,receiptRequestedAt:null,receiptError:null});}}this.persist();}

 listIndividualCalendar(fromIso:string,toIso:string){return this.listCalendar(fromIso,toIso,"individual");}
 listGroupCalendar(fromIso:string,toIso:string){return this.listCalendar(fromIso,toIso,"group");}
 listLessonsForSync(fromIso:string,toIso:string):LessonRecord[]{const from=new Date(fromIso),to=new Date(toIso);if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||to<=from)throw new Error("INVALID_LESSON_RANGE");return this.state.lessons.filter(x=>new Date(x.startsAt)>=from&&new Date(x.startsAt)<to).map(x=>structuredClone(x)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));}
 private listCalendar(fromIso:string,toIso:string,kind:"individual"|"group"):LessonCalendarItem[]{const from=new Date(fromIso),to=new Date(toIso);if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||to<=from)throw new Error("INVALID_LESSON_RANGE");const lessons=this.state.lessons.filter(x=>x.kind===kind&&new Date(x.startsAt)>=from&&new Date(x.startsAt)<to);const students=new Map(this.state.students.map(x=>[x.id,x]));const out:LessonCalendarItem[]=[];for(const lesson of lessons){for(const participant of this.state.participants.filter(x=>x.lessonId===lesson.id)){const student=students.get(participant.studentId);if(!student)continue;const {primaryGuardian,...studentRecord}=student;out.push({lesson:structuredClone(lesson),participant:structuredClone(participant),student:structuredClone(studentRecord),guardian:primaryGuardian?structuredClone(primaryGuardian):null});}}return out.sort((a,b)=>a.lesson.startsAt.localeCompare(b.lesson.startsAt)||a.student.displayName.localeCompare(b.student.displayName,"he"));}
 updateParticipant(participantId:string,attendanceStatus:string,paymentStatus:string,paymentMethod:string|null,amountAgorot:number):LessonParticipantRecord{
  if(!participantId||!["scheduled","attended","absent","cancelled","late_cancelled"].includes(attendanceStatus)||!["unpaid","paid","waived","refunded"].includes(paymentStatus)||!Number.isInteger(amountAgorot)||amountAgorot<0)throw new Error("INVALID_LESSON_PARTICIPANT");
  const p=this.state.participants.find(x=>x.id===participantId);if(!p)throw new Error("INVALID_LESSON_PARTICIPANT");if(paymentStatus==="paid"&&(!paymentMethod||!PAYMENT_METHODS.has(paymentMethod as PaymentMethod)))throw new Error("INVALID_LESSON_PAYMENT_METHOD");p.attendanceStatus=attendanceStatus as AttendanceStatus;p.paymentStatus=paymentStatus as LessonPaymentStatus;p.amountAgorot=amountAgorot;if(paymentStatus==="paid"){p.paymentMethod=paymentMethod as PaymentMethod;p.paidAt=now();}else{p.paymentMethod=null;p.paidAt=null;}p.receiptId=null;p.receiptRequestedAt=null;p.receiptError=null;this.persist();return structuredClone(p);
 }
 saveLessonNotes(lessonId:string,lessonSummary:string,homework:string):LessonRecord{const lesson=this.state.lessons.find(x=>x.id===lessonId);if(!lesson)throw new Error("INVALID_LESSON");if(lessonSummary.length>4000||homework.length>4000)throw new Error("INVALID_LESSON_NOTES");lesson.lessonSummary=lessonSummary.trim()||null;lesson.homework=homework.trim()||null;this.persist();return structuredClone(lesson);}
 reset(){this.state=emptyState();this.persist();}
}
