import React,{useCallback,useEffect,useState} from "react";
import type {StudentSaveInput,StudentWithGuardian} from "../../../../../packages/database/src/studentTypes";
import {StudentsScreen,type StudentDraft} from "./StudentsScreen";
import "./students.css";

function unwrap<T>(result:{success:boolean;data?:T;error?:{message?:string}}):T{if(!result.success)throw new Error(result.error?.message||"הפעולה נכשלה.");return result.data as T;}
export function StudentsContainer(){
 const[students,setStudents]=useState<StudentWithGuardian[]>([]),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{setStudents(unwrap(await window.mkApi.students.list()));}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function save(draft:StudentDraft){const price=Number(draft.defaultPriceShekels.replace(",","."));const input:StudentSaveInput={...(draft.id?{id:draft.id}:{}),displayName:draft.displayName,phone:draft.phone,email:draft.email,schoolName:draft.schoolName,schoolGrade:draft.schoolGrade,focusNotes:draft.focusNotes,defaultPriceAgorot:Math.round(price*100),payerCustomerId:"",reminderEnabled:draft.reminderEnabled,guardianName:draft.guardianName,guardianRelationship:draft.guardianRelationship,guardianPhone:draft.guardianPhone,guardianEmail:draft.guardianEmail,guardianReceivesReminders:draft.guardianReceivesReminders};unwrap(await window.mkApi.students.save(input));}
 async function deactivate(studentId:string){if(!window.confirm("להעביר את התלמיד ללא פעיל? היסטוריית השיעורים תישמר בסביבת הבדיקה."))return;unwrap(await window.mkApi.students.deactivate(studentId));await load();}
 return <StudentsScreen students={students} customers={[]} loading={loading} onReload={load} onSave={save} onDeactivate={deactivate}/>;
}
