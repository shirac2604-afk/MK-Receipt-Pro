import * as SecureStore from "expo-secure-store";
import type { TaxAuthorityMobileTokenSet } from "./TaxAuthorityMobile2027";

const TOKEN_KEY="mkreceiptpro.tax_authority_2027.tokens.v1";

export class TaxAuthorityMobile2027SecureStore{
  async load():Promise<TaxAuthorityMobileTokenSet|null>{
    const raw=await SecureStore.getItemAsync(TOKEN_KEY);
    if(!raw)return null;
    try{return JSON.parse(raw) as TaxAuthorityMobileTokenSet}
    catch{throw new Error("TAX_AUTHORITY_MOBILE_2027_SECURE_STORE_CORRUPT")}
  }

  async save(tokens:TaxAuthorityMobileTokenSet):Promise<void>{
    await SecureStore.setItemAsync(TOKEN_KEY,JSON.stringify(tokens),{
      keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  }

  async clear():Promise<void>{
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
