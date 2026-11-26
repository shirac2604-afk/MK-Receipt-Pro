import type { DatabaseConnection } from "../DatabaseConnection";

export type TaxTransmissionEnvironment="sandbox"|"production";
export type TaxTransmissionFileKind="INI"|"BKM"|"OTHER";
export type TaxTransmissionStatus="Pending"|"Uploaded"|"Approved"|"Rejected"|"Error";

export interface TaxTransmissionRecord {
  id:string;
  environment:TaxTransmissionEnvironment;
  caseNumber:string;
  startPeriod:string;
  endPeriod:string;
  transmissionUniqueId:string|null;
  fileUniqueId:string;
  fileName:string;
  fileKind:TaxTransmissionFileKind;
  status:TaxTransmissionStatus;
  description:string;
  errorCode:number|null;
  errorMessage:string|null;
  uploadedAt:string|null;
  statusUpdatedAt:string|null;
  createdAt:string;
  updatedAt:string;
}

interface TaxTransmissionRow {
  id:string; environment:TaxTransmissionEnvironment; case_number:string; start_period:string; end_period:string;
  transmission_unique_id:string|null; file_unique_id:string; file_name:string; file_kind:TaxTransmissionFileKind;
  status:TaxTransmissionStatus; description:string; error_code:number|null; error_message:string|null;
  uploaded_at:string|null; status_updated_at:string|null; created_at:string; updated_at:string;
}

export interface CreateTaxTransmissionInput {
  id:string;
  environment:TaxTransmissionEnvironment;
  caseNumber:string;
  startPeriod:string;
  endPeriod:string;
  transmissionUniqueId?:string|null;
  fileUniqueId:string;
  fileName:string;
  fileKind:TaxTransmissionFileKind;
}

export interface UpdateTaxTransmissionStatusInput {
  fileUniqueId:string;
  status:TaxTransmissionStatus;
  description?:string;
  errorCode?:number|null;
  errorMessage?:string|null;
  uploadedAt?:string|null;
  statusUpdatedAt?:string|null;
}

function mapRow(row:TaxTransmissionRow):TaxTransmissionRecord {
  return {
    id:row.id,environment:row.environment,caseNumber:row.case_number,startPeriod:row.start_period,endPeriod:row.end_period,
    transmissionUniqueId:row.transmission_unique_id,fileUniqueId:row.file_unique_id,fileName:row.file_name,fileKind:row.file_kind,
    status:row.status,description:row.description,errorCode:row.error_code,errorMessage:row.error_message,
    uploadedAt:row.uploaded_at,statusUpdatedAt:row.status_updated_at,createdAt:row.created_at,updatedAt:row.updated_at,
  };
}

export class TaxAuthorityTransmissionRepository {
  constructor(private readonly connection:DatabaseConnection){}

  create(input:CreateTaxTransmissionInput):TaxTransmissionRecord {
    const now=new Date().toISOString();
    this.connection.prepare(`
      INSERT INTO tax_authority_transmissions(
        id,environment,case_number,start_period,end_period,transmission_unique_id,file_unique_id,file_name,file_kind,status,
        description,error_code,error_message,uploaded_at,status_updated_at,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,'Pending','',NULL,NULL,NULL,NULL,?,?)
      ON CONFLICT(file_unique_id) DO UPDATE SET
        transmission_unique_id=excluded.transmission_unique_id,
        file_name=excluded.file_name,
        file_kind=excluded.file_kind,
        updated_at=excluded.updated_at
    `).run(
      input.id,input.environment,input.caseNumber,input.startPeriod,input.endPeriod,input.transmissionUniqueId??null,
      input.fileUniqueId,input.fileName,input.fileKind,now,now
    );
    const result=this.findByFileUniqueId(input.fileUniqueId);
    if(!result)throw new Error("TAX_TRANSMISSION_CREATE_FAILED");
    return result;
  }

  updateStatus(input:UpdateTaxTransmissionStatusInput):TaxTransmissionRecord {
    const existing=this.findByFileUniqueId(input.fileUniqueId);
    if(!existing)throw new Error("TAX_TRANSMISSION_NOT_FOUND");
    const now=new Date().toISOString();
    this.connection.prepare(`
      UPDATE tax_authority_transmissions
      SET status=?,description=?,error_code=?,error_message=?,uploaded_at=?,status_updated_at=?,updated_at=?
      WHERE file_unique_id=?
    `).run(
      input.status,input.description??existing.description,input.errorCode??null,input.errorMessage??null,
      input.uploadedAt??existing.uploadedAt,input.statusUpdatedAt??now,now,input.fileUniqueId
    );
    const result=this.findByFileUniqueId(input.fileUniqueId);
    if(!result)throw new Error("TAX_TRANSMISSION_UPDATE_FAILED");
    return result;
  }

  findByFileUniqueId(fileUniqueId:string):TaxTransmissionRecord|null {
    const row=this.connection.prepare(`SELECT * FROM tax_authority_transmissions WHERE file_unique_id=?`).get(fileUniqueId) as unknown as TaxTransmissionRow|undefined;
    return row?mapRow(row):null;
  }

  listRecent(limit=50):TaxTransmissionRecord[] {
    const safeLimit=Math.max(1,Math.min(200,Math.trunc(limit)));
    const rows=this.connection.prepare(`SELECT * FROM tax_authority_transmissions ORDER BY updated_at DESC LIMIT ?`).all(safeLimit) as unknown as TaxTransmissionRow[];
    return rows.map(mapRow);
  }
}
