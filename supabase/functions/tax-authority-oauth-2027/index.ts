import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

type Action="exchange_code"|"refresh_token";
interface Payload {action:Action;code?:string;refreshToken?:string;}

function json(status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
function requiredEnv(name:string):string{
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`MISSING_${name}`);
  return value;
}
function readPublishableKey():string|null{
  const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if(raw){try{const parsed=JSON.parse(raw);if(typeof parsed?.default==="string"&&parsed.default)return parsed.default;}catch{}}
  return Deno.env.get("SUPABASE_ANON_KEY")?.trim()||null;
}
async function authenticate(req:Request):Promise<boolean>{
  const authorization=req.headers.get("authorization")?.trim()||"";
  if(!authorization.startsWith("Bearer "))return false;
  const url=Deno.env.get("SUPABASE_URL")?.trim();
  const publishableKey=readPublishableKey();
  if(!url||!publishableKey)return false;
  const client=createClient(url,publishableKey,{global:{headers:{Authorization:authorization}}});
  const token=authorization.slice("Bearer ".length);
  const{data:{user},error}=await client.auth.getUser(token);
  return !error&&!!user;
}
function tokenEndpoint():string{
  const env=(Deno.env.get("TAX_AUTHORITY_ENVIRONMENT")?.trim()||"sandbox").toLowerCase();
  if(env!=="sandbox")throw new Error("PRODUCTION_NOT_CONFIRMED");
  return "https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/token";
}
function tokenHeaders(clientId:string,clientSecret:string,withBasic:boolean):HeadersInit{
  const headers:Record<string,string>={"content-type":"application/x-www-form-urlencoded"};
  if(withBasic)headers.authorization=`Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  return headers;
}
function sanitizeTokenResponse(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("INVALID_TOKEN_RESPONSE");
  const body=value as Record<string,unknown>;
  for(const key of ["access_token","refresh_token","token_type","expires_in","refresh_token_expires_in"]){
    if(body[key]===undefined||body[key]===null||body[key]==="")throw new Error("INVALID_TOKEN_RESPONSE");
  }
  return {
    token_type:body.token_type,
    access_token:body.access_token,
    refresh_token:body.refresh_token,
    scope:body.scope??"",
    expires_in:body.expires_in,
    consented_on:body.consented_on??null,
    refresh_token_expires_in:body.refresh_token_expires_in,
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"});
  if(!(await authenticate(req)))return json(401,{ok:false,error:"AUTHENTICATION_REQUIRED"});

  let payload:Payload;
  try{payload=await req.json()}catch{return json(400,{ok:false,error:"INVALID_JSON"})}
  if(payload?.action!=="exchange_code"&&payload?.action!=="refresh_token")return json(400,{ok:false,error:"INVALID_ACTION"});

  let clientId:string,clientSecret:string,scope:string,redirectUri:string;
  try{
    clientId=requiredEnv("TAX_AUTHORITY_CLIENT_ID");
    clientSecret=requiredEnv("TAX_AUTHORITY_CLIENT_SECRET");
    scope=requiredEnv("TAX_AUTHORITY_SCOPE");
    redirectUri=requiredEnv("TAX_AUTHORITY_REDIRECT_URI");
  }catch(error){
    console.warn("[tax-authority-oauth-2027] configuration missing");
    return json(503,{ok:false,error:error instanceof Error?error.message:"CONFIGURATION_MISSING"});
  }

  let body:URLSearchParams;
  let withBasic=false;
  if(payload.action==="exchange_code"){
    const code=String(payload.code??"").trim();
    if(!code)return json(400,{ok:false,error:"AUTHORIZATION_CODE_REQUIRED"});
    withBasic=true;
    body=new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:redirectUri,scope});
  }else{
    const refreshToken=String(payload.refreshToken??"").trim();
    if(!refreshToken)return json(400,{ok:false,error:"REFRESH_TOKEN_REQUIRED"});
    body=new URLSearchParams({client_id:clientId,scope,refresh_token:refreshToken,grant_type:"refresh_token",client_secret:clientSecret});
  }

  let response:Response;
  try{
    response=await fetch(tokenEndpoint(),{
      method:"POST",
      headers:tokenHeaders(clientId,clientSecret,withBasic),
      body:body.toString(),
      redirect:"error",
    });
  }catch{
    return json(502,{ok:false,error:"TAX_AUTHORITY_NETWORK_ERROR"});
  }

  let parsed:unknown={};
  try{parsed=await response.json()}catch{}
  if(!response.ok){
    console.warn("[tax-authority-oauth-2027] token endpoint rejected request",response.status);
    return json(502,{ok:false,error:"TAX_AUTHORITY_TOKEN_REJECTED",status:response.status});
  }

  try{
    return json(200,{ok:true,tokens:sanitizeTokenResponse(parsed)});
  }catch{
    return json(502,{ok:false,error:"TAX_AUTHORITY_TOKEN_RESPONSE_INVALID"});
  }
});
