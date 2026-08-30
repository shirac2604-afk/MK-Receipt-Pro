import AsyncStorage from "@react-native-async-storage/async-storage";
import {Platform} from "react-native";
import * as Notifications from "expo-notifications";

const MAP_KEY="@mk-receipt-pro/student-reminder-notifications-v1";
const ENABLED_KEY="@mk-receipt-pro/student-reminder-notifications-enabled-v1";
const CHANNEL_ID="student-reminders";

type NotificationMap=Record<string,string>;
export type TeacherReminderNotification={dedupeKey:string;lessonId:string;scheduledFor:string;title:string;body:string;data?:Record<string,string>};

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldPlaySound:true,
    shouldSetBadge:false,
    shouldShowBanner:true,
    shouldShowList:true,
  }),
});

async function readMap():Promise<NotificationMap>{
  try{
    const raw=await AsyncStorage.getItem(MAP_KEY);
    const parsed=raw?JSON.parse(raw):{};
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{return {};}
}
async function writeMap(map:NotificationMap){await AsyncStorage.setItem(MAP_KEY,JSON.stringify(map));}

async function ensureChannel(){
  if(Platform.OS!=="android")return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID,{
    name:"תזכורות לשיעורים",
    importance:Notifications.AndroidImportance.HIGH,
    vibrationPattern:[0,250,150,250],
  });
}

export const TeacherReminderNotificationService={
  async isEnabled(){return (await AsyncStorage.getItem(ENABLED_KEY))==="1";},
  async setEnabled(enabled:boolean){
    await AsyncStorage.setItem(ENABLED_KEY,enabled?"1":"0");
    if(!enabled)await this.cancelAll();
    return enabled;
  },
  async requestPermission(){
    await ensureChannel();
    const current=await Notifications.getPermissionsAsync();
    if(current.granted)return true;
    const requested=await Notifications.requestPermissionsAsync();
    return requested.granted;
  },
  async sync(entries:TeacherReminderNotification[]){
    if(!(await this.isEnabled()))return {scheduled:0,cancelled:0};
    await ensureChannel();
    const permission=await Notifications.getPermissionsAsync();
    if(!permission.granted)throw new Error("אין הרשאה להציג התראות במכשיר.");

    const desired=new Map<string,TeacherReminderNotification>();
    for(const entry of entries){
      const key=entry.dedupeKey;
      if(!desired.has(key))desired.set(key,entry);
    }

    const map=await readMap();
    let cancelled=0,scheduled=0;
    for(const [key,notificationId] of Object.entries(map)){
      if(desired.has(key))continue;
      await Notifications.cancelScheduledNotificationAsync(notificationId).catch(()=>undefined);
      delete map[key];
      cancelled++;
    }

    for(const [key,entry] of desired){
      if(map[key])continue;
      const when=new Date(entry.scheduledFor);
      const trigger=when.getTime()>Date.now()
        ? {type:Notifications.SchedulableTriggerInputTypes.DATE,date:when,channelId:CHANNEL_ID} as const
        : null;
      const notificationId=await Notifications.scheduleNotificationAsync({
        content:{
          title:entry.title,
          body:entry.body,
          data:{kind:"teacher-reminder",lessonId:entry.lessonId,...entry.data},
        },
        trigger,
      });
      map[key]=notificationId;
      scheduled++;
    }
    await writeMap(map);
    return {scheduled,cancelled};
  },
  async cancelAll(){
    const map=await readMap();
    await Promise.all(Object.values(map).map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>undefined)));
    await writeMap({});
  },
};
