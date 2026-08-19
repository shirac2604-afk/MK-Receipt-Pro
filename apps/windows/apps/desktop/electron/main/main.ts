import { app, BrowserWindow, Menu, shell } from "electron";
import path from "node:path";
import { DatabaseService } from "../../../../packages/database/src/DatabaseService";
import { registerDatabaseHandlers } from "../ipc/databaseHandlers";
import { registerStudentHandlers } from "../ipc/studentHandlers";
import { registerLessonHandlers } from "../ipc/lessonHandlers";
import { registerReminderHandlers } from "../ipc/reminderHandlers";
import { registerGroupHandlers } from "../ipc/groupHandlers";
import { registerGoogleCalendarHandlers } from "../ipc/googleCalendarHandlers";
import { GoogleDriveSyncService } from "./GoogleDriveSyncService";
import { SupabaseCloudService } from "./SupabaseCloudService";
import { ReminderDispatchService } from "./ReminderDispatchService";
import { LocalStudentTestStore } from "./LocalStudentTestStore";
import { GoogleCalendarService } from "./GoogleCalendarService";
import { STUDENT_TEST_MODE } from "./SupabaseCloudConfig";

app.setName("מפתחות להצלחה - TEST");
const cleanUserDataPath=path.join(app.getPath("appData"),"MK-Receipt-Pro-Student-Test");
app.setPath("userData",cleanUserDataPath);
let mainWindow: BrowserWindow | null = null;
let reminderTimer:NodeJS.Timeout|null=null;
let googleCalendarTimer:NodeJS.Timeout|null=null;
const databaseService = new DatabaseService();
function isTrustedExternalUrl(rawUrl:string):boolean{try{const url=new URL(rawUrl);if(url.protocol==="mailto:")return true;if(url.protocol!=="https:")return false;return new Set(["wa.me","accounts.google.com","ymcmmvnfrfntmllytpyu.supabase.co"]).has(url.hostname.toLowerCase())}catch{return false}}
function createMainWindow():void{mainWindow=new BrowserWindow({width:1180,height:760,minWidth:980,minHeight:650,show:false,backgroundColor:"#f8fafc",title:"מפתחות להצלחה - TEST",autoHideMenuBar:true,icon:path.join(process.resourcesPath,"installer","app-icon.ico"),webPreferences:{preload:path.join(__dirname,"../preload/preload.js"),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged,navigateOnDragDrop:false}});mainWindow.setMenuBarVisibility(false);mainWindow.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));mainWindow.webContents.session.setPermissionCheckHandler(()=>false);mainWindow.webContents.setWindowOpenHandler(({url})=>{if(isTrustedExternalUrl(url))void shell.openExternal(url);return{action:"deny"}});mainWindow.webContents.on("will-navigate",(event,url)=>{const currentUrl=mainWindow?.webContents.getURL();if(currentUrl&&url!==currentUrl)event.preventDefault()});const devServerUrl=!app.isPackaged?process.env.VITE_DEV_SERVER_URL:undefined;if(devServerUrl==="http://127.0.0.1:5173")void mainWindow.loadURL(devServerUrl);else void mainWindow.loadFile(path.join(__dirname,"../../../../../dist/index.html"));mainWindow.once("ready-to-show",()=>mainWindow?.show());mainWindow.on("closed",()=>{mainWindow=null})}
app.whenReady().then(async()=>{
 Menu.setApplicationMenu(null);
 const userData=app.getPath("userData");
 databaseService.initialize(userData,app.getPath("documents"),process.resourcesPath);
 const cloudSync=new GoogleDriveSyncService(userData,databaseService,process.resourcesPath);
 databaseService.setAutomaticCloudSyncHook(()=>{if(!STUDENT_TEST_MODE)cloudSync.schedulePush();});
 const supabaseCloud=new SupabaseCloudService(userData);
 const localStudentStore=new LocalStudentTestStore(userData);
 const googleCalendar=new GoogleCalendarService(userData);
 if(!STUDENT_TEST_MODE)await supabaseCloud.initialize();
 const reminderDispatch=new ReminderDispatchService(supabaseCloud);
 registerDatabaseHandlers(databaseService,cloudSync,supabaseCloud);
 registerStudentHandlers(supabaseCloud,localStudentStore);
 registerLessonHandlers(supabaseCloud,localStudentStore);
 registerGroupHandlers(supabaseCloud,localStudentStore);
 registerReminderHandlers(reminderDispatch);
 registerGoogleCalendarHandlers(googleCalendar,localStudentStore);
 if(!STUDENT_TEST_MODE){
  reminderTimer=setInterval(()=>{void reminderDispatch.dispatchDue().catch(error=>console.warn("[Reminder worker] dispatch failed",error));},60000);
  await cloudSync.initializeAndSync();
 }
 let lastGoogleSnapshot="";
 const autoSyncGoogle=async()=>{
  const status=googleCalendar.getStatus();
  if(!status.connected||status.syncing)return;
  const from=new Date();from.setDate(from.getDate()-30);
  const to=new Date();to.setFullYear(to.getFullYear()+1);
  const lessons=localStudentStore.listLessonsForSync(from.toISOString(),to.toISOString());
  const snapshot=JSON.stringify(lessons.map(x=>[x.id,x.title,x.startsAt,x.endsAt,x.status,x.lessonSummary,x.homework]));
  if(snapshot===lastGoogleSnapshot)return;
  try{const result=await googleCalendar.syncLessons(lessons);if(result.failed===0)lastGoogleSnapshot=snapshot;}catch(error){console.warn("[Google Calendar] automatic sync failed",error);}
 };
 googleCalendarTimer=setInterval(()=>{void autoSyncGoogle();},60000);
 setTimeout(()=>{void autoSyncGoogle();},5000).unref();
 createMainWindow();
 app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createMainWindow()});
});
app.on("before-quit",()=>{if(reminderTimer)clearInterval(reminderTimer);if(googleCalendarTimer)clearInterval(googleCalendarTimer);databaseService.close()});app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
