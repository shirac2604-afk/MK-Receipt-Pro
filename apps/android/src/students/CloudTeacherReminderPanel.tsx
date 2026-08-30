import React,{useEffect,useMemo,useState} from "react";
import {Alert,Pressable,StyleSheet,Text,View} from "react-native";
import type {CloudLessonItem} from "../data/supabase/LessonCloudRepository";
import {theme} from "../theme/theme";
import {TeacherReminderNotificationService,type TeacherReminderNotification} from "./TeacherReminderNotificationService";

const fmt=(iso:string)=>new Intl.DateTimeFormat("he-IL",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));

export function CloudTeacherReminderPanel({items}:{items:CloudLessonItem[]}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const reminders=useMemo<TeacherReminderNotification[]>(()=>{
  const unique=new Map<string,CloudLessonItem>();for(const item of items)if(!unique.has(item.lessonId))unique.set(item.lessonId,item);
  return [...unique.values()].flatMap(item=>{const leads=[item.parentReminderMinutes,item.studentReminderMinutes].filter(minutes=>minutes>0);const minutes=Math.min(...leads);const scheduledAt=new Date(new Date(item.startsAt).getTime()-minutes*60_000);if(!Number.isFinite(minutes)||scheduledAt.getTime()<=Date.now()||item.attendance==="cancelled")return [];return [{dedupeKey:`cloud:${item.lessonId}:${scheduledAt.toISOString()}`,lessonId:item.lessonId,scheduledFor:scheduledAt.toISOString(),title:"תזכורת לשיעור",body:`${item.title} · ${fmt(item.startsAt)}`,data:{source:"cloud-schedule"}}];});
 },[items]);
 useEffect(()=>{void TeacherReminderNotificationService.isEnabled().then(setEnabled)},[]);
 useEffect(()=>{if(!enabled)return;void TeacherReminderNotificationService.sync(reminders).catch(e=>setError(e instanceof Error?e.message:"לא ניתן לעדכן את ההתראות."));},[enabled,reminders]);
 async function toggle(){setBusy(true);setError("");try{if(enabled){await TeacherReminderNotificationService.setEnabled(false);setEnabled(false);return;}if(!await TeacherReminderNotificationService.requestPermission()){Alert.alert("התראות במכשיר","לא ניתנה הרשאה להצגת התראות.");return;}await TeacherReminderNotificationService.setEnabled(true);await TeacherReminderNotificationService.sync(reminders);setEnabled(true);}catch(e){setError(e instanceof Error?e.message:"לא ניתן להפעיל התראות במכשיר.");}finally{setBusy(false)}}
 return <View style={s.card}><Text style={s.title}>תזכורות למורה</Text><Text style={s.copy}>ההתראות מתוזמנות מהיומן המשותף ומופיעות רק בטלפון שלך. לא נשלחות הודעות חיצוניות לתלמידים או להורים.</Text><Text style={s.meta}>{reminders.length?`${reminders.length} תזכורות עתידיות לפי הגדרות השיעורים.`:"אין תזכורות עתידיות לפי הגדרות השיעורים."}</Text><Pressable disabled={busy} style={[s.button,enabled&&s.buttonOff]} onPress={()=>void toggle()}><Text style={s.buttonText}>{enabled?"כיבוי התראות במכשיר":"הפעלת התראות במכשיר"}</Text></Pressable>{error?<Text style={s.error}>{error}</Text>:null}</View>;
}
const s=StyleSheet.create({card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:theme.radius,padding:17,gap:8},title:{textAlign:"right",fontSize:18,fontWeight:"900",color:theme.text},copy:{textAlign:"right",color:theme.muted,lineHeight:20},meta:{textAlign:"right",fontWeight:"700",color:theme.accentStrong,fontSize:12},button:{backgroundColor:theme.accent,borderRadius:14,padding:13,alignItems:"center"},buttonOff:{backgroundColor:theme.primary},buttonText:{color:"#fff",fontWeight:"900"},error:{textAlign:"right",color:"#B54852",fontWeight:"700",fontSize:12}});
