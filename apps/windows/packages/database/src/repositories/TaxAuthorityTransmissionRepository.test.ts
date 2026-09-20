import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DatabaseConnection} from "../DatabaseConnection";
import {TaxAuthorityTransmissionRepository} from "./TaxAuthorityTransmissionRepository";

const tempRoots:string[]=[];
afterEach(()=>{for(const root of tempRoots.splice(0))fs.rmSync(root,{recursive:true,force:true});});

function createDb():DatabaseConnection {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"mk-tax-2027-"));
  tempRoots.push(root);
  const db=new DatabaseConnection(path.join(root,"test.sqlite"));
  db.migrate();
  return db;
}

describe("TaxAuthorityTransmissionRepository",()=>{
  it("stores identifiers and status without storing OAuth or signed upload URLs",()=>{
    const db=createDb();
    try {
      const repo=new TaxAuthorityTransmissionRepository(db);
      const created=repo.create({
        id:"tx-1",environment:"sandbox",caseNumber:"039375365",startPeriod:"2027-01-01",endPeriod:"2027-01-31",
        transmissionUniqueId:"set-1",fileUniqueId:"file-1",fileName:"INI_N2027.txt",fileKind:"INI",
      });
      expect(created.status).toBe("Pending");
      const updated=repo.updateStatus({fileUniqueId:"file-1",status:"Approved",description:"accepted",uploadedAt:"2027-02-01T08:00:00.000Z"});
      expect(updated.status).toBe("Approved");
      expect(repo.listRecent(10)).toHaveLength(1);
      const columns=db.prepare("PRAGMA table_info(tax_authority_transmissions)").all() as unknown as Array<{name:string}>;
      expect(columns.some(c=>/token|sign_url|upload_url/i.test(c.name))).toBe(false);
    } finally { db.close(); }
  });
});
