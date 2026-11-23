import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
vi.mock('electron',()=>({safeStorage:{}}));
import {SupabaseCloudService} from '../apps/desktop/electron/main/SupabaseCloudService';

const receipt=(id:number,date='2026-08-01',status='active')=>({id:String(id),business_id:'business',receipt_number:id,payment_date:date,status,client_name:'Test',description:'Test',amount_agorot:100,payment_method:'cash'});
async function fixture(rows:any[],expenses:any[],run:(service:SupabaseCloudService,root:string,calls:any[])=>Promise<void>,failure=false,downloadFailure=false){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cloud-export-test-'));const calls:any[]=[];
 const service=Object.create(SupabaseCloudService.prototype) as any;
 service.userDataPath=root;service.status={connected:true,businessId:'business'};service.assertCurrentDeviceActive=async()=>{};
 service.client={from:(table:string)=>{const call:any={table};calls.push(call);const q:any={select:()=>q,eq:(k:string,v:string)=>{call[k]=v;return q;},order:()=>q,range:(a:number,b:number)=>{call.a=a;call.b=b;return q;},gte:(_k:string,v:string)=>{call.from=v;return q;},lte:(_k:string,v:string)=>{call.to=v;return q;},then:(resolve:any)=>{const data=(table==='receipts'?rows:expenses).filter(r=>{const d=r.payment_date??r.expense_date;return (!call.from||d>=call.from)&&(!call.to||d<=call.to);}).slice(call.a,call.b+1);return Promise.resolve(failure?{error:{message:'offline'}}:{data,error:null}).then(resolve);}};return q;},storage:{from:()=>({download:async()=>downloadFailure?{error:{message:'denied'}}:{data:new Blob(['%PDF-test']),error:null}})}};
 try{await run(service,root,calls);}finally{fs.rmSync(root,{recursive:true,force:true});}
}
const filters={fromDate:'2026-01-01',toDate:'2026-12-31'};
describe('cloud report export',()=>{
 it('exports all pages, excludes cancelled income, filters year and includes expenses',async()=>fixture([...Array.from({length:1001},(_,i)=>receipt(i)),receipt(2000,'2026-09-01','cancelled'),receipt(3000,'2025-01-01')],[{id:'expense',expense_date:'2026-08-01',amount_agorot:26000,supplier_name:'Test',category:'Test'}],async(s,root,calls)=>{
  const output=await s.exportCloudReport(filters,root,2026);const summary=JSON.parse(fs.readFileSync(path.join(output,'02-מס-הכנסה-דיווח-שנתי','סיכומים','סיכום-שנתי-2026.json'),'utf8'));
  expect(summary).toMatchObject({incomeAgorot:100100,expenseAgorot:26000,netAgorot:74100,activeReceiptCount:1001,cancelledReceiptCount:1,expenseCount:1,missingDocumentCount:1004});
  expect(calls.every(c=>c.business_id==='business')).toBe(true);expect(calls.filter(c=>c.table==='receipts').length).toBe(4);
 }));
 it('exports only requested two-month period to CSV',async()=>fixture([receipt(1,'2026-06-30'),receipt(2,'2026-07-01'),receipt(3,'2026-08-31'),receipt(4,'2026-09-01')],[],async(s,root)=>{const file=path.join(root,'period.csv');await s.exportCloudReport({fromDate:'2026-07-01',toDate:'2026-08-31'},file);const csv=fs.readFileSync(file,'utf8');expect(csv).toContain('2026-07-01');expect(csv).toContain('2026-08-31');expect(csv).not.toContain('2026-06-30');expect(csv).not.toContain('2026-09-01');}));
 it('does not replace an existing export when data fetch fails',async()=>fixture([],[],async(s,root)=>{const file=path.join(root,'existing.csv');fs.writeFileSync(file,'original');await expect(s.exportCloudReport(filters,file)).rejects.toThrow('CLOUD_REPORT_EXPORT_FAILED');expect(fs.readFileSync(file,'utf8')).toBe('original');},true));
 it('aborts on document download failure and cleans temporary files',async()=>fixture([{...receipt(1),pdf_storage_key:'business/receipt/file.pdf'}],[],async(s,root)=>{await expect(s.exportCloudReport(filters,root,2026)).rejects.toThrow('REPORT_DOCUMENT_DOWNLOAD_FAILED');expect(fs.readdirSync(root)).toEqual([]);},false,true));
 it('rejects a document key from another business',async()=>fixture([{...receipt(1),pdf_storage_key:'other/receipt/file.pdf'}],[],async(s,root)=>{await expect(s.exportCloudReport(filters,root,2026)).rejects.toThrow('REPORT_DOCUMENT_BUSINESS_MISMATCH');expect(fs.readdirSync(root)).toEqual([]);}));
});
