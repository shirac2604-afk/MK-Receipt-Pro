import React,{useEffect,useState} from "react";
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {useAuth} from "../context/AuthContext";
import {theme} from "../theme/theme";
import {testSupabaseConnection,type SupabaseDiagnostic} from "../services/SupabaseDiagnostics";

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
  if(!email.trim()||password.length<6){
    Alert.alert("חסרים פרטים","יש להזין אימייל וסיסמה של לפחות 6 תווים.");
    return;
  }
  setBusy(true);
  try{
    if(mode==="signin")await signIn(email,password);
    else await signUp(email,password);
  }catch(e){
    const message=e instanceof Error?e.message:"שגיאה לא ידועה";
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
    autoCapitalize="none" keyboardType="email-address" placeholder="אימייל"/>
  <TextInput style={s.input} value={password} onChangeText={setPassword}
    secureTextEntry placeholder="סיסמה"/>
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
 primary:{backgroundColor:theme.primary,borderRadius:14,padding:15,alignItems:"center",marginTop:6},
 primaryText:{color:"#fff",fontWeight:"800"},
 secondary:{padding:15,alignItems:"center"},
 secondaryText:{color:theme.primary,fontWeight:"700"}
});
