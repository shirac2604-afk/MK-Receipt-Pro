import {describe,expect,it} from "vitest";
import {TaxAuthority2027PreparationService,type TaxAuthority2027ApiPort,type TaxAuthority2027PersistencePort} from "./TaxAuthority2027PreparationService";

class MemoryPersistence implements TaxAuthority2027PersistencePort {
  created:any[]=[];
  updated:any[]=[];
  create(input:any){this.created.push(input);return input;}
  updateStatus(input:any){this.updated.push(input);return input;}
}

function api(overrides:Partial<TaxAuthority2027ApiPort>={}):TaxAuthority2027ApiPort {
  return {
    requestUploadLinks:async()=>({
      success:true,
      data:{
        uniqueId:"tx-1",
        files:[
          {fileName:"INI.TXT",signUrl:"https://storage/init-ini",fileUniqueId:"ini-1",headers:{"x-goog-content-length-range":"0,1048576","x-goog-resumable":"start"}},
          {fileName:"BKMVDATA.TXT",signUrl:"https://storage/init-bkm",fileUniqueId:"bkm-1",headers:{"x-goog-content-length-range":"0,1048576","x-goog-resumable":"start"}},
        ],
      },
      error:null,
    }),
    uploadFile:async descriptor=>({fileUniqueId:descriptor.fileUniqueId,uploadUrl:"https://storage/session",bytesUploaded:4,finalHttpStatus:200}),
    getFileStatuses:async items=>items.map(item=>({fileName:item.fileName,status:"Approved",description:"",uploadedDate:"2027-01-01T10:00:00.000Z",updatedDate:"2027-01-01T10:05:00.000Z",isFound:true,errorCode:null,errorMessage:null})),
    ...overrides,
  };
}

describe("TaxAuthority2027PreparationService",()=>{
  it("persists descriptors without credentials or signed URLs",async()=>{
    const persistence=new MemoryPersistence();
    const service=new TaxAuthority2027PreparationService({environment:"sandbox",api:api(),persistence,createId:(()=>{let n=0;return()=>`id-${++n}`})()});
    const result=await service.prepare({caseNumber:39375365,startPeriod:"2027-01-01",endPeriod:"2027-01-31"});
    expect(result.files).toHaveLength(2);
    expect(persistence.created.map(row=>row.fileKind)).toEqual(["INI","BKM"]);
    expect(JSON.stringify(persistence.created)).not.toContain("signUrl");
    expect(JSON.stringify(persistence.created)).not.toContain("access_token");
  });

  it("marks a successful upload as Uploaded",async()=>{
    const persistence=new MemoryPersistence();
    const service=new TaxAuthority2027PreparationService({environment:"production",api:api(),persistence,now:()=>new Date("2027-01-01T11:00:00.000Z")});
    const descriptor={fileName:"INI.TXT",signUrl:"https://storage/init",fileUniqueId:"ini-1",headers:{"x-goog-content-length-range":"0,1048576","x-goog-resumable":"start"} as const};
    await service.upload(descriptor,{fileName:"INI.TXT",bytes:new Uint8Array([1,2,3,4]),contentType:"text/plain"});
    expect(persistence.updated.at(-1)?.status).toBe("Uploaded");
  });

  it("records an upload error and rethrows it",async()=>{
    const persistence=new MemoryPersistence();
    const service=new TaxAuthority2027PreparationService({environment:"sandbox",api:api({uploadFile:async()=>{throw new Error("sandbox blocked")}}),persistence,now:()=>new Date("2027-01-01T11:00:00.000Z")});
    const descriptor={fileName:"INI.TXT",signUrl:"https://storage/init",fileUniqueId:"ini-1",headers:{"x-goog-content-length-range":"0,1048576","x-goog-resumable":"start"} as const};
    await expect(service.upload(descriptor,{fileName:"INI.TXT",bytes:new Uint8Array([1])})).rejects.toThrow("sandbox blocked");
    expect(persistence.updated.at(-1)?.status).toBe("Error");
  });

  it("refreshes status using fileUniqueId and persists Approved",async()=>{
    const persistence=new MemoryPersistence();
    const service=new TaxAuthority2027PreparationService({environment:"sandbox",api:api(),persistence});
    const statuses=await service.refreshStatuses(["ini-1","ini-1","bkm-1"]);
    expect(statuses).toHaveLength(2);
    expect(persistence.updated.map(row=>row.status)).toEqual(["Approved","Approved"]);
  });
});
