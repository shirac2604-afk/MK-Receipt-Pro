import { app, BrowserWindow, Menu, shell } from "electron";
import path from "node:path";
import { DatabaseService } from "../../../../packages/database/src/DatabaseService";
import { registerDatabaseHandlers } from "../ipc/databaseHandlers";
import { registerStudentHandlers } from "../ipc/studentHandlers";
import { registerLessonHandlers } from "../ipc/lessonHandlers";
import { GoogleDriveSyncService } from "./GoogleDriveSyncService";
import { SupabaseCloudService } from "./SupabaseCloudService";

app.setName("מפתחות להצלחה");
const cleanUserDataPath=path.join(app.getPath("appData"),"MK-Receipt-Pro-Production");
app.setPath("userData",cleanUserDataPath);
let mainWindow: BrowserWindow | null = null;
const databaseService = new DatabaseService();
function isTrustedExternalUrl(rawUrl:string):boolean{try{const url=new URL(rawUrl);if(url.protocol==="mailto:")return true;if(url.protocol!=="https:")return false;return new Set(["wa.me","accounts.google.com","noimclnzzuxcszdotmby.supabase.co"]).has(url.hostname.toLowerCase())}catch{return false}}
function createMainWindow():void{mainWindow=new BrowserWindow({width:1180,height:760,minWidth:980,minHeight:650,show:false,backgroundColor:"#f8fafc",title:"מפתחות להצלחה",autoHideMenuBar:true,icon:path.join(process.resourcesPath,"installer","app-icon.ico"),webPreferences:{preload:path.join(__dirname,"../preload/preload.js"),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged,navigateOnDragDrop:false}});mainWindow.setMenuBarVisibility(false);mainWindow.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));mainWindow.webContents.session.setPermissionCheckHandler(()=>false);mainWindow.webContents.setWindowOpenHandler(({url})=>{if(isTrustedExternalUrl(url))void shell.openExternal(url);return{action:"deny"}});mainWindow.webContents.on("will-navigate",(event,url)=>{const currentUrl=mainWindow?.webContents.getURL();if(currentUrl&&url!==currentUrl)event.preventDefault()});const devServerUrl=!app.isPackaged?process.env.VITE_DEV_SERVER_URL:undefined;if(devServerUrl==="http://127.0.0.1:5173")void mainWindow.loadURL(devServerUrl);else void mainWindow.loadFile(path.join(__dirname,"../../../../../dist/index.html"));mainWindow.once("ready-to-show",()=>mainWindow?.show());mainWindow.on("closed",()=>{mainWindow=null})}
app.whenReady().then(async()=>{Menu.setApplicationMenu(null);databaseService.initialize(app.getPath("userData"),app.getPath("documents"),process.resourcesPath);const cloudSync=new GoogleDriveSyncService(app.getPath("userData"),databaseService,process.resourcesPath);databaseService.setAutomaticCloudSyncHook(()=>cloudSync.schedulePush());const supabaseCloud=new SupabaseCloudService(app.getPath("userData"));await supabaseCloud.initialize();registerDatabaseHandlers(databaseService,cloudSync,supabaseCloud);registerStudentHandlers(supabaseCloud);registerLessonHandlers(supabaseCloud,databaseService);await cloudSync.initializeAndSync();createMainWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createMainWindow()})});
app.on("before-quit",()=>databaseService.close());app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
