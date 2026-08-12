import React,{useCallback,useEffect,useState} from "react";
import {
 Alert,FlatList,Linking,Pressable,RefreshControl,StyleSheet,Text,TextInput,View
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type {Expense} from "../domain/types";
import {useLiveDataRepository} from "../hooks/useLiveDataRepository";
import {useBusiness} from "../context/BusinessContext";
import {
 takeExpensePhoto,pickExpensePhoto,uploadExpenseAttachment,
 createExpenseAttachmentSignedUrl,type PickedAttachment
} from "../services/ExpenseAttachmentService";
import {theme} from "../theme/theme";
import {sanitizeDate,sanitizeMoney,validDate} from "../securityValidation";
import {assertTrustedSupabaseSignedUrl} from "../security/TrustedExternalUrl";

const today=()=>new Date().toISOString().slice(0,10);

export default function ExpensesScreen(){
 const repo=useLiveDataRepository();
 const {businessId}=useBusiness();
 const [items,setItems]=useState<Expense[]>([]);
 const [date,setDate]=useState(today());
 const [supplier,setSupplier]=useState("");
 const [amount,setAmount]=useState("");
 const [category,setCategory]=useState("אחר");
 const [notes,setNotes]=useState("");
 const [attachment,setAttachment]=useState<PickedAttachment|null>(null);
 const [loading,setLoading]=useState(false);

 const load=useCallback(async()=>{
   if(!repo)return;
   setLoading(true);
   try{setItems(await repo.expenses())}
   catch(e){Alert.alert("טעינת הוצאות נכשלה",e instanceof Error?e.message:"שגיאה לא ידועה")}
   finally{setLoading(false)}
 },[repo]);

 useEffect(()=>{void load()},[load]);

 async function chooseCamera(){
   try{setAttachment(await takeExpensePhoto())}
   catch(e){Alert.alert("מצלמה",e instanceof Error?e.message:"שגיאה לא ידועה")}
 }
 async function chooseGallery(){
   try{setAttachment(await pickExpensePhoto())}
   catch(e){Alert.alert("גלריה",e instanceof Error?e.message:"שגיאה לא ידועה")}
 }

 async function add(){
   if(!repo||!businessId)return;
   const value=Math.round(Number(amount.replace(",","."))*100);
   if(!supplier.trim()||!Number.isFinite(value)||value<=0){
     Alert.alert("חסרים פרטים","יש להזין ספק וסכום תקין.");return;
   }
   if(supplier.trim().length>160){Alert.alert("שם ספק ארוך מדי","שם ספק יכול להכיל עד 160 תווים.");return}
   if(!validDate(date)){Alert.alert("תאריך לא תקין","יש להזין תאריך בפורמט YYYY-MM-DD.");return}
   if(category.trim().length<1||category.trim().length>80){Alert.alert("קטגוריה לא תקינה","קטגוריה יכולה להכיל עד 80 תווים.");return}
   if(notes.length>2000){Alert.alert("הערה ארוכה מדי","הערה יכולה להכיל עד 2000 תווים.");return}
   setLoading(true);
   try{
     const created=await repo.addExpense({
       expenseDate:date,supplierName:supplier,amountAgorot:value,category,notes
     });

     if(attachment){
       try{
         const uploaded=await uploadExpenseAttachment(businessId,created.id,attachment);
         await repo.setExpenseAttachment(created.id,uploaded.storageKey,uploaded.originalName);
       }catch(e){
         Alert.alert(
           "ההוצאה נשמרה",
           `ההוצאה נשמרה, אבל העלאת האסמכתא נכשלה: ${e instanceof Error?e.message:"שגיאה לא ידועה"}`
         );
       }
     }

     setSupplier("");setAmount("");setNotes("");setCategory("אחר");setDate(today());setAttachment(null);
     await load();
   }catch(e){
     Alert.alert("שמירת הוצאה נכשלה",e instanceof Error?e.message:"שגיאה לא ידועה");
   }finally{setLoading(false)}
 }

 async function openAttachment(item:Expense){
   if(!item.attachmentPath)return;
   try{
     const url=await createExpenseAttachmentSignedUrl(item.attachmentPath);
     await Linking.openURL(assertTrustedSupabaseSignedUrl(url));
   }catch(e){
     Alert.alert("פתיחת אסמכתא נכשלה",e instanceof Error?e.message:"שגיאה לא ידועה");
   }
 }

 return <View style={s.screen}>
   <Text style={s.title}>הוצאות</Text>
   <Text style={s.subtitle}>הוצאות ואסמכתאות משותפות ל־Windows ול־Android</Text>

   <View style={s.card}>
     <Text style={s.cardTitle}>הוצאה חדשה</Text>
     <TextInput style={s.input} value={date} onChangeText={v=>setDate(sanitizeDate(v))} maxLength={10} keyboardType="number-pad" placeholder="YYYY-MM-DD" textAlign="right"/>
     <TextInput style={s.input} value={supplier} onChangeText={v=>setSupplier(v.slice(0,160))} maxLength={160} placeholder="שם ספק" textAlign="right"/>
     <TextInput style={s.input} value={amount} onChangeText={v=>setAmount(sanitizeMoney(v))} maxLength={13} placeholder="סכום בשקלים" keyboardType="decimal-pad" textAlign="right"/>
     <TextInput style={s.input} value={category} onChangeText={v=>setCategory(v.slice(0,80))} maxLength={80} placeholder="קטגוריה" textAlign="right"/>
     <TextInput style={[s.input,{minHeight:70}]} value={notes} onChangeText={v=>setNotes(v.slice(0,2000))} maxLength={2000} placeholder="הערות" multiline textAlign="right"/>

     <View style={s.attachmentActions}>
       <Pressable style={s.attachButton} onPress={()=>void chooseCamera()}>
         <Ionicons name="camera-outline" size={20} color={theme.primary}/>
         <Text style={s.attachText}>צילום אסמכתא</Text>
       </Pressable>
       <Pressable style={s.attachButton} onPress={()=>void chooseGallery()}>
         <Ionicons name="images-outline" size={20} color={theme.primary}/>
         <Text style={s.attachText}>בחירה מהגלריה</Text>
       </Pressable>
     </View>

     {attachment?<View style={s.selected}>
       <Ionicons name="checkmark-circle" size={20} color={theme.primary}/>
       <Text style={s.selectedText}>נבחרה אסמכתא: {attachment.originalName}</Text>
       <Pressable onPress={()=>setAttachment(null)}><Text style={s.remove}>הסר</Text></Pressable>
     </View>:null}

     <Pressable style={s.button} disabled={!repo||loading} onPress={()=>void add()}>
       <Text style={s.buttonText}>שמירת הוצאה</Text>
     </Pressable>
   </View>

   <FlatList
     data={items}
     keyExtractor={item=>item.id}
     refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>void load()}/>}
     contentContainerStyle={s.list}
     ListEmptyComponent={<Text style={s.empty}>עדיין אין הוצאות</Text>}
     renderItem={({item})=><View style={s.item}>
       <Text style={s.itemTitle}>{item.supplierName}</Text>
       <Text style={s.itemText}>{item.expenseDate} · {item.category}</Text>
       <Text style={s.amount}>₪ {(item.amountAgorot/100).toFixed(2)}</Text>
       {item.notes?<Text style={s.itemText}>{item.notes}</Text>:null}
       {item.attachmentPath?<Pressable style={s.openAttachment} onPress={()=>void openAttachment(item)}>
         <Ionicons name="document-attach-outline" size={18} color={theme.primary}/>
         <Text style={s.openAttachmentText}>פתיחת אסמכתא</Text>
       </Pressable>:null}
     </View>}
   />
 </View>;
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:theme.background,padding:18,direction:"rtl"},
 title:{fontSize:28,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:12},
 subtitle:{fontSize:14,color:theme.muted,textAlign:"right",marginTop:4,marginBottom:14},
 card:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border,gap:10},
 cardTitle:{fontSize:18,fontWeight:"800",color:theme.text,textAlign:"right"},
 input:{backgroundColor:"#F8FAFC",borderWidth:1,borderColor:theme.border,borderRadius:12,padding:12},
 button:{backgroundColor:theme.primary,borderRadius:12,padding:14,alignItems:"center"},
 buttonText:{color:"#fff",fontWeight:"800"},
 attachmentActions:{flexDirection:"row",gap:8},
 attachButton:{flex:1,flexDirection:"row",gap:6,alignItems:"center",justifyContent:"center",backgroundColor:theme.primarySoft,borderRadius:12,padding:11},
 attachText:{color:theme.primary,fontWeight:"700",fontSize:12},
 selected:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#F8FAFC",borderRadius:12,padding:10},
 selectedText:{flex:1,color:theme.text,fontSize:12,textAlign:"right"},
 remove:{color:theme.danger,fontWeight:"700"},
 list:{gap:10,paddingVertical:14,paddingBottom:100},
 item:{backgroundColor:"#fff",borderRadius:16,padding:15,borderWidth:1,borderColor:theme.border},
 itemTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},
 itemText:{fontSize:13,color:theme.muted,textAlign:"right",marginTop:3},
 amount:{fontSize:18,fontWeight:"800",color:theme.primary,textAlign:"right",marginTop:5},
 openAttachment:{marginTop:10,flexDirection:"row",gap:6,alignItems:"center",justifyContent:"flex-end"},
 openAttachmentText:{color:theme.primary,fontWeight:"700"},
 empty:{textAlign:"center",color:theme.muted,padding:30}
});
