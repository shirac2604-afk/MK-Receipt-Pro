import {describe,expect,it} from "vitest";
import {TaxAuthorityApi2027Client,type TaxAuthorityHttpTransport,type TaxAuthorityOAuthTokenProvider} from "./TaxAuthorityApi2027Client";
import type {TaxAuthorityUploadFileDescriptor} from "./TaxAuthorityApi2027";

class QueueTransport implements TaxAuthorityHttpTransport {
  calls:Array<{input:string;init?:RequestInit}>=[];
  constructor(private readonly responses:Response[]){}
  async fetch(input:string,init?:RequestInit):Promise<Response>{
    this.calls.push({input,init});
    const next=this.responses.shift();
    if(!next)throw new Error("NO_TEST_RESPONSE");
    return next;
  }
}

const tokenProvider:TaxAuthorityOAuthTokenProvider={getAccessToken:async()=>"sandbox-token"};
const descriptor:TaxAuthorityUploadFileDescriptor={
  fileName:"fixture.pdf",
  signUrl:"https://storage.googleapis.com/example/init",
  fileUniqueId:"file-1",
  headers:{"x-goog-content-length-range":"0,1048576","x-goog-resumable":"start"},
};

describe("TaxAuthorityApi2027Client",()=>{
  it("requests upload links with OAuth bearer token",async()=>{
    const transport=new QueueTransport([new Response(JSON.stringify({success:true,data:{uniqueId:"u1",files:[]},error:null}),{status:200,headers:{"Content-Type":"application/json"}})]);
    const client=new TaxAuthorityApi2027Client({config:{environment:"sandbox",enabled:true},tokenProvider,transport});
    const result=await client.requestUploadLinks({caseNumber:39375365,startPeriod:"2026-01-01",endPeriod:"2026-12-31"});
    expect(result.success).toBe(true);
    expect(transport.calls[0]?.init?.method).toBe("POST");
    expect((transport.calls[0]?.init?.headers as Record<string,string>).Authorization).toBe("Bearer sandbox-token");
  });

  it("initiates resumable upload and uploads a sandbox PDF",async()=>{
    const transport=new QueueTransport([
      new Response(null,{status:201,headers:{location:"https://storage.googleapis.com/example/upload-session"}}),
      new Response(null,{status:200}),
    ]);
    const client=new TaxAuthorityApi2027Client({config:{environment:"sandbox",enabled:true},tokenProvider,transport});
    const bytes=new Uint8Array([1,2,3,4]);
    const result=await client.uploadFile(descriptor,{fileName:"fixture.pdf",contentType:"application/pdf",bytes});
    expect(result.bytesUploaded).toBe(4);
    expect(result.finalHttpStatus).toBe(200);
    expect(transport.calls[1]?.init?.method).toBe("PUT");
    expect((transport.calls[1]?.init?.headers as Record<string,string>)["Content-Range"]).toBe("bytes 0-3/4");
  });

  it("blocks INI/BKM payloads in sandbox while the published sandbox is PDF-only",async()=>{
    const transport=new QueueTransport([]);
    const client=new TaxAuthorityApi2027Client({config:{environment:"sandbox",enabled:true},tokenProvider,transport});
    await expect(client.uploadFile({...descriptor,fileName:"INI.TXT"},{fileName:"INI.TXT",contentType:"text/plain",bytes:new Uint8Array([1])})).rejects.toThrow("TAX_AUTHORITY_API_2027_SANDBOX_PDF_ONLY");
    expect(transport.calls).toHaveLength(0);
  });

  it("blocks production until production readiness is confirmed",async()=>{
    const client=new TaxAuthorityApi2027Client({config:{environment:"production",enabled:true},tokenProvider,transport:new QueueTransport([])});
    await expect(client.requestUploadLinks({caseNumber:39375365,startPeriod:"2027-01-01",endPeriod:"2027-01-31"})).rejects.toThrow("TAX_AUTHORITY_API_2027_PRODUCTION_NOT_CONFIRMED");
  });

  it("gets statuses using fileUniqueId values as fileName",async()=>{
    const transport=new QueueTransport([new Response(JSON.stringify([{fileName:"file-1",status:"Approved",description:"",uploadedDate:"2026-08-30T10:00:00",updatedDate:"2026-08-30T10:01:00",isFound:true,errorCode:null,errorMessage:null}]),{status:200,headers:{"Content-Type":"application/json"}})]);
    const client=new TaxAuthorityApi2027Client({config:{environment:"sandbox",enabled:true},tokenProvider,transport});
    const statuses=await client.getFileStatuses([{fileName:"file-1"}]);
    expect(statuses[0]?.status).toBe("Approved");
  });
});
