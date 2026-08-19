import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY="@mk-receipt-pro/student-test-v1";
export type MobileAttendance="scheduled"|"attended"|"absent";
export type MobilePayment="unpaid"|"paid";
export type MobileStudent={id:string;displayName:string;phone:string;schoolGrade:string;guardianName:string;guardianPhone:string;focusNotes:string;defaultPriceAgorot:number;createdAt:string;updatedAt:string};
export type MobileGroup={id:string;name:string;studentIds:string[];defaultPriceAgorot:number;createdAt:string;updatedAt:string};
export type MobileLessonParticipant={studentId:string;attendance:MobileAttendance;payment:MobilePayment;amountAgorot:number;paidAt:string|null};
export type MobileLesson={id:string;seriesId:string|null;kind:"individual"|"group";studentId:string|null;groupId:string|null;title:string;startsAt:string;endsAt:string;lessonSummary:string;homework:string;participants:MobileLessonParticipant[];createdAt:string;updatedAt:string};
type State={version:2;students:MobileStudent[];groups:MobileGroup[];lessons:MobileLesson[]};

const empty=():State=>({version:2,students:[],groups:[],lessons:[]});
const id=(prefix:string)=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const now=()=>new Date().toISOString();
function asMoney(value:number){if(!Number.isInteger(value)||value<0||value>100_000_000)throw new Error("יש להזין מחיר תקין.");return value;}
function migrate(raw:any):State{
 if(raw?.version===2&&Array.isArray(raw.students)&&Array.isArray(raw.groups)&&Array.isArray(raw.lessons))return raw as State;
 if(raw?.version===1&&Array.isArray(raw.students)&&Array.isArray(raw.groups)&&Array.isArray(raw.lessons)){
  const students:MobileStudent[]=raw.students.map((x:any)=>({...x,guardianName:"",guardianPhone:"",focusNotes:""}));
  const groups:MobileGroup[]=raw.groups.map((x:any)=>({...x,defaultPriceAgorot:0}));
  const groupMap=new Map(groups.map(x=>[x.id,x]));
  const lessons:MobileLesson[]=raw.lessons.map((x:any)=>{const ids=x.kind==="group"?(groupMap.get(x.groupId)?.studentIds??[]):[x.studentId].filter(Boolean);return{id:x.id,seriesId:null,kind:x.kind,studentId:x.studentId??null,groupId:x.groupId??null,title:x.title,startsAt:x.startsAt,endsAt:x.endsAt,lessonSummary:"",homework:"",participants:ids.map((studentId:string)=>({studentId,attendance:x.attendance??"scheduled",payment:x.payment??"unpaid",amountAgorot:Number(x.amountAgorot)||0,paidAt:x.payment==="paid"?x.updatedAt??now():null})),createdAt:x.createdAt??now(),updatedAt:x.updatedAt??now()};});
  return{version:2,students,groups,lessons};
 }
 return empty();
}
async function read():Promise<State>{try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return empty();const state=migrate(JSON.parse(raw));if(state.version===2)return state;}catch{}return empty();}
async function write(state:State){await AsyncStorage.setItem(KEY,JSON.stringify(state));}

export const StudentLocalStore={
 async listStudents(){return (await read()).students.sort((a,b)=>a.displayName.localeCompare(b.displayName,"he"));},
 async saveStudent(input:{displayName:string;phone:string;schoolGrade:string;guardianName?:string;guardianPhone?:string;focusNotes?:string;defaultPriceAgorot:number}){
  const name=input.displayName.trim();if(name.length<2||name.length>160)throw new Error("יש להזין שם תלמיד תקין.");const state=await read(),ts=now();const student:MobileStudent={id:id("student"),displayName:name,phone:input.phone.trim().slice(0,20),schoolGrade:input.schoolGrade.trim().slice(0,80),guardianName:(input.guardianName??"").trim().slice(0,160),guardianPhone:(input.guardianPhone??"").trim().slice(0,20),focusNotes:(input.focusNotes??"").trim().slice(0,2000),defaultPriceAgorot:asMoney(input.defaultPriceAgorot),createdAt:ts,updatedAt:ts};state.students.push(student);await write(state);return student;
 },
 async listGroups(){return (await read()).groups.sort((a,b)=>a.name.localeCompare(b.name,"he"));},
 async saveGroup(input:{name:string;studentIds:string[];defaultPriceAgorot:number}){
  const name=input.name.trim();if(name.length<2||name.length>160)throw new Error("יש להזין שם קבוצה.");const unique=[...new Set(input.studentIds)];if(unique.length<2)throw new Error("לקבוצה יש לבחור לפחות שני תלמידים.");const state=await read(),active=new Set(state.students.map(x=>x.id));if(unique.some(x=>!active.has(x)))throw new Error("אחד התלמידים שנבחרו אינו קיים.");const ts=now();const group:MobileGroup={id:id("group"),name,studentIds:unique,defaultPriceAgorot:asMoney(input.defaultPriceAgorot),createdAt:ts,updatedAt:ts};state.groups.push(group);await write(state);return group;
 },
 async listLessons(){return (await read()).lessons.sort((a,b)=>a.startsAt.localeCompare(b.startsAt));},
 async createLessons(input:{kind:"individual"|"group";studentId?:string|null;groupId?:string|null;title:string;startsAt:string;durationMinutes:number;amountAgorot?:number|null;recurrenceIntervalWeeks:0|1|2;endsOn?:string|null}){
  const state=await read(),start=new Date(input.startsAt);if(Number.isNaN(start.getTime()))throw new Error("מועד השיעור אינו תקין.");if(input.durationMinutes<15||input.durationMinutes>480)throw new Error("משך השיעור אינו תקין.");
  const student=input.kind==="individual"?state.students.find(x=>x.id===input.studentId):null,group=input.kind==="group"?state.groups.find(x=>x.id===input.groupId):null;if(input.kind==="individual"&&!student)throw new Error("יש לבחור תלמיד.");if(input.kind==="group"&&!group)throw new Error("יש לבחור קבוצה.");
  const participantIds=input.kind==="group"?group!.studentIds:[student!.id],defaultAmount=input.kind==="group"?group!.defaultPriceAgorot:student!.defaultPriceAgorot,amount=asMoney(input.amountAgorot==null?defaultAmount:Math.round(input.amountAgorot));const seriesId=input.recurrenceIntervalWeeks?id("series"):null;
  let until:Date|null=null;if(input.recurrenceIntervalWeeks){until=input.endsOn?new Date(`${input.endsOn}T23:59:59`):new Date(start.getTime()+182*86400000);if(Number.isNaN(until.getTime())||until<start)throw new Error("תאריך סיום הסדרה אינו תקין.");}
  const created:MobileLesson[]=[],max=60;for(let i=0;i<max;i++){const occurrence=new Date(start);if(input.recurrenceIntervalWeeks)occurrence.setDate(start.getDate()+i*7*input.recurrenceIntervalWeeks);else if(i>0)break;if(until&&occurrence>until)break;const ts=now();const lesson:MobileLesson={id:id("lesson"),seriesId,kind:input.kind,studentId:input.kind==="individual"?student!.id:null,groupId:input.kind==="group"?group!.id:null,title:input.title.trim().slice(0,160)||"שיעור",startsAt:occurrence.toISOString(),endsAt:new Date(occurrence.getTime()+input.durationMinutes*60000).toISOString(),lessonSummary:"",homework:"",participants:participantIds.map(studentId=>({studentId,attendance:"scheduled",payment:"unpaid",amountAgorot:amount,paidAt:null})),createdAt:ts,updatedAt:ts};state.lessons.push(lesson);created.push(lesson);}
  await write(state);return created;
 },
 async updateParticipant(lessonId:string,studentId:string,patch:Partial<Pick<MobileLessonParticipant,"attendance"|"payment">>){const state=await read(),lesson=state.lessons.find(x=>x.id===lessonId);if(!lesson)throw new Error("השיעור לא נמצא.");const participant=lesson.participants.find(x=>x.studentId===studentId);if(!participant)throw new Error("התלמיד לא נמצא במפגש.");if(patch.attendance)participant.attendance=patch.attendance;if(patch.payment){participant.payment=patch.payment;participant.paidAt=patch.payment==="paid"?now():null;}lesson.updatedAt=now();await write(state);return lesson;},
 async saveLessonNotes(lessonId:string,lessonSummary:string,homework:string){const state=await read(),lesson=state.lessons.find(x=>x.id===lessonId);if(!lesson)throw new Error("השיעור לא נמצא.");lesson.lessonSummary=lessonSummary.trim().slice(0,4000);lesson.homework=homework.trim().slice(0,4000);lesson.updatedAt=now();await write(state);return lesson;},
 async listOpenPayments(){const state=await read(),students=new Map(state.students.map(x=>[x.id,x]));return state.lessons.flatMap(lesson=>lesson.participants.filter(p=>p.attendance==="attended"&&p.payment==="unpaid"&&p.amountAgorot>0).map(participant=>({lesson,participant,student:students.get(participant.studentId)!}))).filter(x=>x.student).sort((a,b)=>a.lesson.startsAt.localeCompare(b.lesson.startsAt));},
 async reset(){await AsyncStorage.removeItem(KEY);}
};
