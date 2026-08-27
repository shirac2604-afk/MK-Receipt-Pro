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

 const go=(name:string)=>navigation.navigate(name);
 return <ScrollView
   style={s.root}
   contentContainerStyle={s.screen}
   refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>void load()}/>}
 >
   <View style={s.header}>
    <View style={{flex:1}}>
      <Text style={s.hello}>שלום,</Text>
      <Text style={s.business}>{businessName}</Text>
      <View style={s.cloudRow}>
        <Ionicons name="cloud-done-outline" size={16} color={theme.primary}/>
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

   <Text style={s.sectionTitle}>תמונת מצב</Text>
   <View style={s.statsGrid}>
    <View style={s.statCard}><Ionicons name="trending-up-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>הכנסות</Text><Text style={s.statValue}>{money(snapshot?.incomeAgorot??0)}</Text><Text style={s.statMeta}>{snapshot?.receiptsCount??0} קבלות</Text></View>
    <View style={s.statCard}><Ionicons name="wallet-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>הוצאות</Text><Text style={s.statValue}>{money(snapshot?.expensesAgorot??0)}</Text><Text style={s.statMeta}>{snapshot?.expensesCount??0} הוצאות</Text></View>
    <View style={s.statCard}><Ionicons name="people-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>לקוחות</Text><Text style={s.statValue}>{snapshot?.customersCount??0}</Text><Text style={s.statMeta}>פעילים בענן</Text></View>
    <View style={s.statCard}><Ionicons name="phone-portrait-outline" size={22} color={theme.primary}/><Text style={s.statLabel}>מכשירים</Text><Text style={s.statValue}>{snapshot?.devicesCount??0}</Text><Text style={s.statMeta}>{deviceId?"המכשיר הזה מחובר":"מתחבר…"}</Text></View>
   </View>

   <Text style={s.sectionTitle}>פעולות מהירות</Text>
   <View style={s.actions}>
    <Pressable style={s.action} onPress={()=>go("קבלות")}><View style={s.actionIcon}><Ionicons name="receipt-outline" size={25} color={theme.primary}/></View><View style={{flex:1}}><Text style={s.actionTitle}>קבלות</Text><Text style={s.actionText}>הפקה, היסטוריה ו־PDF</Text></View><Ionicons name="chevron-back" size={20} color={theme.muted}/></Pressable>
    <Pressable style={s.action} onPress={()=>go("לקוחות")}><View style={s.actionIcon}><Ionicons name="people-outline" size={25} color={theme.primary}/></View><View style={{flex:1}}><Text style={s.actionTitle}>לקוחות</Text><Text style={s.actionText}>רשימה משותפת לכל המכשירים</Text></View><Ionicons name="chevron-back" size={20} color={theme.muted}/></Pressable>
    <Pressable style={s.action} onPress={()=>go("הוצאות")}><View style={s.actionIcon}><Ionicons name="wallet-outline" size={25} color={theme.primary}/></View><View style={{flex:1}}><Text style={s.actionTitle}>הוצאות</Text><Text style={s.actionText}>כולל אסמכתאות בענן</Text></View><Ionicons name="chevron-back" size={20} color={theme.muted}/></Pressable>
    <Pressable style={s.action} onPress={()=>go("עוד")}><View style={s.actionIcon}><Ionicons name="business-outline" size={25} color={theme.primary}/></View><View style={{flex:1}}><Text style={s.actionTitle}>עסק וענן</Text><Text style={s.actionText}>פרטי העסק, לוגו ומכשירים</Text></View><Ionicons name="chevron-back" size={20} color={theme.muted}/></Pressable>
   </View>
 </ScrollView>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:theme.background},screen:{padding:18,paddingTop:28,paddingBottom:120,direction:"rtl"},
 header:{flexDirection:"row",alignItems:"center",gap:12},hello:{fontSize:15,color:theme.muted,textAlign:"right"},business:{fontSize:27,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:2},
 cloudRow:{flexDirection:"row",alignItems:"center",gap:5,justifyContent:"flex-start",marginTop:6},cloudText:{fontSize:12,color:theme.primary,fontWeight:"700"},cloudBadge:{width:58,height:58,borderRadius:16,backgroundColor:theme.primarySoft,alignItems:"center",justifyContent:"center",overflow:"hidden"},logo:{width:52,height:52},
 nextCard:{marginTop:18,backgroundColor:theme.primary,borderRadius:22,padding:20,alignItems:"flex-end"},nextLabel:{color:"#E9F1EF",fontSize:13},nextNumber:{color:"#fff",fontSize:36,fontWeight:"900",marginTop:2},nextHint:{color:"#E9F1EF",fontSize:12,textAlign:"right",marginTop:4},
 sectionTitle:{fontSize:18,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:22,marginBottom:10},statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},
 statCard:{width:"48%",flexGrow:1,backgroundColor:"#fff",borderRadius:17,padding:14,borderWidth:1,borderColor:theme.border,alignItems:"flex-end"},statLabel:{fontSize:12,color:theme.muted,marginTop:7},statValue:{fontSize:20,fontWeight:"800",color:theme.text,marginTop:2},statMeta:{fontSize:11,color:theme.muted,marginTop:3},
 actions:{gap:9},action:{backgroundColor:"#fff",borderRadius:16,padding:13,borderWidth:1,borderColor:theme.border,flexDirection:"row-reverse",alignItems:"center",gap:11},actionIcon:{width:46,height:46,borderRadius:14,backgroundColor:theme.primarySoft,alignItems:"center",justifyContent:"center"},actionTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},actionText:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:2}
});
