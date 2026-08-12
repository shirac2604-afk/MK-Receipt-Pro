import React from "react";
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from "react-native";
import {useAuth} from "../context/AuthContext";
import {BusinessProvider,useBusiness} from "../context/BusinessContext";
import AuthScreen from "../screens/AuthScreen";
import AppNavigator from "../navigation/AppNavigator";
import {theme} from "../theme/theme";

function BusinessGate(){
  const {loading,error,reload,businessId}=useBusiness();
  if(loading)return <View style={s.loading}><ActivityIndicator size="large" color={theme.primary}/><Text style={s.text}>מתחבר לעסק…</Text></View>;
  if(error||!businessId)return <View style={s.loading}>
    <Text style={s.errorTitle}>החשבון עדיין לא משויך לעסק</Text>
    <Text style={s.text}>{error||"NO_BUSINESS_MEMBERSHIP"}</Text>
    <Pressable style={s.button} onPress={()=>void reload()}><Text style={s.buttonText}>נסה שוב</Text></Pressable>
  </View>;
  return <AppNavigator/>;
}

export default function AppBootstrap(){
  const {session,loading}=useAuth();
  if(loading)return <View style={s.loading}><ActivityIndicator size="large" color={theme.primary}/></View>;
  if(!session)return <AuthScreen/>;
  return <BusinessProvider><BusinessGate/></BusinessProvider>;
}

const s=StyleSheet.create({
  loading:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:theme.background,padding:24},
  text:{marginTop:10,color:theme.muted,textAlign:"center"},
  errorTitle:{fontSize:20,fontWeight:"800",color:theme.text,textAlign:"center"},
  button:{marginTop:18,backgroundColor:theme.primary,paddingHorizontal:22,paddingVertical:12,borderRadius:12},
  buttonText:{color:"#fff",fontWeight:"800"}
});
