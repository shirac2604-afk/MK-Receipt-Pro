import React,{useCallback,useEffect,useState} from "react";
import {Alert,Image,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {useNavigation} from "@react-navigation/native";
import {useBusiness} from "../context/BusinessContext";
import {getBusinessProfile} from "../data/supabase/BusinessRepository";
import {getDashboardSnapshot,type DashboardSnapshot} from "../data/supabase/DashboardRepository";
import {formatUnknownError} from "../services/ErrorFormatter";
import {theme} from "../theme/theme";

const money=(agorot:number)=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",minimumFractionDigits:0,maximumFractionDigits:2}).format(agorot/100);

export default function DashboardScreen(){
 const navigation=useNavigation<any>();
 const {businessId,deviceId}=useBusiness();
 const [businessName,setBusinessName]=useState("העסק שלי");
 const [logoDataUrl,setLogoDataUrl]=useState<string|null>(null);
 const [snapshot,setSnapshot]=useState<DashboardSnapshot|null>(null);
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  if(!businessId)return;
  setBusy(true);
  try{
    const [profile,data]=await Promise.all([getBusinessProfile(businessId),getDashboardSnapshot(businessId)]);
    setBusinessName(profile.businessName);
    setLogoDataUrl(profile.logoDataUrl);
    setSnapshot(data);
  }catch(e){Alert.alert("טעינת דף הבית נכשלה",formatUnknownError(e))}
  finally{setBusy(false)}
 },[businessId]);

 useEffect(()=>{void load()},[load]);

 const go=(name:string,params?:Record<string,string>)=>navigation.navigate(name,params);
 return <ScrollView
   style={s.root}
   contentContainerStyle={s.screen}
   refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>void load()}/>}
 >
   <View style={s.hero}>
   <View style={s.header}>
    <View style={{flex:1}}>
      <Text style={s.hello}>ניהול העסק שלך</Text>
      <Text style={s.business}>{businessName}</Text>
      <View style={s.cloudRow}>
        <Ionicons name="cloud-done-outline" size={16} color={theme.accent}/>
        <Text style={s.cloudText}>מחובר לענן · {snapshot?.devicesCount??"–"} מכשירים</Text>
      </View>
    </View>
    <View style={s.cloudBadge}>{logoDataUrl?<Image source={{uri:logoDataUrl}} style={s.logo} resizeMode="contain"/>:<Ionicons name="business-outline" size={24} color={theme.primary}/>}</View>
   </View>

   <View style={s.nextCard}>
     <Text style={s.nextLabel}>הקבלה הבאה</Text>
     <Text style={s.nextNumber}>{snapshot?.nextReceiptNumber??"–"}</Text>
     <Text style={s.nextHint}>המספר משותף לכל המחשבים והטלפונים של העסק</Text>
   </View>
   </View>

   <Text style={s.sectionTitle}>תמונת מצב</Text>
   <View style={s.statsGrid}>
    <View style={s.statCard}><Ionicons name="trending-up-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>הכנסות</Text><Text style={s.statValue}>{money(snapshot?.incomeAgorot??0)}</Text><Text style={s.statMeta}>{snapshot?.receiptsCount??0} קבלות</Text></View>
    <View style={s.statCard}><Ionicons name="wallet-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>הוצאות</Text><Text style={s.statValue}>{money(snapshot?.expensesAgorot??0)}</Text><Text style={s.statMeta}>{snapshot?.expensesCount??0} הוצאות</Text></View>
    <View style={s.statCard}><Ionicons name="people-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>לקוחות</Text><Text style={s.statValue}>{snapshot?.customersCount??0}</Text><Text style={s.statMeta}>פעילים בענן</Text></View>
    <View style={s.statCard}><Ionicons name="phone-portrait-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>מכשירים</Text><Text style={s.statValue}>{snapshot?.devicesCount??0}</Text><Text style={s.statMeta}>{deviceId?"המכשיר הזה מחובר":"מתחבר…"}</Text></View>
   </View>

   <Text style={s.sectionTitle}>פעולות מהירות</Text>
   <View style={s.actions}>
    <Pressable style={s.action} onPress={()=>go("קבלות")}><View style={s.actionIcon}><Ionicons name="receipt-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>קבלות</Text><Text style={s.actionText}>הפקה והיסטוריה</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("לקוחות")}><View style={s.actionIcon}><Ionicons name="people-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>לקוחות</Text><Text style={s.actionText}>כרטיסי לקוחות</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("תלמידים")}><View style={s.actionIcon}><Ionicons name="school-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>תלמידים</Text><Text style={s.actionText}>ניהול תלמידים</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("תלמידים",{section:"schedule"})}><View style={s.actionIcon}><Ionicons name="calendar-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>יומן שיעורים</Text><Text style={s.actionText}>קביעת מפגשים</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("תלמידים",{section:"payments"})}><View style={s.actionIcon}><Ionicons name="card-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>גבייה</Text><Text style={s.actionText}>תשלומים פתוחים</Text></Pressable>
    <Pressable style={s.action} onPress={()=>navigation.navigate("דוחות")}><View style={s.actionIcon}><Ionicons name="analytics-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>דוחות</Text><Text style={s.actionText}>תמונת מצב שנתית</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("הוצאות")}><View style={s.actionIcon}><Ionicons name="wallet-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>הוצאות</Text><Text style={s.actionText}>אסמכתאות בענן</Text></Pressable>
    <Pressable style={s.action} onPress={()=>go("עוד")}><View style={s.actionIcon}><Ionicons name="business-outline" size={24} color={theme.primary}/></View><Text style={s.actionTitle}>עסק וענן</Text><Text style={s.actionText}>הגדרות וגיבוי</Text></Pressable>
   </View>
 </ScrollView>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:theme.background},screen:{paddingBottom:120,direction:"rtl"},hero:{backgroundColor:theme.navy,padding:18,paddingTop:30,borderBottomLeftRadius:32,borderBottomRightRadius:32},
 header:{flexDirection:"row",alignItems:"center",gap:12},hello:{fontSize:13,color:"#B9D8FC",textAlign:"right",fontWeight:"700"},business:{fontSize:28,fontWeight:"900",color:"#FFFFFF",textAlign:"right",marginTop:2},
 cloudRow:{flexDirection:"row",alignItems:"center",gap:5,justifyContent:"flex-start",marginTop:6},cloudText:{fontSize:12,color:"#DCEBFF",fontWeight:"700"},cloudBadge:{width:58,height:58,borderRadius:18,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center",overflow:"hidden"},logo:{width:52,height:52},
 nextCard:{marginTop:20,backgroundColor:"#DCEBFF",borderRadius:20,padding:18,alignItems:"flex-end"},nextLabel:{color:theme.primary,fontSize:13,fontWeight:"700"},nextNumber:{color:theme.navy,fontSize:36,fontWeight:"900",marginTop:2},nextHint:{color:theme.primary,fontSize:12,textAlign:"right",marginTop:4},
 sectionTitle:{fontSize:18,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:22,marginBottom:10},statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},
 statCard:{width:"48%",flexGrow:1,backgroundColor:"#fff",borderRadius:17,padding:14,borderWidth:1,borderColor:theme.border,alignItems:"flex-end"},statLabel:{fontSize:12,color:theme.muted,marginTop:7},statValue:{fontSize:20,fontWeight:"800",color:theme.text,marginTop:2},statMeta:{fontSize:11,color:theme.muted,marginTop:3},
 actions:{flexDirection:"row-reverse",flexWrap:"wrap",gap:10},action:{width:"48%",flexGrow:1,backgroundColor:"#fff",borderRadius:17,padding:14,borderWidth:1,borderColor:theme.border,alignItems:"flex-end",minHeight:132},actionIcon:{width:44,height:44,borderRadius:14,backgroundColor:theme.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:11},actionTitle:{fontSize:15,fontWeight:"800",color:theme.text,textAlign:"right"},actionText:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:3}
});
