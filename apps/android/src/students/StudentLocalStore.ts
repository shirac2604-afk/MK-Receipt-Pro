import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY="@mk-receipt-pro/student-test-v1";

export type MobileStudent={id:string;displayName:string;phone:string;schoolGrade:string;defaultPriceAgorot:number;createdAt:string;updatedAt:string};
export type MobileGroup={id:string;name:string;studentIds:string[];createdAt:string;updatedAt:string};
export type MobileLesson={id:string;kind:"individual"|"group";studentId:string|null;groupId:string|null;title:string;startsAt:string;endsAt:string;amountAgorot:number;attendance:"scheduled"|"attended"|"absent";payment:"unpaid"|"paid";createdAt:string;updatedAt:string};
type State={version:1;students:MobileStudent[];groups:MobileGroup[];lessons:MobileLesson[]};

const empty=():State=>({version:1,students:[],groups:[],lessons:[]});
const id=(prefix:string)=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const now=()=>new Date().toISOString();

async function read():Promise<State>{
 try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return empty();const parsed=JSON.parse(raw);if(parsed?.version===1&&Array.isArray(parsed.students)&&Array.isArray(parsed.groups)&&Array.isArray(parsed.lessons))return parsed as State;}catch{}
 return empty();
}
async function write(state:State){await AsyncStorage.setItem(KEY,JSON.stringify(state));}

export const StudentLocalStore={
 async listStudents(){return (await read()).students.sort((a,b)=>a.displayName.localeCompare(b.displayName,"he"));},
 async saveStudent(input:{displayName:string;phone:string;schoolGrade:string;defaultPriceAgorot:number}){
  const name=input.displayName.trim();if(name.length<2)throw new Error("יש להזין שם תלמיד תקין.");
  if(!Number.isInteger(input.defaultPriceAgorot)||input.defaultPriceAgorot<0)throw new Error("יש להזין מחיר תקין.");
  const state=await read(),ts=now();const student:MobileStudent={id:id("student"),displayName:name,phone:input.phone.trim(),schoolGrade:input.schoolGrade.trim(),defaultPriceAgorot:input.defaultPriceAgorot,createdAt:ts,updatedAt:ts};state.students.push(student);await write(state);return student;
 },
 async listGroups(){return (await read()).groups.sort((a,b)=>a.name.localeCompare(b.name,"he"));},
 async saveGroup(input:{name:string;studentIds:string[]}){
  const name=input.name.trim();if(name.length<2)throw new Error("יש להזין שם קבוצה.");const unique=[...new Set(input.studentIds)];if(unique.length<2)throw new Error("לקבוצה יש לבחור לפחות שני תלמידים.");
  const state=await read(),active=new Set(state.students.map(x=>x.id));if(unique.some(x=>!active.has(x)))throw new Error("אחד התלמידים שנבחרו אינו קיים.");const ts=now();const group:MobileGroup={id:id("group"),name,studentIds:unique,createdAt:ts,updatedAt:ts};state.groups.push(group);await write(state);return group;
 },
 async listLessons(){return (await read()).lessons.sort((a,b)=>a.startsAt.localeCompare(b.startsAt));},
 async createLesson(input:{kind:"individual"|"group";studentId?:string|null;groupId?:string|null;title:string;startsAt:string;durationMinutes:number;amountAgorot:number}){
  const state=await read(),start=new Date(input.startsAt);if(Number.isNaN(start.getTime()))throw new Error("מועד השיעור אינו תקין.");if(input.durationMinutes<15||input.durationMinutes>480)throw new Error("משך השיעור אינו תקין.");if(input.amountAgorot<0)throw new Error("המחיר אינו תקין.");
  if(input.kind==="individual"&&!state.students.some(x=>x.id===input.studentId))throw new Error("יש לבחור תלמיד.");if(input.kind==="group"&&!state.groups.some(x=>x.id===input.groupId))throw new Error("יש לבחור קבוצה.");
  const ts=now();const lesson:MobileLesson={id:id("lesson"),kind:input.kind,studentId:input.studentId??null,groupId:input.groupId??null,title:input.title.trim()||"שיעור",startsAt:start.toISOString(),endsAt:new Date(start.getTime()+input.durationMinutes*60000).toISOString(),amountAgorot:Math.round(input.amountAgorot),attendance:"scheduled",payment:"unpaid",createdAt:ts,updatedAt:ts};state.lessons.push(lesson);await write(state);return lesson;
 },
 async updateLesson(idValue:string,patch:Partial<Pick<MobileLesson,"attendance"|"payment">>){const state=await read(),lesson=state.lessons.find(x=>x.id===idValue);if(!lesson)throw new Error("השיעור לא נמצא.");if(patch.attendance)lesson.attendance=patch.attendance;if(patch.payment)lesson.payment=patch.payment;lesson.updatedAt=now();await write(state);return lesson;},
 async reset(){await AsyncStorage.removeItem(KEY);}
};
