import React,{useCallback,useEffect,useState} from "react";
import {Alert,FlatList,Pressable,RefreshControl,StyleSheet,Text,TextInput,View} from "react-native";
import type {Customer} from "../domain/types";
import {useLiveDataRepository} from "../hooks/useLiveDataRepository";
import {theme} from "../theme/theme";
import {sanitizePhone,validEmail,validPhone} from "../securityValidation";

export default function CustomersScreen(){
  const repo=useLiveDataRepository();
  const [items,setItems]=useState<Customer[]>([]);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);

  const load=useCallback(async()=>{
    if(!repo)return;
    setLoading(true);
    try{setItems(await repo.customers())}
    catch(e){Alert.alert("טעינת לקוחות נכשלה",e instanceof Error?e.message:"שגיאה לא ידועה")}
    finally{setLoading(false)}
  },[repo]);

  useEffect(()=>{void load()},[load]);

  async function add(){
    if(!repo)return;
    if(!name.trim()){Alert.alert("חסר שם","יש להזין שם לקוח.");return}
    if(name.trim().length>160){Alert.alert("שם ארוך מדי","שם לקוח יכול להכיל עד 160 תווים.");return}
    if(!validPhone(phone)){Alert.alert("טלפון לא תקין","בשדה טלפון ניתן להשתמש רק בספרות ובתווים + ( ) - ורווח.");return}
    if(!validEmail(email)){Alert.alert("אימייל לא תקין","יש להזין כתובת אימייל תקינה.");return}
    setLoading(true);
    try{
      await repo.addCustomer({displayName:name,phone,email});
      setName("");setPhone("");setEmail("");
      await load();
    }catch(e){
      Alert.alert("שמירת לקוח נכשלה",e instanceof Error?e.message:"שגיאה לא ידועה");
    }finally{setLoading(false)}
  }

  return <View style={s.screen}>
    <Text style={s.title}>לקוחות</Text>
    <Text style={s.subtitle}>לקוחות משותפים ל־Windows ול־Android</Text>

    <View style={s.card}>
      <Text style={s.cardTitle}>לקוח חדש</Text>
      <TextInput style={s.input} value={name} onChangeText={v=>setName(v.slice(0,160))} maxLength={160} placeholder="שם הלקוח" textAlign="right"/>
      <TextInput style={s.input} value={phone} onChangeText={v=>setPhone(sanitizePhone(v))} maxLength={20} placeholder="טלפון" keyboardType="phone-pad" textAlign="right"/>
      <TextInput style={s.input} value={email} onChangeText={v=>setEmail(v.slice(0,254))} maxLength={254} placeholder="אימייל" keyboardType="email-address" autoCapitalize="none" textAlign="right"/>
      <Pressable style={s.button} disabled={!repo||loading} onPress={()=>void add()}>
        <Text style={s.buttonText}>שמירת לקוח</Text>
      </Pressable>
    </View>

    <FlatList
      data={items}
      keyExtractor={item=>item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>void load()}/>}
      contentContainerStyle={s.list}
      ListEmptyComponent={<Text style={s.empty}>עדיין אין לקוחות</Text>}
      renderItem={({item})=><View style={s.item}>
        <Text style={s.itemTitle}>{item.displayName}</Text>
        {item.phone?<Text style={s.itemText}>{item.phone}</Text>:null}
        {item.email?<Text style={s.itemText}>{item.email}</Text>:null}
      </View>}
    />
  </View>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:theme.background,padding:18,direction:"rtl"},
  title:{fontSize:30,fontWeight:"900",color:theme.text,textAlign:"right",marginTop:18},
  subtitle:{fontSize:14,color:theme.muted,textAlign:"right",marginTop:4,marginBottom:18},
  card:{backgroundColor:"#fff",borderRadius:theme.radius,padding:18,borderWidth:1,borderColor:theme.border,gap:11,shadowColor:theme.navy,shadowOpacity:.04,shadowRadius:10,elevation:2},
  cardTitle:{fontSize:18,fontWeight:"900",color:theme.text,textAlign:"right"},
  input:{backgroundColor:"#FBFCFF",borderWidth:1,borderColor:theme.border,borderRadius:15,padding:13},
  button:{backgroundColor:theme.accent,borderRadius:15,padding:15,alignItems:"center"},
  buttonText:{color:theme.navy,fontWeight:"900"},
  list:{gap:10,paddingVertical:14,paddingBottom:100},
  item:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border},
  itemTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},
  itemText:{fontSize:13,color:theme.muted,textAlign:"right",marginTop:3},
  empty:{textAlign:"center",color:theme.muted,padding:30}
});
