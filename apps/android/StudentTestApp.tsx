import React from "react";
import {StatusBar} from "expo-status-bar";
import {SafeAreaProvider} from "react-native-safe-area-context";
import StudentHubScreen from "./src/screens/StudentHubScreen";

export default function StudentTestApp(){
 return <SafeAreaProvider>
   <StatusBar style="dark"/>
   <StudentHubScreen/>
 </SafeAreaProvider>;
}
