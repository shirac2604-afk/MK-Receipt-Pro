import React from "react";
import {NavigationContainer} from "@react-navigation/native";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import DashboardScreen from "../screens/DashboardScreen";
import ReceiptsScreen from "../screens/ReceiptsScreen";
import CustomersScreen from "../screens/CustomersScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import StudentDataProtectionScreen from "../screens/StudentDataProtectionScreen";
import MoreScreen from "../screens/MoreScreen";
import {theme} from "../theme/theme";

const Tab=createBottomTabNavigator();

const iconFor=(routeName:string,focused:boolean)=>{
  switch(routeName){
    case "ראשי": return focused?"home":"home-outline";
    case "קבלות": return focused?"receipt":"receipt-outline";
    case "לקוחות": return focused?"people":"people-outline";
    case "תלמידים": return focused?"school":"school-outline";
    case "הוצאות": return focused?"wallet":"wallet-outline";
    default: return focused?"grid":"grid-outline";
  }
};

export default function AppNavigator(){
 const insets=useSafeAreaInsets();
 const bottomSpace=Math.max(insets.bottom,10);
 return <NavigationContainer>
  <Tab.Navigator
    screenOptions={({route})=>({
      headerShown:false,
      tabBarActiveTintColor:theme.primary,
      tabBarInactiveTintColor:theme.muted,
      tabBarLabelStyle:{fontSize:11,fontWeight:"600"},
      tabBarStyle:{height:58+bottomSpace,paddingTop:5,paddingBottom:bottomSpace},
      tabBarIcon:({focused,color,size})=>(
        <Ionicons name={iconFor(route.name,focused) as any} size={size??23} color={color}/>
      )
    })}
  >
   <Tab.Screen name="ראשי" component={DashboardScreen}/>
   <Tab.Screen name="קבלות" component={ReceiptsScreen}/>
   <Tab.Screen name="לקוחות" component={CustomersScreen}/>
   <Tab.Screen name="תלמידים" component={StudentDataProtectionScreen}/>
   <Tab.Screen name="הוצאות" component={ExpensesScreen}/>
   <Tab.Screen name="עוד" component={MoreScreen}/>
  </Tab.Navigator>
 </NavigationContainer>;
}
