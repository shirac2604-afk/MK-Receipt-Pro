import React,{useMemo,useState} from "react";
import type {CustomerRecord} from "../../../../../packages/database/src/types";
import type {StudentRecord,StudentGuardianRecord} from "../../../../../packages/shared/src/studentManagement";

type StudentDraft={
 id?:string;
 displayName:string;
 schoolName:string;
 schoolGrade:string;
 focusNotes:string;
 defaultPriceShekels:string;
 payerCustomerId:string;
 reminderEnabled:boolean;
 guardianName:string;
 guardianRelationship:string;
 guardianPhone:string;
 guardianEmail:string;
 guardianReceivesReminders:boolean;
};

export interface StudentWithGuardian extends StudentRecord{primaryGuardian?:StudentGuardianRecord|null}

export interface StudentsScreenProps{
 students:StudentWithGuardian[];
 customers:CustomerRecord[];
 loading?:boolean;
 onReload:()=>void|Promise<void>;
 onSave:(draft:StudentDraft)=>void|Promise<void>;
 onDeactivate:(studentId:string)=>void|Promise<void>;
}

const emptyDraft:StudentDraft={displayName:"",schoolName:"",schoolGrade:"",focusNotes:"",defaultPriceShekels:"",payerCustomerId:"",reminderEnabled:true,guardianName:"",guardianRelationship:"הורה",guardianPhone:"",guardianEmail:"",guardianReceivesReminders:true};
const money=(agorot:number)=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS"}).format(agorot/100);

export function StudentsScreen({students,customers,loading=false,onReload,onSave,onDeactivate}:StudentsScreenProps){
 const[query,setQuery]=useState("");
 const[editing,setEditing]=useState<StudentDraft|null>(null);
 const[saving,setSaving]=useState(false);
 const[error,setError]=useState("");
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return students;return students.filter(s=>[s.displayName,s.schoolName??"",s.schoolGrade??"",s.primaryGuardian?.displayName??"",s.primaryGuardian?.phone??""].some(x=>x.toLowerCase().includes(q)))},[students,query]);
 function beginEdit(student:StudentWithGuardian){setError("");setEditing({id:student.id,displayName:student.displayName,schoolName:student.schoolName??"",schoolGrade:student.schoolGrade??"",focusNotes:student.focusNotes??"",defaultPriceShekels:(student.defaultPriceAgorot/100).toFixed(2),payerCustomerId:student.payerCustomerId??"",reminderEnabled:student.reminderEnabled,guardianName:student.primaryGuardian?.displayName??"",guardianRelationship:student.primaryGuardian?.relationship??"הורה",guardianPhone:student.primaryGuardian?.phone??"",guardianEmail:student.primaryGuardian?.email??"",guardianReceivesReminders:student.primaryGuardian?.receivesReminders??true})}
 async function save(){if(!editing)return;setError("");if(editing.displayName.trim().length<2){setError("יש להזין שם תלמיד באורך שני תווים לפחות.");return}const price=Number(editing.defaultPriceShekels.replace(",","."));if(!Number.isFinite(price)||price<0){setError("מחיר השיעור אינו תקין.");return}setSaving(true);try{await onSave(editing);setEditing(null);await onReload()}catch(e){setError(e instanceof Error?e.message:"לא ניתן לשמור את התלמיד.")}finally{setSaving(false)}}
 return <>
  <header className="page-header students-page-header"><div><p className="eyebrow">ניהול למידה</p><h1>תלמידים</h1><p>כרטיס תלמיד מרכז את פרטי הלימוד, ההורה, המחיר והלקוח שמקבל את הקבלה.</p></div><button className="primary-button" onClick={()=>{setError("");setEditing({...emptyDraft})}}>＋ תלמיד חדש</button></header>
  <section className="students-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="חיפוש לפי תלמיד, הורה, כיתה או טלפון"/><button className="secondary-button" onClick={()=>void onReload()}>רענון</button></section>
  {loading?<section className="empty-card"><p>טוענת תלמידים…</p></section>:filtered.length===0?<section className="empty-card"><div className="empty-icon">♙</div><h2>{students.length?"לא נמצאו תלמידים":"עדיין אין תלמידים"}</h2><p>{students.length?"נסו חיפוש אחר.":"הוסיפו תלמיד ראשון כדי להתחיל לנהל שיעורים, נוכחות ותשלומים."}</p></section>:<section className="student-card-grid">{filtered.map(student=>{const payer=customers.find(c=>c.id===student.payerCustomerId);return <article className="student-card" key={student.id}><div className="student-card-head"><div className="student-avatar">{student.displayName.trim().slice(0,1)}</div><div><h2>{student.displayName}</h2><p>{[student.schoolGrade,student.schoolName].filter(Boolean).join(" • ")||"ללא פרטי מסגרת"}</p></div></div><div className="student-card-details"><div><span>הורה / איש קשר</span><strong>{student.primaryGuardian?.displayName||"לא הוגדר"}</strong><small>{student.primaryGuardian?.phone||student.primaryGuardian?.email||""}</small></div><div><span>מחיר ברירת מחדל</span><strong>{money(student.defaultPriceAgorot)}</strong></div><div><span>הלקוח המשלם</span><strong>{payer?.displayName||"לא קושר"}</strong></div><div><span>תזכורות</span><strong>{student.reminderEnabled?"פעילות":"כבויות"}</strong></div></div>{student.focusNotes&&<p className="student-focus-note">{student.focusNotes}</p>}<footer><button className="secondary-button" onClick={()=>beginEdit(student)}>עריכה</button><button className="danger-link" onClick={()=>void onDeactivate(student.id)}>העבר ללא פעיל</button></footer></article>})}</section>}
  {editing&&<div className="dialog-backdrop" onClick={()=>!saving&&setEditing(null)}><section className="details-dialog student-editor" onClick={e=>e.stopPropagation()}><button className="dialog-close" disabled={saving} onClick={()=>setEditing(null)}>×</button><p className="eyebrow">{editing.id?"עריכת כרטיס תלמיד":"תלמיד חדש"}</p><h2>{editing.id?editing.displayName||"תלמיד":"הוספת תלמיד"}</h2><div className="student-form-grid"><label className="field"><span>שם התלמיד *</span><input maxLength={160} value={editing.displayName} onChange={e=>setEditing({...editing,displayName:e.target.value})}/></label><label className="field"><span>כיתה</span><input maxLength={80} value={editing.schoolGrade} onChange={e=>setEditing({...editing,schoolGrade:e.target.value})}/></label><label className="field"><span>בית ספר</span><input maxLength={160} value={editing.schoolName} onChange={e=>setEditing({...editing,schoolName:e.target.value})}/></label><label className="field"><span>מחיר שיעור ₪</span><input inputMode="decimal" value={editing.defaultPriceShekels} onChange={e=>setEditing({...editing,defaultPriceShekels:e.target.value.replace(/[^0-9.,]/g,"").slice(0,12)})}/></label><label className="field student-wide"><span>דגשים לימודיים</span><textarea rows={3} maxLength={4000} value={editing.focusNotes} onChange={e=>setEditing({...editing,focusNotes:e.target.value})}/></label></div><div className="student-editor-section"><h3>הורה / איש קשר</h3><div className="student-form-grid"><label className="field"><span>שם</span><input maxLength={160} value={editing.guardianName} onChange={e=>setEditing({...editing,guardianName:e.target.value})}/></label><label className="field"><span>קרבה</span><input maxLength={80} value={editing.guardianRelationship} onChange={e=>setEditing({...editing,guardianRelationship:e.target.value})}/></label><label className="field"><span>טלפון</span><input inputMode="tel" maxLength={20} value={editing.guardianPhone} onChange={e=>setEditing({...editing,guardianPhone:e.target.value.replace(/[^0-9+() -]/g,"")})}/></label><label className="field"><span>אימייל</span><input type="email" maxLength={254} value={editing.guardianEmail} onChange={e=>setEditing({...editing,guardianEmail:e.target.value})}/></label></div></div><div className="student-editor-section"><h3>תשלום ואוטומציה</h3><label className="field"><span>לקוח שמשלם ומקבל קבלה</span><select value={editing.payerCustomerId} onChange={e=>setEditing({...editing,payerCustomerId:e.target.value})}><option value="">לא קושר עדיין</option>{customers.map(c=><option key={c.id} value={c.id}>{c.displayName}{c.phone?` • ${c.phone}`:""}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={editing.reminderEnabled} onChange={e=>setEditing({...editing,reminderEnabled:e.target.checked})}/><span>הפעל תזכורות לשיעורים עבור תלמיד זה</span></label><label className="check-row"><input type="checkbox" checked={editing.guardianReceivesReminders} onChange={e=>setEditing({...editing,guardianReceivesReminders:e.target.checked})}/><span>שלח תזכורות גם להורה / איש הקשר</span></label></div>{error&&<p className="form-error">{error}</p>}<div className="dialog-actions"><button className="secondary-button" disabled={saving} onClick={()=>setEditing(null)}>ביטול</button><button className="primary-button" disabled={saving} onClick={()=>void save()}>{saving?"שומר…":"שמור תלמיד"}</button></div></section></div>}
 </>
}

export type {StudentDraft};
