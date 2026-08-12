import {supabase} from "../lib/supabase";
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from "../config/supabasePublic";

export type SupabaseDiagnostic={
  rawFetchOk:boolean;
  rawFetchStatus:number;
  rawFetchMessage:string;
  authClientOk:boolean;
  authClientMessage:string;
  url:string;
};

export async function testSupabaseConnection():Promise<SupabaseDiagnostic>{
  let rawFetchOk=false;
  let rawFetchStatus=0;
  let rawFetchMessage="";
  try{
    const response=await fetch(`${SUPABASE_URL}/auth/v1/settings`,{
      method:"GET",
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    rawFetchOk=response.ok;
    rawFetchStatus=response.status;
    rawFetchMessage=(await response.text()).slice(0,220);
  }catch(e){
    rawFetchMessage=e instanceof Error?e.message:String(e);
  }

  let authClientOk=false;
  let authClientMessage="";
  try{
    const {error}=await supabase.auth.getSession();
    if(error)authClientMessage=error.message;
    else{authClientOk=true;authClientMessage="Supabase Auth client ready";}
  }catch(e){
    authClientMessage=e instanceof Error?e.message:String(e);
  }

  return {
    rawFetchOk,rawFetchStatus,rawFetchMessage,
    authClientOk,authClientMessage,
    url:SUPABASE_URL
  };
}
