import { SUPABASE_URL } from "../config/supabasePublic";
import type { TaxAuthorityMobileConfig } from "./TaxAuthorityMobile2027";

export function loadTaxAuthorityMobile2027Config():TaxAuthorityMobileConfig{
  const environment=(process.env.EXPO_PUBLIC_TAX_AUTHORITY_ENVIRONMENT?.trim()||"sandbox") as "sandbox"|"production";
  if(environment!=="sandbox"&&environment!=="production")throw new Error("TAX_AUTHORITY_MOBILE_2027_INVALID_ENVIRONMENT");
  const clientId=process.env.EXPO_PUBLIC_TAX_AUTHORITY_CLIENT_ID?.trim()||"";
  const redirectUri=process.env.EXPO_PUBLIC_TAX_AUTHORITY_REDIRECT_URI?.trim()||"";
  const scope=process.env.EXPO_PUBLIC_TAX_AUTHORITY_SCOPE?.trim()||"";
  const brokerEndpoint=`${SUPABASE_URL.replace(/\/$/,"")}/functions/v1/tax-authority-oauth-2027`;
  return {environment,clientId,redirectUri,scope,brokerEndpoint};
}
