import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const app=JSON.parse(read("app.json"));
const eas=JSON.parse(read("eas.json"));
const receipts=read("src/screens/ReceiptsScreen.tsx");
const receiptRepo=read("src/data/supabase/ReceiptRepository.ts");
const liveRepo=read("src/data/supabase/LiveDataRepository.ts");
const cancelSql=read("cloud/sql/007_final_parity_cancel.sql");
const issueSql=read("cloud/sql/004_receipt_issuance.sql");
const errors=read("src/services/ErrorFormatter.ts");
const nav=read("src/navigation/AppNavigator.tsx");
const pdfFlow=read("src/services/ReceiptDocumentWorkflow.ts");
const pdfSvc=read("src/services/ReceiptPdfService.ts");
const checks=[
 [pkg.version==="1.0.4","production release version"],
 [pkg.dependencies["react-native"]==="0.81.5","Expo 54 React Native compatibility"],
 [app.expo.android?.package==="il.mkreceiptpro.android","stable Android package id"],
 [eas.build?.["production-apk"]?.android?.buildType==="apk","standalone APK profile"],
 [eas.build?.production?.android?.buildType==="app-bundle","Play Store AAB profile"],
 [receipts.includes("issueLock=useRef(false)")&&receipts.includes("cancelLock=useRef(false)"),"double-action locks"],
 [receipts.includes("items.filter(Boolean)")&&receipts.includes("result.receipt?.id"),"undefined receipt guard"],
 [receiptRepo.includes('rpc("cancel_receipt_cloud"'),"shared cloud cancellation"],
 [cancelSql.includes("where r.id = p_receipt_id")&&cancelSql.includes("for update"),"qualified atomic cancellation SQL"],
 [issueSql.includes("where r.id=p_reservation_id")||issueSql.includes("where r.id = p_reservation_id"),"qualified receipt issuance SQL"],
 [liveRepo.includes("attachment_storage_key")&&!liveRepo.includes("attachment_path"),"correct expense attachment schema"],
 [pdfFlow.includes("setPdfStorageKey")&&pdfSvc.includes("createSignedUrl"),"PDF cloud persistence/opening"],
 [errors.includes("אין חיבור פעיל לענן")&&errors.includes("בדוק את החיבור לאינטרנט"),"friendly offline/network errors"],
 [nav.includes("useSafeAreaInsets")&&nav.includes("paddingBottom:bottomSpace"),"safe bottom navigation"],
 [pkg.scripts["release:check"]?.includes("verify:production-regression-audit"),"release check uses regression audit"]
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Android production regression audit: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
