import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {supabase} from "../lib/supabase";

type BackupTable="customers"|"expenses"|"receipts"|"students"|"student_guardians"|"student_groups"|"student_group_members"|"lesson_series"|"lessons"|"lesson_participants"|"lesson_reminders";

const tables:BackupTable[]=["customers","expenses","receipts","students","student_guardians","student_groups","student_group_members","lesson_series","lessons","lesson_participants","lesson_reminders"];

export type LocalBackupResult={fileName:string;uri:string;recordCount:number;createdAt:string};

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
 const info=await FileSystem.getInfoAsync(uri,{size:true});
 if(!info.exists||!info.size)throw new Error("LOCAL_BACKUP_WRITE_FAILED");
 if(!(await Sharing.isAvailableAsync()))throw new Error("LOCAL_BACKUP_SHARING_UNAVAILABLE");
 await Sharing.shareAsync(uri,{mimeType:"application/json",dialogTitle:"שמירת גיבוי MK Receipt Pro",UTI:"public.json"});
 return{fileName,uri,recordCount,createdAt};
}
