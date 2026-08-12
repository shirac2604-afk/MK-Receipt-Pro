import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
import {useAuth} from "./AuthContext";
import {getMyBusiness} from "../data/supabase/BusinessRepository";
import {ensureAndroidDevice} from "../data/supabase/DeviceRepository";

type BusinessValue={
  businessId:string|null;
  deviceId:string|null;
  role:"owner"|"admin"|"member"|null;
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
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  async function reload(){
    if(!session){setBusinessId(null);setDeviceId(null);setRole(null);setLoading(false);return}
    setLoading(true);setError(null);
    try{
      const membership=await getMyBusiness();
      const device=await ensureAndroidDevice(membership.business_id);
      setBusinessId(membership.business_id);
      setRole(membership.role);
      setDeviceId(device);
    }catch(e){
      setError(e instanceof Error?e.message:"BUSINESS_CONTEXT_FAILED");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{void reload()},[session?.user.id]);

  const value=useMemo<BusinessValue>(()=>({businessId,deviceId,role,loading,error,reload}),[businessId,deviceId,role,loading,error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBusiness(){
  const value=useContext(Ctx);
  if(!value)throw new Error("BUSINESS_PROVIDER_REQUIRED");
  return value;
}
