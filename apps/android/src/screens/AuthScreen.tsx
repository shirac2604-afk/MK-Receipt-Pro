import React,{useEffect,useState} from "react";
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {useAuth} from "../context/AuthContext";
import {theme} from "../theme/theme";
import {testSupabaseConnection,type SupabaseDiagnostic} from "../services/SupabaseDiagnostics";
import {MAX_PASSWORD_LENGTH,MIN_NEW_PASSWORD_LENGTH,validateNewPassword,type NewPasswordValidationError} from "../auth/passwordPolicy";

const passwordErrorMessages:Record<NewPasswordValidationError,string>={
  AUTH_PASSWORD_TOO_SHORT:`סיסמה חדשה חייבת להכיל לפחות ${MIN_NEW_PASSWORD_LENGTH} תווים.`,
  AUTH_PASSWORD_TOO_LONG:`סיסמה חדשה יכולה להכיל עד ${MAX_PASSWORD_LENGTH} תווים.`,
  AUTH_PASSWORD_TOO_COMMON:"הסיסמה נפוצה מדי. יש לבחור סיסמה אחרת.",
  AUTH_PASSWORD_CONTAINS_EMAIL:"אין להשתמש בשם האימייל כחלק מהסיסמה."
};

export default function AuthScreen(){
 const {signIn,signUp}=useAuth();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [diag,setDiag]=useState<SupabaseDiagnostic|null>(null);
 const [diagBusy,setDiagBusy]=useState(false);

 async function diagnose(){
   setDiagBusy(true);
   try{setDiag(await testSupabaseConnection())}
   finally{setDiagBusy(false)}
 }

 useEffect(()=>{void diagnose()},[]);

 async function run(mode:"signin"|"signup"){
  if(!email.trim()||!password){
    Alert.alert("חסרים פרטים","יש להזין אימייל וסיסמה.");
    return;
  }
  if(mode==="signup"){
    const passwordError=validateNewPassword(email,password);
    if(passwordError){
      Alert.alert("הסיסמה אינה מתאימה",passwordErrorMessages[passwordError]);
      return;
    }
  }
  if(busy){
    return;
  }
  setBusy(true);
  try{
    if(mode==="signin")await signIn(email,password);
    else await signUp(email,password);
  }catch(e){
    const errorCode=e instanceof Error?e.message:"";
    const isPasswordError=Object.prototype.hasOwnProperty.call(passwordErrorMessages,errorCode);
    const message=isPasswordError?passwordErrorMessages[errorCode as NewPasswordValidationError]:(errorCode||"שגיאה לא ידועה");
    await diagnose();
    Alert.alert("התחברות נכשלה",message);
  }finally{
    setBusy(false);
  }
 }

 return <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <Text style={s.logo}>MK Receipt Pro</Text>
  <Text style={s.version}>Android Foundation 5.2</Text>
  <Text style={s.title}>כניסה לחשבון</Text>

  <View style={s.diag}>
    <Text style={s.diagTitle}>בדיקת חיבור Supabase</Text>
    {diagBusy?<Text style={s.diagText}>בודק חיבור…</Text>:diag?<>
      <Text style={s.diagText}>Raw fetch: {diag.rawFetchOk?"תקין":"נכשל"} · HTTP {diag.rawFetchStatus}</Text>
      <Text style={s.diagText}>Auth client: {diag.authClientOk?"תקין":"נכשל"}</Text>
      {!diag.rawFetchOk?<Text style={s.error}>{diag.rawFetchMessage}</Text>:null}
      {!diag.authClientOk?<Text style={s.error}>{diag.authClientMessage}</Text>:null}
    </>:<Text style={s.diagText}>טרם בוצעה בדיקה</Text>}
    <Pressable style={s.testButton} onPress={()=>void diagnose()} disabled={diagBusy}>
      <Text style={s.testButtonText}>בדיקה מחדש</Text>
    </Pressable>
  </View>

  <TextInput style={s.input} value={email} onChangeText={setEmail}
    autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="אימייל"/>
  <TextInput style={s.input} value={password} onChangeText={setPassword}
    secureTextEntry placeholder="סיסמה"/>
  <Text style={s.passwordHint}>ליצירת חשבון חדש: לפחות {MIN_NEW_PASSWORD_LENGTH} תווים וסיסמה שאינה כוללת את שם האימייל.</Text>
  <Pressable style={s.primary} disabled={busy} onPress={()=>void run("signin")}>
    <Text style={s.primaryText}>{busy?"מתחבר…":"כניסה"}</Text>
  </Pressable>
  <Pressable style={s.secondary} disabled={busy} onPress={()=>void run("signup")}>
    <Text style={s.secondaryText}>יצירת חשבון</Text>
  </Pressable>
 </ScrollView>;
}

const s=StyleSheet.create({
 wrap:{flexGrow:1,justifyContent:"center",padding:24,backgroundColor:theme.background,direction:"rtl"},
 logo:{fontSize:18,fontWeight:"800",color:theme.primary,textAlign:"center",marginBottom:4},
 version:{fontSize:12,color:theme.muted,textAlign:"center",marginBottom:16},
 title:{fontSize:28,fontWeight:"800",color:theme.text,textAlign:"center",marginBottom:18},
 diag:{backgroundColor:"#fff",borderWidth:1,borderColor:theme.border,borderRadius:14,padding:14,marginBottom:18},
 diagTitle:{fontSize:15,fontWeight:"800",color:theme.text,textAlign:"right"},
 diagText:{fontSize:13,color:theme.muted,textAlign:"right",marginTop:5},
 error:{fontSize:12,color:theme.danger,textAlign:"right",marginTop:5},
 testButton:{alignSelf:"flex-start",marginTop:10,paddingVertical:7,paddingHorizontal:12,borderRadius:10,backgroundColor:theme.primarySoft},
 testButtonText:{color:theme.primary,fontWeight:"700"},
 input:{backgroundColor:"#fff",borderWidth:1,borderColor:theme.border,borderRadius:14,padding:14,marginBottom:12,textAlign:"right"},
 passwordHint:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:-4,marginBottom:12},
 primary:{backgroundColor:theme.primary,borderRadius:14,padding:15,alignItems:"center",marginTop:6},
 primaryText:{color:"#fff",fontWeight:"800"},
 secondary:{padding:15,alignItems:"center"},
 secondaryText:{color:theme.primary,fontWeight:"700"}
});
