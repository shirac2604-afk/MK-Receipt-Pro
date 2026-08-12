export interface CloudConfig {
  apiBaseUrl:string;
  publicApiKey:string;
  businessId:string;
}

export function loadCloudConfig():CloudConfig {
  const apiBaseUrl=process.env.EXPO_PUBLIC_MK_API_URL?.trim() ?? "";
  const publicApiKey=process.env.EXPO_PUBLIC_MK_PUBLIC_KEY?.trim() ?? "";
  const businessId=process.env.EXPO_PUBLIC_MK_BUSINESS_ID?.trim() ?? "";

  if(!apiBaseUrl || !publicApiKey || !businessId){
    throw new Error("CLOUD_CONFIGURATION_REQUIRED");
  }
  return {apiBaseUrl,publicApiKey,businessId};
}
