import React from "react";
import {StatusBar} from "expo-status-bar";
import {useFonts} from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import {AuthProvider} from "./src/context/AuthContext";
import {SafeAreaProvider} from "react-native-safe-area-context";
import AppBootstrap from "./src/components/AppBootstrap";

export default function App(){
 const [fontsLoaded]=useFonts(Ionicons.font);
 if(!fontsLoaded)return null;

 return <SafeAreaProvider>
   <AuthProvider>
     <StatusBar style="dark"/>
     <AppBootstrap/>
   </AuthProvider>
 </SafeAreaProvider>;
}
