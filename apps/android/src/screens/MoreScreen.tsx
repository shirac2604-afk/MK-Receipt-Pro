import React,{useEffect,useState} from "react";
import {Alert,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {useBusiness} from "../context/BusinessContext";
import {useAuth} from "../context/AuthContext";
import {getBusinessProfile,updateBusinessProfile} from "../data/supabase/BusinessRepository";
import {listBusinessDevices,revokeBusinessDevice,type CloudDevice} from "../data/supabase/DeviceRepository";
import {pickBusinessLogo,uploadBusinessLogo,type PickedBusinessLogo} from "../services/BusinessBrandingService";
import {createAndShareLocalBackup} from "../services/LocalBackupService";
import {createAndShareYearlyReport} from "../services/BusinessReportService";
import {formatUnknownError} from "../services/ErrorFormatter";
import {theme} from "../theme/theme";
import {sanitizeDigits,sanitizePhone,validEmail,validPhone} from "../securityValidation";

export default function MoreScreen(){
 const {businessId,deviceId,role}=useBusiness();
 const {session,changePassword,signOut}=useAuth();
 const [businessName,setBusinessName]=useState("");
 const [ownerName,setOwnerName]=useState("");
 const [businessNumber,setBusinessNumber]=useState("");
 const [taxStatus,setTaxStatus]=useState<"עוסק פטור"|"עוסק מורשה">("עוסק פטור");
 const [phone,setPhone]=useState("");
 const [email,setEmail]=useState("");
 const [address,setAddress]=useState("");
 const [slogan,setSlogan]=useState("");
 const [logoDataUrl,setLogoDataUrl]=useState<string|null>(null);
 const [pickedLogo,setPickedLogo]=useState<PickedBusinessLogo|null>(null);
 const [busy,setBusy]=useState(false);
 const [devices,setDevices]=useState<CloudDevice[]>([]);
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [newPasswordConfirmation,setNewPasswordConfirmation]=useState("");
 const [passwordBusy,setPasswordBusy]=useState(false);
 const [backupBusy,setBackupBusy]=useState(false);
 const [reportBusy,setReportBusy]=useState(false);

 async function load(){
  if(!businessId)return;
  setBusy(true);
  try{
   const p=await getBusinessProfile(businessId);
   setBusinessName(p.businessName);setOwnerName(p.ownerName);setBusinessNumber(p.businessNumber);
   setTaxStatus(p.taxStatus);setPhone(p.phone||"");setEmail(p.email||"");setAddress(p.address||"");
   setSlogan(p.slogan||"");setLogoDataUrl(p.logoDataUrl);
   try{setDevices(await listBusinessDevices(businessId))}catch{setDevices([])}
  }catch(e){Alert.alert("טעינת פרטי העסק נכשלה",formatUnknownError(e))}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[businessId]);

 async function revokeDevice(target:CloudDevice){
  if(!businessId||!deviceId||target.id===deviceId)return;
  Alert.alert("ניתוק מכשיר",`לנתק את ${target.displayName|| (target.platform==="windows"?"Windows":"Android")} מהעסק?`,[
   {text:"ביטול",style:"cancel"},
   {text:"נתק",style:"destructive",onPress:()=>void (async()=>{
    setBusy(true);
    try{await revokeBusinessDevice(businessId,target.id,deviceId);await load();Alert.alert("המכשיר נותק","המכשיר הוסר מרשימת המכשירים המורשים.")}
    catch(e){Alert.alert("ניתוק המכשיר נכשל",formatUnknownError(e))}
    finally{setBusy(false)}
   })()}
  ]);
 }

 async function chooseLogo(){
  try{
   const picked=await pickBusinessLogo();
   if(!picked)return;
   setPickedLogo(picked);
   setLogoDataUrl(`data:${picked.mimeType};base64,${picked.base64}`);
  }catch(e){Alert.alert("בחירת לוגו נכשלה",formatUnknownError(e))}
 }

 async function save(){
  if(!businessId)return;
  if(!businessName.trim()||!ownerName.trim()||!businessNumber.trim()){
   Alert.alert("חסרים פרטים","שם העסק, שם בעל העסק ומספר העוסק הם שדות חובה.");return;
  }
  if(businessName.trim().length>120||ownerName.trim().length>120){Alert.alert("טקסט ארוך מדי","שם העסק ושם בעל העסק יכולים להכיל עד 120 תווים.");return}
  if(!/^[0-9]{5,15}$/.test(businessNumber)){Alert.alert("מספר עוסק לא תקין","מספר עוסק יכול להכיל ספרות בלבד, 5 עד 15 ספרות.");return}
  if(!validPhone(phone)){Alert.alert("טלפון לא תקין","בשדה טלפון ניתן להשתמש רק בספרות ובתווים + ( ) - ורווח.");return}
  if(!validEmail(email)){Alert.alert("אימייל לא תקין","יש להזין כתובת אימייל תקינה.");return}
  if(address.length>250||slogan.length>160){Alert.alert("טקסט ארוך מדי","כתובת יכולה להכיל עד 250 תווים וסלוגן עד 160.");return}
  setBusy(true);
  try{
   await updateBusinessProfile(businessId,{businessName,ownerName,businessNumber,taxStatus,phone,email,address,slogan});
   if(pickedLogo){await uploadBusinessLogo(businessId,pickedLogo);setPickedLogo(null)}
   await load();
   Alert.alert("נשמר","פרטי העסק והמיתוג נשמרו בענן.");
  }catch(e){Alert.alert("שמירת פרטי העסק נכשלה",formatUnknownError(e))}
  finally{setBusy(false)}
 }

 async function submitPasswordChange(){
  if(!currentPassword||!newPassword||!newPasswordConfirmation){Alert.alert("חסרים פרטים","יש למלא את שלושת שדות הסיסמה.");return}
  if(newPassword!==newPasswordConfirmation){Alert.alert("הסיסמאות אינן תואמות","יש להזין שוב את אותה סיסמה חדשה.");return}
  setPasswordBusy(true);
  try{
   await changePassword(currentPassword,newPassword);
   setCurrentPassword("");setNewPassword("");setNewPasswordConfirmation("");
   Alert.alert("הסיסמה שונתה","מההתחברות הבאה יש להשתמש בסיסמה החדשה.");
  }catch(e){Alert.alert("שינוי הסיסמה נכשל",formatUnknownError(e))}
  finally{setPasswordBusy(false)}
 }

 async function createLocalBackup(){
  if(!businessId)return;
  setBackupBusy(true);
  try{
   const result=await createAndShareLocalBackup(businessId);
   Alert.alert("הגיבוי מוכן",`נוצרו ${result.recordCount} רשומות. בחלון השיתוף בחרי „שמור בקבצים” או יעד מקומי אחר.`);
  }catch(e){Alert.alert("יצירת הגיבוי נכשלה",formatUnknownError(e));}
  finally{setBackupBusy(false)}
 }

 async function createYearlyReport(){
  if(!businessId)return;
  setReportBusy(true);
  try{const report=await createAndShareYearlyReport(businessId);Alert.alert("הדוח מוכן",`דוח ${report.year} כולל ${report.activeReceiptCount} קבלות פעילות ו־${report.expenseCount} הוצאות. בחלון השיתוף אפשר לשמור אותו בקבצים או לשלוח לרואה החשבון.`);}
  catch(e){Alert.alert("יצירת הדוח נכשלה",formatUnknownError(e));}
  finally{setReportBusy(false)}
 }

 return <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
  <Text style={s.title}>הגדרות העסק</Text>
  <Text style={s.subtitle}>הפרטים האלה יופיעו בקבלות ב־Android ובהמשך גם ב־Windows.</Text>

  <View style={s.card}>
   <Text style={s.cardTitle}>לוגו העסק</Text>
   {logoDataUrl?<Image source={{uri:logoDataUrl}} style={s.logo} resizeMode="contain"/>:
    <View style={s.logoPlaceholder}><Ionicons name="business-outline" size={38} color={theme.muted}/></View>}
   <Pressable style={s.secondaryButton} onPress={()=>void chooseLogo()} disabled={busy}>
    <Ionicons name="images-outline" size={18} color={theme.primary}/><Text style={s.secondaryText}>בחירת לוגו מהגלריה</Text>
   </Pressable>
  </View>

  <View style={s.card}>
   <Text style={s.cardTitle}>פרטי העסק</Text>
   <TextInput style={s.input} value={businessName} onChangeText={v=>setBusinessName(v.slice(0,120))} maxLength={120} placeholder="שם העסק" textAlign="right"/>
   <TextInput style={s.input} value={ownerName} onChangeText={v=>setOwnerName(v.slice(0,120))} maxLength={120} placeholder="שם בעל העסק" textAlign="right"/>
   <TextInput style={s.input} value={businessNumber} onChangeText={v=>setBusinessNumber(sanitizeDigits(v,15))} maxLength={15} keyboardType="number-pad" placeholder="מספר עוסק" textAlign="right"/>
   <View style={s.statusRow}>
    {(["עוסק פטור","עוסק מורשה"] as const).map(v=><Pressable key={v} onPress={()=>setTaxStatus(v)} style={[s.statusButton,taxStatus===v&&s.statusActive]}><Text style={taxStatus===v?s.statusTextActive:s.statusText}>{v}</Text></Pressable>)}
   </View>
   <TextInput style={s.input} value={phone} onChangeText={v=>setPhone(sanitizePhone(v))} maxLength={20} placeholder="טלפון" keyboardType="phone-pad" textAlign="right"/>
   <TextInput style={s.input} value={email} onChangeText={v=>setEmail(v.slice(0,254))} maxLength={254} placeholder="אימייל" keyboardType="email-address" autoCapitalize="none" textAlign="right"/>
   <TextInput style={s.input} value={address} onChangeText={v=>setAddress(v.slice(0,250))} maxLength={250} placeholder="כתובת" textAlign="right"/>
   <TextInput style={s.input} value={slogan} onChangeText={v=>setSlogan(v.slice(0,160))} maxLength={160} placeholder="סלוגן (לא חובה)" textAlign="right"/>
   <Pressable style={s.primaryButton} onPress={()=>void save()} disabled={busy}><Text style={s.primaryText}>{busy?"שומר…":"שמירת פרטי העסק"}</Text></Pressable>
  </View>

  <View style={s.card}>
   <View style={s.sectionHeader}><Ionicons name="cloud-done-outline" size={22} color={theme.primary}/><Text style={s.cardTitle}>חשבון ענן ומכשירים</Text></View>
   <Text style={s.note}>מחובר כעת: {session?.user.email??"—"}</Text>
   <Text style={s.note}>כל מכשיר שמתחבר עם אותו חשבון עובד מול אותו עסק, אותם נתונים ואותו רצף קבלות.</Text>
   <View style={s.passwordPanel}>
    <Text style={s.passwordTitle}>שינוי סיסמת החשבון</Text>
    <Text style={s.note}>כדי להגן על החשבון, יש לאמת תחילה את הסיסמה הנוכחית.</Text>
    <TextInput style={s.input} value={currentPassword} onChangeText={setCurrentPassword} maxLength={128} placeholder="סיסמה נוכחית" secureTextEntry autoCapitalize="none" autoCorrect={false} textAlign="right"/>
    <TextInput style={s.input} value={newPassword} onChangeText={setNewPassword} maxLength={128} placeholder="סיסמה חדשה — לפחות 8 תווים" secureTextEntry autoCapitalize="none" autoCorrect={false} textAlign="right"/>
    <TextInput style={s.input} value={newPasswordConfirmation} onChangeText={setNewPasswordConfirmation} maxLength={128} placeholder="אימות הסיסמה החדשה" secureTextEntry autoCapitalize="none" autoCorrect={false} textAlign="right"/>
    <Pressable style={s.primaryButton} onPress={()=>void submitPasswordChange()} disabled={passwordBusy||busy}><Text style={s.primaryText}>{passwordBusy?"משנה סיסמה…":"שינוי סיסמה"}</Text></Pressable>
   </View>
   <View style={s.devices}>
    {devices.map(d=><View key={d.id} style={s.deviceRow}>
      <Ionicons name={d.platform==="windows"?"desktop-outline":"phone-portrait-outline"} size={22} color={d.id===deviceId?theme.primary:theme.muted}/>
      <View style={{flex:1}}>
       <Text style={s.deviceTitle}>{d.displayName|| (d.platform==="windows"?"Windows":"Android")}{d.id===deviceId?" · המכשיר הזה":""}</Text>
       <Text style={s.deviceMeta}>נרשם: {new Date(d.createdAt).toLocaleString("he-IL")}</Text>
       <Text style={s.deviceMeta}>פעילות אחרונה: {new Date(d.lastSeenAt).toLocaleString("he-IL")}</Text>
      </View>
      {d.id!==deviceId&&(role==="owner"||role==="admin")?<Pressable style={s.revokeButton} disabled={busy} onPress={()=>void revokeDevice(d)}><Text style={s.revokeText}>נתק</Text></Pressable>:null}
    </View>)}
    {!devices.length?<Text style={s.note}>עדיין לא נמצאו מכשירים רשומים.</Text>:null}
   </View>
   <Pressable style={s.refreshButton} onPress={()=>void load()} disabled={busy}><Ionicons name="refresh-outline" size={18} color={theme.primary}/><Text style={s.secondaryText}>רענון רשימת מכשירים</Text></Pressable>
   <Pressable style={s.signOutButton} onPress={()=>Alert.alert("התנתקות","להתנתק מהחשבון במכשיר הזה?",[{text:"ביטול",style:"cancel"},{text:"התנתקות",style:"destructive",onPress:()=>void signOut()}])}><Text style={s.signOutText}>התנתקות מהמכשיר הזה</Text></Pressable>
  </View>

  <View style={s.card}>
   <View style={s.sectionHeader}><Ionicons name="stats-chart-outline" size={22} color={theme.primary}/><Text style={s.cardTitle}>דוחות</Text></View>
   <Text style={s.note}>ייצוא CSV של קבלות והוצאות לשנה הנוכחית. הסכומים והמסמכים זהים לנתוני הענן המשותפים עם Windows.</Text>
   <Text style={s.backupNote}>הדוח הוא סיכום עזר ואינו תחליף לדיווח רשמי או לייעוץ מקצועי.</Text>
   <Pressable style={s.primaryButton} onPress={()=>void createYearlyReport()} disabled={reportBusy||busy}><Text style={s.primaryText}>{reportBusy?"מכין דוח…":`ייצוא דוח ${new Date().getFullYear()} CSV`}</Text></Pressable>
  </View>

  <View style={s.card}>
   <View style={s.sectionHeader}><Ionicons name="save-outline" size={22} color={theme.primary}/><Text style={s.cardTitle}>גיבוי מקומי</Text></View>
   <Text style={s.note}>הגיבוי נוצר רק לפי בחירתך. בחלון הבא אפשר לשמור אותו בקבצים, בכונן או ביעד מקומי אחר.</Text>
   <Text style={s.backupNote}>קבצי PDF ותמונות הוצאה אינם כלולים בקובץ הנתונים; הם נשמרים בענן בנפרד.</Text>
   <Pressable style={s.primaryButton} onPress={()=>void createLocalBackup()} disabled={backupBusy||busy}><Text style={s.primaryText}>{backupBusy?"מכין גיבוי…":"יצירת גיבוי מקומי"}</Text></Pressable>
  </View>
 </ScrollView>;
}

const s=StyleSheet.create({
 screen:{padding:18,paddingBottom:120,backgroundColor:theme.background,direction:"rtl"},
 title:{fontSize:28,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:12},
 subtitle:{fontSize:14,color:theme.muted,textAlign:"right",marginTop:4,marginBottom:14},
 card:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border,gap:10,marginBottom:12},
 cardTitle:{fontSize:18,fontWeight:"800",color:theme.text,textAlign:"right"},
 logo:{width:"100%",height:140,backgroundColor:"#fff",borderRadius:14},
 logoPlaceholder:{height:120,borderRadius:14,backgroundColor:"#F8FAFC",alignItems:"center",justifyContent:"center"},
 input:{backgroundColor:"#F8FAFC",borderWidth:1,borderColor:theme.border,borderRadius:12,padding:12},
 statusRow:{flexDirection:"row",gap:8},
 statusButton:{flex:1,padding:11,borderRadius:11,backgroundColor:"#F1F5F9",alignItems:"center"},
 statusActive:{backgroundColor:theme.primary},statusText:{color:theme.text},statusTextActive:{color:"#fff",fontWeight:"800"},
 secondaryButton:{flexDirection:"row",gap:7,justifyContent:"center",alignItems:"center",padding:11,borderRadius:12,backgroundColor:theme.primarySoft},
 secondaryText:{color:theme.primary,fontWeight:"700"},
 primaryButton:{backgroundColor:theme.primary,borderRadius:12,padding:14,alignItems:"center"},primaryText:{color:"#fff",fontWeight:"800"},
 note:{color:theme.muted,textAlign:"right",lineHeight:20},
 backupNote:{color:theme.muted,textAlign:"right",fontSize:12,lineHeight:18},
 passwordPanel:{gap:9,paddingTop:12,marginTop:4,borderTopWidth:1,borderTopColor:theme.border},
 passwordTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},
 sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:7},
 devices:{gap:7,marginTop:4},deviceRow:{flexDirection:"row-reverse",alignItems:"center",gap:10,backgroundColor:"#F8FAFC",borderRadius:12,padding:11},
 deviceTitle:{fontWeight:"800",color:theme.text,textAlign:"right"},deviceMeta:{fontSize:11,color:theme.muted,textAlign:"right",marginTop:2},
 refreshButton:{flexDirection:"row",gap:7,justifyContent:"center",alignItems:"center",padding:11,borderRadius:12,backgroundColor:theme.primarySoft},
 revokeButton:{paddingVertical:7,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:"#F0C7C3"},revokeText:{color:theme.danger,fontWeight:"800",fontSize:12},
 signOutButton:{padding:12,borderRadius:12,borderWidth:1,borderColor:"#F0C7C3",alignItems:"center"},signOutText:{color:theme.danger,fontWeight:"800"}
});
