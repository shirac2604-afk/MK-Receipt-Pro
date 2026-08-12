import {Linking} from "react-native";
import type {Receipt} from "../domain/types";
import {getBusinessProfile} from "../data/supabase/BusinessRepository";
import {ReceiptRepository} from "../data/supabase/ReceiptRepository";
import {createReceiptPdf,uploadReceiptPdf,shareReceiptPdf,signedReceiptPdfUrl} from "./ReceiptPdfService";
import {formatUnknownError} from "./ErrorFormatter";
import {assertTrustedSupabaseSignedUrl} from "../security/TrustedExternalUrl";

export type ReceiptDocumentProgress="loading_business"|"creating_pdf"|"uploading_pdf"|"saving_pdf_key"|"sharing_pdf"|"opening_pdf";

export async function createStoreAndOptionallyShareReceiptPdf(args:{businessId:string;receipt:Receipt;repository:ReceiptRepository;share?:boolean;onProgress?:(stage:ReceiptDocumentProgress)=>void;}){
 const {businessId,receipt,repository,share=true,onProgress}=args;
 try{
  onProgress?.("loading_business");
  const business=await getBusinessProfile(businessId);
  onProgress?.("creating_pdf");
  const pdf=await createReceiptPdf(receipt,business);
  if(!pdf.base64)throw new Error("PDF_BASE64_MISSING");
  onProgress?.("uploading_pdf");
  const storageKey=await uploadReceiptPdf(businessId,receipt,pdf.base64);
  onProgress?.("saving_pdf_key");
  const updated=await repository.setPdfStorageKey(receipt.id,storageKey);
  if(share){onProgress?.("sharing_pdf");try{await shareReceiptPdf(pdf.uri)}catch{}}
  return {receipt:updated,storageKey,fileUri:pdf.uri};
 }catch(error){throw new Error(`PDF_WORKFLOW_FAILED\n${formatUnknownError(error)}`);}
}

export async function openStoredReceiptPdf(storageKey:string,onProgress?:(stage:ReceiptDocumentProgress)=>void){
 try{
  onProgress?.("opening_pdf");
  const url=await signedReceiptPdfUrl(storageKey);
  const trustedUrl=assertTrustedSupabaseSignedUrl(url);
  const supported=await Linking.canOpenURL(trustedUrl);
  if(!supported)throw new Error("PDF_URL_NOT_SUPPORTED");
  await Linking.openURL(trustedUrl);
 }catch(error){throw new Error(`PDF_OPEN_FAILED\n${formatUnknownError(error)}`);}
}
