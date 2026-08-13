import React,{useCallback,useEffect,useState} from "react";
import type {CustomerRecord} from "../../../../../packages/database/src/types";
import type {StudentSaveInput,StudentWithGuardian} from "../../../../../packages/database/src/studentTypes";
import {StudentsScreen,type StudentDraft} from "./StudentsScreen";
import "./students.css";

function unwrap<T>(result:{success:boolean;data?:T;error?:{message?:string}}):T{
  if(!result.success)throw new Error(result.error?.message||"הפעולה נכשלה.");
  return result.data as T;
}

export function StudentsContainer(){
  const[students,setStudents]=useState<StudentWithGuardian[]>([]);
  const[customers,setCustomers]=useState<CustomerRecord[]>([]);
  const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const[studentResult,customerResult]=await Promise.all([window.mkApi.students.list(),window.mkApi.customers.list()]);
      setStudents(unwrap(studentResult));
      setCustomers(unwrap(customerResult));
    }finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load()},[load]);

  async function save(draft:StudentDraft){
    const price=Number(draft.defaultPriceShekels.replace(",","."));
    const input:StudentSaveInput={
      ...(draft.id?{id:draft.id}:{}),displayName:draft.displayName,schoolName:draft.schoolName,schoolGrade:draft.schoolGrade,
      focusNotes:draft.focusNotes,defaultPriceAgorot:Math.round(price*100),payerCustomerId:draft.payerCustomerId,
      reminderEnabled:draft.reminderEnabled,guardianName:draft.guardianName,guardianRelationship:draft.guardianRelationship,
      guardianPhone:draft.guardianPhone,guardianEmail:draft.guardianEmail,guardianReceivesReminders:draft.guardianReceivesReminders
    };
    unwrap(await window.mkApi.students.save(input));
  }
  async function deactivate(studentId:string){
    if(!window.confirm("להעביר את התלמיד ללא פעיל? היסטוריית השיעורים והקבלות תישמר."))return;
    unwrap(await window.mkApi.students.deactivate(studentId));
    await load();
  }
  return <StudentsScreen students={students} customers={customers} loading={loading} onReload={load} onSave={save} onDeactivate={deactivate}/>;
}
