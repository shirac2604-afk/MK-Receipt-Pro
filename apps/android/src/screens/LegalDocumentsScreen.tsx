import React from "react";
import {ScrollView,StyleSheet,Text,View} from "react-native";
import {theme} from "../theme/theme";

const updatedAt="15 בספטמבר 2026";

function Section({title,children}:{title:string;children:React.ReactNode}){
 return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}
function Body({children}:{children:React.ReactNode}){return <Text style={s.body}>{children}</Text>}

export default function LegalDocumentsScreen(){
 return <ScrollView contentContainerStyle={s.screen}>
  <Text style={s.title}>מסמכים משפטיים</Text>
  <Text style={s.subtitle}>MK Receipt Pro · מפתח להצלחה · עדכון אחרון: {updatedAt}</Text>

  <View style={s.card}>
   <Text style={s.cardTitle}>תנאי שימוש</Text>
   <Section title="החשבון והמנוי"><Body>חשבון חדש מקבל 14 ימי ניסיון. לאחר מכן, ללא מנוי פעיל, החשבון עובר למצב קריאה בלבד: אפשר לצפות ולייצא מידע קיים, אך לא ליצור או לעדכן נתונים. חשבון מפעילת השירות, שירה כהן / מפתח להצלחה, פועל במסלול פנימי חינמי וללא מועד תפוגה; ההטבה אישית ואינה מועברת לעסקים אחרים.</Body></Section>
   <Section title="לקוחות בתשלום"><Body>לקוחות אחרים נדרשים למנוי בתשלום לאחר תקופת הניסיון. המסלול, המחיר, מועד החיוב ותנאי הביטול או ההחזר יוצגו לפני רכישה. עד לפרסומם לא ייגבה תשלום.</Body></Section>
   <Section title="אחריות ושימוש מותר"><Body>הלקוח אחראי לנכונות הנתונים, לשימוש בהתאם לדין ולשמירת מסמכים כנדרש. השירות אינו ייעוץ משפטי, חשבונאי או מס. אין לשתף סיסמה, לנסות לגשת למידע של עסק אחר או לפגוע באבטחת השירות.</Body></Section>
   <Section title="זמינות"><Body>ייתכנו עבודות תחזוקה או תקלות. מומלץ לייצא מסמכים חשובים מדי פעם. במקרה של שימוש אסור, סיכון אבטחה או אי־תשלום, ניתן להשעות גישה תוך שמירה על אפשרות סבירה לקבלת מידע קיים לפי הדין.</Body></Section>
  </View>

  <View style={s.card}>
   <Text style={s.cardTitle}>מדיניות פרטיות</Text>
   <Section title="המידע שאנו מעבדים"><Body>השירות עשוי לשמור פרטי חשבון, פרטי עסק, פרטי לקוחות, תלמידים ואנשי קשר שהוזנו, קבלות, הוצאות ומידע תפעולי, וכן נתונים טכניים מינימליים של מכשירים מורשים. אין להזין מידע רגיש שאינו נחוץ לניהול העסק.</Body></Section>
   <Section title="מטרות והגנה"><Body>המידע משמש להפעלת החשבון, הפקת קבלות, ניהול לקוחות ותלמידים, סנכרון, אבטחה, תמיכה ושיפור השירות. כל עסק מופרד בהרשאות ממידע של עסקים אחרים.</Body></Section>
   <Section title="ספקי תשתית ושמירה"><Body>המידע נשמר ומעובד באמצעות Supabase לצורכי מסד נתונים ואימות, ו־Expo לצורכי הפצה ועדכונים. המידע נשמר כל עוד החשבון פעיל או כנדרש לפי דין; עותקי גיבוי עשויים להישמר לתקופה מוגבלת לפני מחיקה אוטומטית.</Body></Section>
   <Section title="הזכויות שלך"><Body>אפשר לבקש עיון, תיקון, ייצוא או מחיקה של מידע אישי. לצורך הגנה על פרטיותך נבקש פרטים שיאפשרו לזהות את החשבון.</Body></Section>
  </View>

  <View style={s.contactCard}>
   <Text style={s.cardTitle}>פנייה בנושא תנאים או פרטיות</Text>
   <Text style={s.contact}>מפתח להצלחה · שירה כהן{`\n`}נחל דליות 39, באר שבע{`\n`}shirac2604@gmail.com · 052-527-5122</Text>
   <Text style={s.note}>אין לשלוח סיסמאות, קודי אימות או פרטי כרטיס בהודעה.</Text>
  </View>
 </ScrollView>;
}

const s=StyleSheet.create({
 screen:{padding:18,paddingBottom:48,backgroundColor:theme.background,direction:"rtl"},
 title:{fontSize:28,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:12},
 subtitle:{fontSize:13,color:theme.muted,textAlign:"right",marginTop:5,marginBottom:14},
 card:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border,marginBottom:12},
 contactCard:{backgroundColor:theme.primarySoft,borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border,marginBottom:12},
 cardTitle:{fontSize:19,fontWeight:"800",color:theme.text,textAlign:"right",marginBottom:4},
 section:{borderTopWidth:1,borderTopColor:theme.border,paddingTop:12,marginTop:12},
 sectionTitle:{fontSize:15,fontWeight:"800",color:theme.text,textAlign:"right",marginBottom:5},
 body:{fontSize:14,color:theme.muted,textAlign:"right",lineHeight:21},
 contact:{fontSize:14,color:theme.text,textAlign:"right",lineHeight:22},
 note:{fontSize:12,color:theme.muted,textAlign:"right",lineHeight:18,marginTop:10}
});
