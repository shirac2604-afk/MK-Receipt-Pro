import React from "react";
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from "react-native";
import {useAuth} from "../context/AuthContext";
import {BusinessProvider,useBusiness} from "../context/BusinessContext";
import AuthScreen from "../screens/AuthScreen";
import AppNavigator from "../navigation/AppNavigator";
import {theme} from "../theme/theme";

function BusinessGate(){
  const {loading,error,reload,businessId,accessMode,subscription}=useBusiness();
  if(loading)return <View style={s.loading}><ActivityIndicator size="large" color={theme.primary}/><Text style={s.text}>מתחבר לעסק…</Text></View>;
  if(error||!businessId)return <View style={s.loading}>
    <Text style={s.errorTitle}>לא הצלחנו לפתוח את סביבת העסק</Text>
    <Text style={s.text}>{error||"BUSINESS_CONTEXT_FAILED"}</Text>
    <Pressable style={s.button} onPress={()=>void reload()}><Text style={s.buttonText}>נסה שוב</Text></Pressable>
  </View>;
  return <View style={s.app}>
    {accessMode==="read_only"?<View style={s.notice}>
      <Text style={s.noticeTitle}>החשבון במצב קריאה בלבד</Text>
      <Text style={s.noticeText}>אפשר לצפות בנתונים ובקבלות קיימות, אך לא ליצור או לעדכן נתונים עד לחידוש המנוי.</Text>
      {subscription?.expiresAt?<Text style={s.noticeText}>תוקף הגישה הסתיים: {new Date(subscription.expiresAt).toLocaleDateString("he-IL")}</Text>:null}
    </View>:null}
    <View style={s.navigator}><AppNavigator/></View>
  </View>;
}

export default function AppBootstrap(){
  const {session,loading}=useAuth();
  if(loading)return <View style={s.loading}><ActivityIndicator size="large" color={theme.primary}/></View>;
  if(!session)return <AuthScreen/>;
  return <BusinessProvider><BusinessGate/></BusinessProvider>;
}

const s=StyleSheet.create({
  app:{flex:1},
  navigator:{flex:1},
  loading:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:theme.background,padding:24},
  text:{marginTop:10,color:theme.muted,textAlign:"center"},
  errorTitle:{fontSize:20,fontWeight:"800",color:theme.text,textAlign:"center"},
  button:{marginTop:18,backgroundColor:theme.primary,paddingHorizontal:22,paddingVertical:12,borderRadius:12},
  buttonText:{color:"#fff",fontWeight:"800"},
  notice:{backgroundColor:"#FFF4D6",borderBottomWidth:1,borderColor:"#E9B949",paddingHorizontal:16,paddingVertical:10},
  noticeTitle:{color:"#754C00",fontWeight:"800",textAlign:"right"},
  noticeText:{color:"#754C00",fontSize:12,marginTop:3,textAlign:"right"}
});