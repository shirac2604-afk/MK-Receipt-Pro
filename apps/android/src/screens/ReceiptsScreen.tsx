import React,{useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Alert,FlatList,Modal,Pressable,RefreshControl,StyleSheet,Text,TextInput,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type {Customer,PaymentMethod,Receipt} from "../domain/types";
import {useBusiness} from "../context/BusinessContext";
import {ReceiptRepository} from "../data/supabase/ReceiptRepository";
import {useLiveDataRepository} from "../hooks/useLiveDataRepository";
import {createStoreAndOptionallyShareReceiptPdf,openStoredReceiptPdf,type ReceiptDocumentProgress} from "../services/ReceiptDocumentWorkflow";
import {formatUnknownError} from "../services/ErrorFormatter";
import {theme} from "../theme/theme";
import {sanitizeDate,sanitizeMoney,validDate} from "../securityValidation";

const today=()=>new Date().toISOString().slice(0,10);
const payments:Array<{key:PaymentMethod;label:string}>=[{key:"cash",label:"מזומן"},{key:"bank_transfer",label:"העברה בנקאית"},{key:"bit",label:"Bit"},{key:"paybox",label:"PayBox"}];
const progressLabel=(stage:ReceiptDocumentProgress|string)=>({issuing:"מנפיק קבלה בענן…",loading_business:"טוען פרטי עסק…",creating_pdf:"יוצר PDF…",uploading_pdf:"מעלה PDF לענן…",saving_pdf_key:"שומר קישור למסמך…",sharing_pdf:"מכין שיתוף…",opening_pdf:"פותח PDF…"} as Record<string,string>)[stage]||"מעבד…";

export default function ReceiptsScreen(){
 const {businessId}=useBusiness();
 const repo=useMemo(()=>businessId?new ReceiptRepository(businessId):null,[businessId]);
 const liveRepo=useLiveDataRepository();
 const [items,setItems]=useState<Receipt[]>([]);
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [customerPickerOpen,setCustomerPickerOpen]=useState(false);
 const [selectedCustomerId,setSelectedCustomerId]=useState<string|null>(null);
 const [clientPhone,setClientPhone]=useState("");
 const [clientEmail,setClientEmail]=useState("");
 const [clientName,setClientName]=useState("");
 const [description,setDescription]=useState("");
 const [amount,setAmount]=useState("");
 const [paymentDate,setPaymentDate]=useState(today());
 const [paymentMethod,setPaymentMethod]=useState<PaymentMethod>("cash");
 const [referenceNumber,setReferenceNumber]=useState("");
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [cancelTarget,setCancelTarget]=useState<Receipt|null>(null);
 const [cancelReason,setCancelReason]=useState("");
 const issueLock=useRef(false);
 const cancelLock=useRef(false);

 const load=useCallback(async()=>{if(!repo)return;setBusy(true);try{setItems(await repo.list())}catch(e){Alert.alert("טעינת קבלות נכשלה",formatUnknownError(e))}finally{setBusy(false)}},[repo]);
 const loadCustomers=useCallback(async()=>{
  if(!liveRepo)return;
  try{setCustomers(await liveRepo.customers())}
  catch(e){Alert.alert("טעינת לקוחות נכשלה",formatUnknownError(e))}
 },[liveRepo]);
 useEffect(()=>{void load();void loadCustomers()},[load,loadCustomers]);

 function selectCustomer(customer:Customer){
  setSelectedCustomerId(customer.id);
  setClientName(customer.displayName);
  setClientPhone(customer.phone??"");
  setClientEmail(customer.email??"");
  setCustomerPickerOpen(false);
 }

 function clearSelectedCustomer(){
  setSelectedCustomerId(null);
  setClientName("");
  setClientPhone("");
  setClientEmail("");
 }

 async function issue(){
  if(!repo||!businessId||issueLock.current)return;
  const agorot=Math.round(Number(amount.replace(",","."))*100);
  if(!clientName.trim()||!description.trim()||!Number.isFinite(agorot)||agorot<=0){Alert.alert("חסרים פרטים","יש להזין לקוח, תיאור וסכום תקין.");return}
  if(clientName.trim().length>160||description.trim().length>500){Alert.alert("טקסט ארוך מדי","שם לקוח יכול להכיל עד 160 תווים ותיאור עד 500.");return}
  if(!validDate(paymentDate)){Alert.alert("תאריך לא תקין","יש להזין תאריך בפורמט YYYY-MM-DD.");return}
  issueLock.current=true;
  setBusy(true);
  try{
   setProgress("מנפיק קבלה בענן…");
   const receipt=await repo.issue({customerId:selectedCustomerId,clientName,clientPhone,clientEmail,description,amountAgorot:agorot,paymentDate,paymentMethod,referenceNumber});
   setItems(current=>[receipt,...current.filter(x=>x.id!==receipt.id)]);
   try{
    const result=await createStoreAndOptionallyShareReceiptPdf({businessId,receipt,repository:repo,share:true,onProgress:stage=>setProgress(progressLabel(stage))});
    if(result.receipt?.id){setItems(current=>current.filter(Boolean).map(x=>x.id===receipt.id?result.receipt:x));}
    Alert.alert("הקבלה הונפקה",`קבלה ${receipt.receiptNumber} הונפקה וה-PDF נשמר בענן.`);
   }catch(pdfError){
    Alert.alert("הקבלה הונפקה",`קבלה ${receipt.receiptNumber} נשמרה, אך ה-PDF לא נשמר.\n\n${formatUnknownError(pdfError)}\n\nאפשר ליצור אותו מחדש מההיסטוריה.`);
   }
   setSelectedCustomerId(null);setClientName("");setClientPhone("");setClientEmail("");setDescription("");setAmount("");setReferenceNumber("");setPaymentDate(today());setPaymentMethod("cash");
   await load();
  }catch(e){Alert.alert("הפקת קבלה נכשלה",formatUnknownError(e))}
  finally{issueLock.current=false;setProgress("");setBusy(false)}
 }

 async function regenerate(item:Receipt){
  if(!repo||!businessId)return;
  setBusy(true);
  try{
   const result=await createStoreAndOptionallyShareReceiptPdf({businessId,receipt:item,repository:repo,share:false,onProgress:stage=>setProgress(progressLabel(stage))});
   if(result.receipt?.id){setItems(current=>current.filter(Boolean).map(x=>x.id===item.id?result.receipt:x));}
   Alert.alert("PDF נוצר",`ה-PDF של קבלה ${item.receiptNumber} נשמר בענן.`);
  }catch(e){Alert.alert("יצירת PDF מחדש נכשלה",formatUnknownError(e))}
  finally{setProgress("");setBusy(false)}
 }

 async function cancelReceipt(){
  if(!repo||!cancelTarget||cancelLock.current)return;
  if(cancelReason.trim().length<5){Alert.alert("נדרש נימוק","יש להזין סיבת ביטול של לפחות 5 תווים.");return}
  cancelLock.current=true;
  setBusy(true);
  try{
   const updated=await repo.cancel(cancelTarget.id,cancelReason);
   setItems(current=>current.map(x=>x.id===updated.id?updated:x));
   setCancelTarget(null);setCancelReason("");
   Alert.alert("הקבלה בוטלה",`קבלה ${updated.receiptNumber} סומנה כמבוטלת בענן והעדכון יסונכרן לכל המכשירים.`);
   await load();
  }catch(e){Alert.alert("ביטול הקבלה נכשל",formatUnknownError(e))}
  finally{cancelLock.current=false;setBusy(false)}
 }

 async function openReceipt(item:Receipt){
  if(!item.originalPdfPath){
   Alert.alert("אין PDF שמור",`לקבלה ${item.receiptNumber} אין עדיין PDF בענן.`,[{text:"ביטול",style:"cancel"},{text:"צור PDF מחדש",onPress:()=>void regenerate(item)}]);
   return;
  }
  setBusy(true);
  try{setProgress("פותח PDF…");await openStoredReceiptPdf(item.originalPdfPath,stage=>setProgress(progressLabel(stage)))}
  catch(e){Alert.alert("פתיחת הקבלה נכשלה",formatUnknownError(e))}
  finally{setProgress("");setBusy(false)}
 }

 return <View style={s.screen}>
  <Text style={s.title}>קבלות</Text><Text style={s.subtitle}>הפקה עם PDF שמור בענן</Text>
  <View style={s.card}>
   <View style={s.customerChooser}>
    <Pressable style={s.customerButton} onPress={()=>setCustomerPickerOpen(open=>!open)} disabled={busy}>
     <Ionicons name="people-outline" size={20} color={theme.primary}/>
     <View style={{flex:1}}><Text style={s.customerButtonTitle}>{selectedCustomerId?clientName:"בחירת לקוח קיים"}</Text><Text style={s.customerButtonSub}>{selectedCustomerId?(clientPhone||clientEmail||"לקוח נבחר"):"לחץ לבחירה מרשימת הלקוחות"}</Text></View>
     <Ionicons name="chevron-back" size={20} color={theme.muted}/>
    </Pressable>
    {selectedCustomerId?<Pressable onPress={clearSelectedCustomer}><Text style={s.clearCustomer}>נקה בחירה / לקוח מזדמן</Text></Pressable>:null}
   </View>
   {customerPickerOpen?<View style={s.inlineCustomerPanel}>
    <View style={s.inlineCustomerHeader}><Text style={s.inlineCustomerTitle}>בחר לקוח</Text><Pressable onPress={()=>setCustomerPickerOpen(false)} hitSlop={10}><Ionicons name="close" size={22} color={theme.text}/></Pressable></View>
    {customers.length===0?<Text style={s.inlineCustomerEmpty}>אין עדיין לקוחות שמורים</Text>:customers.map(customer=><Pressable key={customer.id} style={s.customerRow} onPress={()=>selectCustomer(customer)} android_ripple={{color:theme.primarySoft}}>
     <Ionicons name="person-circle-outline" size={28} color={theme.primary}/>
     <View style={{flex:1}}><Text style={s.customerRowTitle}>{customer.displayName}</Text>{customer.phone?<Text style={s.customerRowText}>{customer.phone}</Text>:null}{customer.email?<Text style={s.customerRowText}>{customer.email}</Text>:null}</View>
     <Ionicons name="chevron-back" size={18} color={theme.muted}/>
    </Pressable>)}
   </View>:null}
   <TextInput style={s.input} value={clientName} maxLength={160} onChangeText={value=>{setClientName(value.slice(0,160));if(selectedCustomerId)setSelectedCustomerId(null)}} placeholder="או הזן שם לקוח מזדמן"/>
   <TextInput style={s.input} value={description} maxLength={500} onChangeText={v=>setDescription(v.slice(0,500))} placeholder="עבור / תיאור"/>
   <TextInput style={s.input} value={amount} maxLength={13} onChangeText={v=>setAmount(sanitizeMoney(v))} placeholder="סכום בשקלים" keyboardType="decimal-pad"/>
   <TextInput style={s.input} value={paymentDate} maxLength={10} keyboardType="number-pad" onChangeText={v=>setPaymentDate(sanitizeDate(v))} placeholder="YYYY-MM-DD"/>
   <View style={s.payments}>{payments.map(p=><Pressable key={p.key} onPress={()=>setPaymentMethod(p.key)} style={[s.payment,paymentMethod===p.key&&s.active]}><Text style={paymentMethod===p.key?s.activeText:s.paymentText}>{p.label}</Text></Pressable>)}</View>
   <TextInput style={s.input} value={referenceNumber} maxLength={120} onChangeText={v=>setReferenceNumber(v.slice(0,120))} placeholder="מספר אסמכתא (לא חובה)"/>
   {progress?<View style={s.progressBox}><Ionicons name="cloud-upload-outline" size={18} color={theme.primary}/><Text style={s.progressText}>{progress}</Text></View>:null}
   <Pressable style={s.button} disabled={busy} onPress={()=>void issue()}><Ionicons name="receipt-outline" size={20} color="#fff"/><Text style={s.buttonText}>{busy?"נא להמתין…":"הפקת קבלה"}</Text></Pressable>
  </View>
  <Text style={s.history}>היסטוריית קבלות</Text>
  <FlatList data={items.filter(Boolean)} keyExtractor={i=>i.id} refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>void load()}/>} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>עדיין אין קבלות</Text>} renderItem={({item})=><Pressable style={s.item} onPress={()=>void openReceipt(item)}><View style={s.row}><View style={{flex:1}}><Text style={s.num}>#{item.receiptNumber}</Text><Text style={s.itemTitle}>{item.clientName}</Text><Text style={s.itemText}>{item.paymentDate} · {item.description}</Text><Text style={s.amount}>₪ {(item.amountAgorot/100).toFixed(2)}</Text></View><View style={s.pdfState}><Ionicons name={item.status==="cancelled"?"close-circle-outline":item.originalPdfPath?"document-text-outline":"cloud-upload-outline"} size={24} color={item.status==="cancelled"?"#B42318":item.originalPdfPath?theme.primary:theme.muted}/><Text style={item.status==="cancelled"?s.cancelled:item.originalPdfPath?s.pdfOk:s.pdfMissing}>{item.status==="cancelled"?"מבוטלת":item.originalPdfPath?"פתח PDF":"צור PDF"}</Text>{item.status==="active"?<Pressable onPress={(e)=>{e.stopPropagation();setCancelTarget(item);setCancelReason("")}}><Text style={s.cancelLink}>ביטול</Text></Pressable>:null}</View></View></Pressable>}/>
  <Modal transparent visible={Boolean(cancelTarget)} animationType="fade" onRequestClose={()=>setCancelTarget(null)}>
   <View style={s.modalBackdrop}><View style={s.modalCard}>
    <Text style={s.modalTitle}>ביטול קבלה {cancelTarget?.receiptNumber}</Text>
    <Text style={s.modalText}>הביטול יישמר בענן ויופיע בכל המכשירים. מספר הקבלה לא ישמש מחדש.</Text>
    <TextInput style={[s.input,s.reasonInput]} multiline value={cancelReason} maxLength={500} onChangeText={v=>setCancelReason(v.slice(0,500))} placeholder="סיבת הביטול"/>
    <View style={s.modalActions}><Pressable style={s.secondaryButton} onPress={()=>{setCancelTarget(null);setCancelReason("")}}><Text>חזרה</Text></Pressable><Pressable style={s.dangerButton} disabled={busy} onPress={()=>void cancelReceipt()}><Text style={s.dangerText}>בטל קבלה</Text></Pressable></View>
   </View></View>
  </Modal>
 </View>;
}

const s=StyleSheet.create({screen:{flex:1,backgroundColor:theme.background,padding:18},title:{fontSize:30,fontWeight:"900",color:theme.text,textAlign:"right",marginTop:18},subtitle:{color:theme.muted,textAlign:"right",marginBottom:18},card:{backgroundColor:"#fff",borderRadius:theme.radius,padding:18,gap:11,borderWidth:1,borderColor:theme.border},input:{backgroundColor:"#FBFCFF",borderWidth:1,borderColor:theme.border,borderRadius:15,padding:13,textAlign:"right"},payments:{flexDirection:"row",flexWrap:"wrap",gap:7},payment:{paddingVertical:9,paddingHorizontal:11,borderRadius:12,backgroundColor:"#EDF3FA"},active:{backgroundColor:theme.primary},paymentText:{color:theme.text,fontSize:12},activeText:{color:"#fff",fontWeight:"700",fontSize:12},progressBox:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,backgroundColor:theme.primarySoft,borderRadius:12,padding:10},progressText:{color:theme.primary,fontWeight:"700",fontSize:12},button:{backgroundColor:theme.accent,borderRadius:15,padding:16,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},buttonText:{color:theme.navy,fontWeight:"900"},history:{fontSize:19,fontWeight:"900",textAlign:"right",marginTop:22,color:theme.text},list:{gap:10,paddingVertical:12,paddingBottom:100},item:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border},row:{flexDirection:"row",alignItems:"center",gap:12},num:{fontWeight:"900",color:theme.primary,textAlign:"right"},itemTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},itemText:{fontSize:13,color:theme.muted,textAlign:"right"},amount:{fontSize:18,fontWeight:"900",color:theme.text,textAlign:"right",marginTop:5},pdfState:{width:72,alignItems:"center",gap:3},pdfOk:{fontSize:11,color:theme.primary,fontWeight:"700"},pdfMissing:{fontSize:11,color:theme.muted,fontWeight:"700"},empty:{textAlign:"center",color:theme.muted,padding:30},cancelled:{fontSize:11,color:"#B42318",fontWeight:"800"},cancelLink:{fontSize:11,color:"#B42318",fontWeight:"700",marginTop:5},modalBackdrop:{flex:1,backgroundColor:"rgba(7,31,69,.45)",justifyContent:"center",padding:22},modalCard:{backgroundColor:"#fff",borderRadius:theme.radius,padding:18,gap:12},modalTitle:{fontSize:20,fontWeight:"900",color:theme.text,textAlign:"right"},modalText:{color:theme.muted,textAlign:"right",lineHeight:20},reasonInput:{minHeight:90,textAlignVertical:"top"},modalActions:{flexDirection:"row",gap:10,justifyContent:"flex-start"},secondaryButton:{paddingVertical:12,paddingHorizontal:18,borderRadius:12,backgroundColor:"#EDF3FA"},dangerButton:{paddingVertical:12,paddingHorizontal:18,borderRadius:12,backgroundColor:"#B42318"},dangerText:{color:"#fff",fontWeight:"800"},customerChooser:{gap:6},customerButton:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:theme.primarySoft,borderWidth:1,borderColor:"#B7D5F7",borderRadius:15,padding:13},customerButtonTitle:{fontWeight:"800",color:theme.text,textAlign:"right"},customerButtonSub:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:2},clearCustomer:{fontSize:12,color:theme.primary,fontWeight:"700",textAlign:"right"},inlineCustomerPanel:{gap:8,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:10,backgroundColor:"#F6F9FD"},inlineCustomerHeader:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between"},inlineCustomerTitle:{fontSize:15,fontWeight:"800",color:theme.text,textAlign:"right"},inlineCustomerEmpty:{textAlign:"center",color:theme.muted,padding:14},customerRow:{flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:theme.border,borderRadius:15,padding:12,backgroundColor:"#fff"},customerRowTitle:{fontSize:16,fontWeight:"800",color:theme.text,textAlign:"right"},customerRowText:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:2}});
