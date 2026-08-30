import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {supabase} from "../lib/supabase";

type BackupTable="customers"|"expenses"|"receipts"|"students"|"student_guardians"|"student_groups"|"student_group_members"|"lesson_series"|"lessons"|"lesson_participants"|"lesson_reminders";

const tables:BackupTable[]=["customers","expenses","receipts","students","student_guardians","student_groups","student_group_members","lesson_series","lessons","lesson_participants","lesson_reminders"];

export type LocalBackupResult={fileName:string;uri:string;recordCount:number;createdAt:string};
export type LocalBackupInspection={valid:boolean;createdAt:string|null;recordCount:number;message:string;warnings:string[]};

async function readTable(table:BackupTable,businessId:string):Promise<unknown[]>{
 const {data,error}=await supabase.from(table).select("*").eq("business_id",businessId).limit(10_000);
 if(error)throw new Error(`LOCAL_BACKUP_${table.toUpperCase()}_FAILED:${error.message}`);
 return data??[];
}

export async function createAndShareLocalBackup(businessId:string):Promise<LocalBackupResult>{
 if(!businessId)throw new Error("LOCAL_BACKUP_BUSINESS_REQUIRED");
 const createdAt=new Date().toISOString();
 const [businessResult,...rows]=await Promise.all([
  supabase.from("businesses").select("*").eq("id",businessId).single(),
  ...tables.map(table=>readTable(table,businessId))
 ]);
 if(businessResult.error||!businessResult.data)throw new Error(`LOCAL_BACKUP_BUSINESS_FAILED:${businessResult.error?.message??"NOT_FOUND"}`);
 const data=Object.fromEntries(tables.map((table,index)=>[table,rows[index]]));
 const recordCount=rows.reduce((count,row)=>count+row.length,1);
 const payload={format:"MK_RECEIPT_MOBILE_BACKUP",formatVersion:1,createdAt,businessId,business:businessResult.data,data,notes:{attachmentsIncluded:false,receiptPdfsIncluded:false,restore:"This is an export-only local backup. Restore is deliberately not automatic."}};
 const fileName=`MK-Receipt-Pro-Mobile-Backup-${createdAt.slice(0,10)}.json`;
 const baseDirectory=FileSystem.documentDirectory;
 if(!baseDirectory)throw new Error("LOCAL_BACKUP_STORAGE_UNAVAILABLE");
 const uri=`${baseDirectory}${fileName}`;
 await FileSystem.writeAsStringAsync(uri,JSON.stringify(payload),{encoding:FileSystem.EncodingType.UTF8});
 const info=await FileSystem.getInfoAsync(uri);
 if(!info.exists||!info.size)throw new Error("LOCAL_BACKUP_WRITE_FAILED");
 if(!(await Sharing.isAvailableAsync()))throw new Error("LOCAL_BACKUP_SHARING_UNAVAILABLE");
 await Sharing.shareAsync(uri,{mimeType:"application/json",dialogTitle:"שמירת גיבוי MK Receipt Pro",UTI:"public.json"});
 return{fileName,uri,recordCount,createdAt};
}

export async function inspectPickedLocalBackup(businessId:string):Promise<LocalBackupInspection|null>{
 const picked=await DocumentPicker.getDocumentAsync({type:["application/json","text/json"],copyToCacheDirectory:true,multiple:false});
 if(picked.canceled)return null;
 const asset=picked.assets?.[0];if(!asset?.uri)return{valid:false,createdAt:null,recordCount:0,message:"לא ניתן לקרוא את קובץ הגיבוי.",warnings:[]};
 try{
  const raw=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.UTF8});
  const payload=JSON.parse(raw) as any;
  if(payload?.format!=="MK_RECEIPT_MOBILE_BACKUP"||payload?.formatVersion!==1||!payload?.businessId||!payload?.data||typeof payload.data!=="object")return{valid:false,createdAt:null,recordCount:0,message:"זה אינו קובץ גיבוי תקין של MK Receipt Pro.",warnings:[]};
  const rows=Object.values(payload.data).flatMap(value=>Array.isArray(value)?value:[]);
  const warnings:string[]=[];
  if(payload.businessId!==businessId)warnings.push("הגיבוי שייך לעסק אחר מהעסק המחובר כרגע.");
  if(!payload.business||typeof payload.business!=="object")warnings.push("חסרים פרטי העסק בתוך הגיבוי.");
  if(payload.notes?.attachmentsIncluded===false)warnings.push("קבצי PDF ואסמכתאות אינם כלולים בגיבוי הנתונים.");
  return{valid:true,createdAt:typeof payload.createdAt==="string"?payload.createdAt:null,recordCount:rows.length+1,message:"מבנה הגיבוי תקין לקריאה. לא בוצע שחזור או שינוי נתונים.",warnings};
 }catch{return{valid:false,createdAt:null,recordCount:0,message:"הקובץ אינו JSON תקין או שלא ניתן לקרוא אותו.",warnings:[]};}
}
