import {useMemo} from "react";
import {useBusiness} from "../context/BusinessContext";
import {LiveDataRepository} from "../data/supabase/LiveDataRepository";

export function useLiveDataRepository(){
  const {businessId}=useBusiness();
  return useMemo(()=>businessId?new LiveDataRepository(businessId):null,[businessId]);
}
