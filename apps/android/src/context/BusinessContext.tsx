import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
import {useAuth} from "./AuthContext";
import {getMyBusiness} from "../data/supabase/BusinessRepository";
import {ensureAndroidDevice} from "../data/supabase/DeviceRepository";
import {getBusinessSubscription,provisionMyBusiness,type AccessMode,type BusinessSubscription} from "../data/supabase/SubscriptionRepository";

type BusinessValue={
  businessId:string|null;
  deviceId:string|null;
  role:"owner"|"admin"|"member"|null;
  subscription:BusinessSubscription|null;
  accessMode:AccessMode|null;
  canWrite:boolean;
  loading:boolean;
  error:string|null;
  reload:()=>Promise<void>;
};

const Ctx=createContext<BusinessValue|null>(null);

export function BusinessProvider({children}:{children:React.ReactNode}){
  const {session}=useAuth();
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [deviceId,setDeviceId]=useState<string|null>(null);
  const [role,setRole]=useState<BusinessValue["role"]>(null);
  const [subscription,setSubscription]=useState<BusinessSubscription|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  async function reload(){
    if(!session){
      setBusinessId(null);setDeviceId(null);setRole(null);setSubscription(null);setLoading(false);
      return;
    }
    setLoading(true);setError(null);
    try{
      let membership;
      try{
        membership=await getMyBusiness();
      }catch(error){
        if(!(error instanceof Error)||error.message!=="NO_BUSINESS_MEMBERSHIP")throw error;
        await provisionMyBusiness();
        membership=await getMyBusiness();
      }
      const currentSubscription=await getBusinessSubscription(membership.business_id);
      const device=await ensureAndroidDevice(membership.business_id);
      setBusinessId(membership.business_id);
      setRole(membership.role);
      setDeviceId(device);
      setSubscription(currentSubscription);
    }catch(e){
      setError(e instanceof Error?e.message:"BUSINESS_CONTEXT_FAILED");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{void reload()},[session?.user.id]);

  const accessMode=subscription?.accessMode??null;
  const value=useMemo<BusinessValue>(()=>({
    businessId,deviceId,role,subscription,accessMode,canWrite:accessMode==="full",loading,error,reload
  }),[businessId,deviceId,role,subscription,accessMode,loading,error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBusiness(){
  const value=useContext(Ctx);
  if(!value)throw new Error("BUSINESS_PROVIDER_REQUIRED");
  return value;
}
