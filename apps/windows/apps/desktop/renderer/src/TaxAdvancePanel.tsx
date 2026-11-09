import React,{useEffect,useState} from "react";
import type {DateRangeReport} from "../../../../packages/database/src/types";

const labels=["ינואר–פברואר","מרץ–אפריל","מאי–יוני","יולי–אוגוסט","ספטמבר–אוקטובר","נובמבר–דצמבר"];
const serviceUrl="https://www.gov.il/he/service/itc-payment-online-incometax";
const money=(agorot:number)=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS"}).format(agorot/100);
const month=(n:number)=>String(n).padStart(2,"0");
const dateInIsrael=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export function TaxAdvancePanel(){
 const [today,setToday]=useState(dateInIsrael);
 const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));
 const currentPeriod=Math.floor((m-1)/2);
 const [year,setYear]=useState(()=>currentPeriod===0?y-1:y);
 const [period,setPeriod]=useState(()=> (currentPeriod+5)%6);
 const [snapshot,setSnapshot]=useState<{key:string;businessId:string;report:DateRangeReport}|null>(null);
 const [error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [rate,setRate]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [filed,setFiled]=useState("");
 const [busy,setBusy]=useState(false);
 const endMonth=(period+1)*2;
 const fromDate=year+"-"+month(endMonth-1)+"-01";
 const toDate=year+"-"+month(endMonth)+"-"+new Date(Date.UTC(year,endMonth,0)).getUTCDate();
 const key=fromDate+":"+refresh;
 const loaded=snapshot?.key===key?snapshot:null;
 const scope=loaded?"mk-tax-advance:"+loaded.businessId+":":"";
 const closed=toDate<today;
 useEffect(()=>{const timer=setInterval(()=>setToday(dateInIsrael()),60_000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{
  let active=true;
  setError("");setSnapshot(null);setRate("");setConfirmation("");setFiled("");
  async function load(){
   try{
    const account=await window.mkApi.cloudAccount.getStatus();
    if(!account.success||!account.data.connected||!account.data.businessId)throw new Error("יש להתחבר לענן כדי להכין דיווח.");
    const businessId=account.data.businessId;
    const result=await window.mkApi.reports.getRange({fromDate,toDate});
    if(!result.success)throw new Error(result.error.message);
    const check=await window.mkApi.cloudAccount.getStatus();
    if(!check.success||!check.data.connected||check.data.businessId!==businessId)throw new Error("חשבון הענן השתנה. רענני את הנתונים.");
    if(active){
     const prefix="mk-tax-advance:"+businessId+":";
     setRate(localStorage.getItem(prefix+"rate:"+year)??"");
     setFiled(localStorage.getItem(prefix+fromDate)??"");
     setSnapshot({key,businessId,report:result.data});
    }
   }catch(e){if(active)setError(e instanceof Error?e.message:"טעינת נתוני התקופה נכשלה.");}
  }
  void load();
  return()=>{active=false};
 },[fromDate,toDate,key,year]);
 const normalized=rate.trim().replace(",",".");
 const validRate=/^\d{1,3}(\.\d{1,4})?$/.test(normalized)&&Number(normalized)<=100;
 async function exportDetails(){
  setBusy(true);setError("");
  try{const result=await window.mkApi.reports.exportCsv({fromDate,toDate});if(!result.success)throw new Error(result.error.message);}
  catch(e){setError(e instanceof Error?e.message:"ייצוא הפירוט נכשל.");}finally{setBusy(false);}
 }
 function recordFiling(){
  if(!scope||!closed||!confirmation.trim())return;
  try{localStorage.setItem(scope+fromDate,confirmation.trim());setFiled(confirmation.trim());setConfirmation("");}
  catch{setError("לא ניתן לשמור את מספר האישור במחשב.");}
 }
 return <section className="annual-summary-card report-table" aria-labelledby="tax-advance-heading">
  <h2 id="tax-advance-heading">מקדמות מס הכנסה — דיווח דו־חודשי</h2>
  <p>התוכנה מסכמת את הקבלות הפעילות בענן. לפני ההגשה בדקי שהמחזור כולל גם פעילות עסקית שלא נרשמה כאן.</p>
  <div className="report-filters">
   <label>שנת מס<select disabled={busy} value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:10},(_,i)=>y-i).map(value=><option key={value}>{value}</option>)}</select></label>
   <label>תקופה<select disabled={busy} value={period} onChange={e=>setPeriod(Number(e.target.value))}>{labels.map((label,i)=><option key={label} value={i}>{label}</option>)}</select></label>
   <label>שיעור מקדמה בתיק (%)<input disabled={!loaded} inputMode="decimal" maxLength={8} value={rate} onChange={e=>setRate(e.target.value)} onBlur={()=>{try{if(scope&&validRate)localStorage.setItem(scope+"rate:"+year,normalized);else if(scope&&!rate.trim())localStorage.removeItem(scope+"rate:"+year);}catch{setError("לא ניתן לשמור את שיעור המקדמה במחשב.");}}}/></label>
  </div>
  {error&&<p role="alert">{error}</p>}
  {!loaded&&!error&&<p role="status">טוענת נתוני תקופה מהענן…</p>}
  <button type="button" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>רענון נתונים</button>
  {loaded&&<>
   <p>מחזור לפי קבלות פעילות: <strong>{money(loaded.report.incomeAgorot)}</strong> · {loaded.report.activeReceiptCount} קבלות פעילות</p>
   {loaded.report.activeReceiptCount===0&&<p>לא נמצאו קבלות פעילות לתקופה. ודאי שלא הייתה פעילות מחוץ לתוכנה לפני דיווח אפס.</p>}
   <p>{validRate?"מקדמה משוערת לפי הנתונים בתוכנה: "+money(Math.round(loaded.report.incomeAgorot*Number(normalized)/100)):"להצגת אומדן, הזיני את השיעור שמופיע בתיק."}</p>
   <p role="status">{filed?"הוגש לפי האישור ששמרת: "+filed:closed?"התקופה הסתיימה ואין אישור שמור במחשב. בדקי את מועד הדיווח ואת מצב ההגשה באתר.":"התקופה עדיין פתוחה."}</p>
   <div className="report-actions"><button type="button" disabled={busy} onClick={()=>void exportDetails()}>ייצוא פירוט קבלות</button>{closed&&<a href={serviceUrl} target="_blank" rel="noopener noreferrer">פתיחת אתר רשות המסים להגשה עצמית</a>}</div>
   {closed&&<p><label>מספר אישור מרשות המסים <input maxLength={100} value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label>{" "}<button type="button" disabled={!confirmation.trim()} onClick={recordFiling}>שמירת אישור וסימון כהוגש</button></p>}
   <small>מספר האישור נשמר במחשב זה. שמרי גם עותק של האישור שהורדת מרשות המסים.</small>
  </>}
 </section>;
}
