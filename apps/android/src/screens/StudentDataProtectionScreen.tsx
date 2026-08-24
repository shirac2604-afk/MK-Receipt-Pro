import React,{useState} from "react";
import {Alert,Pressable,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {clearLegacyStudentTestData} from "../students/StudentLocalStore";
import {clearLegacyReminderTestData} from "../students/ReminderLocalStore";
import {theme} from "../theme/theme";

export default function StudentDataProtectionScreen(){
 const[cleared,setCleared]=useState(false);
 const clear=()=>Alert.alert("מחיקת נתוני בדיקה", "ניהול התלמידים במובייל הושהה עד לחיבור מאובטח לענן. הפעולה תמחק מהמכשיר נתוני תלמידים ותזכורות שנשמרו בגרסאות בדיקה ישנות.", [{text:"ביטול",style:"cancel"},{text:"מחקי נתוני בדיקה",style:"destructive",onPress:()=>void Promise.all([clearLegacyStudentTestData(),clearLegacyReminderTestData()]).then(()=>setCleared(true)).catch(()=>Alert.alert("לא ניתן למחוק", "נסי שוב לאחר פתיחה מחדש של האפליקציה."))}]);
 return <SafeAreaView style={s.safe}><View style={s.content}>
  <Text style={s.eyebrow}>ניהול תלמידים</Text><Text style={s.title}>הנתונים במובייל מוגנים</Text>
  <Text style={s.text}>המסך הזה אינו שומר פרטי תלמידים או הורים בטלפון. ניהול תלמידים ושיעורים יופעל מחדש רק אחרי סנכרון מאובטח לענן.</Text>
  <View style={s.card}><Text style={s.cardTitle}>{cleared?"נתוני הבדיקה נמחקו":"נשארו נתוני בדיקה ישנים?"}</Text><Text style={s.cardText}>{cleared?"לא נשמרו יותר נתוני תלמידים ותזכורות מקומיים באפליקציה.":"אפשר למחוק עכשיו נתונים מקומיים שנשמרו בגרסאות בדיקה קודמות."}</Text>{!cleared&&<Pressable style={s.button} onPress={clear}><Text style={s.buttonText}>מחיקת נתוני בדיקה מהמכשיר</Text></Pressable>}</View>
 </View></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.background},content:{flex:1,padding:22,gap:14,justifyContent:"center"},eyebrow:{color:theme.primary,fontSize:13,fontWeight:"800",textAlign:"right"},title:{fontSize:28,fontWeight:"900",color:theme.text,textAlign:"right"},text:{fontSize:15,lineHeight:23,color:theme.muted,textAlign:"right"},card:{backgroundColor:theme.surface,borderColor:theme.border,borderWidth:1,borderRadius:theme.radius,padding:16,gap:8},cardTitle:{fontSize:17,fontWeight:"800",color:theme.text,textAlign:"right"},cardText:{fontSize:13,lineHeight:20,color:theme.muted,textAlign:"right"},button:{marginTop:8,backgroundColor:theme.primary,borderRadius:12,paddingVertical:12,paddingHorizontal:14},buttonText:{color:"white",fontWeight:"800",textAlign:"center"}});
