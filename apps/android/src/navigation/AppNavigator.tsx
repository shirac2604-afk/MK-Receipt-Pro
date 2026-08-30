import React from "react";
import {NavigationContainer} from "@react-navigation/native";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import DashboardScreen from "../screens/DashboardScreen";
import ReceiptsScreen from "../screens/ReceiptsScreen";
import CustomersScreen from "../screens/CustomersScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import StudentCloudScreen from "../screens/StudentCloudScreen";
import MoreScreen from "../screens/MoreScreen";
import ManagementReportsScreen from "../screens/ManagementReportsScreen";
import {theme} from "../theme/theme";

const Tab=createBottomTabNavigator();
const Stack=createNativeStackNavigator();

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

function MainTabs(){
 const insets=useSafeAreaInsets();
 const bottomSpace=Math.max(insets.bottom,10);
 return <Tab.Navigator
    screenOptions={({route})=>({
      headerShown:false,
      tabBarActiveTintColor:"#A9D4FF",
      tabBarInactiveTintColor:"#E0E9F7",
      tabBarLabelStyle:{fontSize:11,fontWeight:"700"},
      tabBarStyle:{height:66+bottomSpace,paddingTop:8,paddingBottom:bottomSpace,backgroundColor:theme.navy,borderTopWidth:0,elevation:12,shadowColor:"#071F45",shadowOpacity:.22,shadowRadius:14,shadowOffset:{width:0,height:-5}},
      tabBarIcon:({focused,color,size})=>(
        <Ionicons name={iconFor(route.name,focused) as any} size={size??23} color={color}/>
      )
    })}
  >
   <Tab.Screen name="ראשי" component={DashboardScreen}/>
   <Tab.Screen name="קבלות" component={ReceiptsScreen}/>
   <Tab.Screen name="לקוחות" component={CustomersScreen}/>
   <Tab.Screen name="תלמידים" component={StudentCloudScreen}/>
   <Tab.Screen name="הוצאות" component={ExpensesScreen}/>
   <Tab.Screen name="עוד" component={MoreScreen}/>
  </Tab.Navigator>;
}

export default function AppNavigator(){
 return <NavigationContainer>
  <Stack.Navigator screenOptions={{headerShown:false}}>
   <Stack.Screen name="מסכים ראשיים" component={MainTabs}/>
   <Stack.Screen name="דוחות" component={ManagementReportsScreen}/>
  </Stack.Navigator>
 </NavigationContainer>;
}
