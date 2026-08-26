import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";

const MIN_PASSWORD_LENGTH=8;
const MAX_PASSWORD_LENGTH=128;

function resultError(result:unknown):string{
  if(typeof result==="object"&&result!==null&&"success" in result&&result.success===false&&"error" in result){
    const error=(result as {error?:{message?:string}}).error;
    return error?.message||"לא ניתן להשלים את הפעולה.";
  }
  return "לא ניתן להשלים את הפעולה.";
}

function RecoveryPanel(){
  const [active,setActive]=useState(false);
  const [open,setOpen]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let disposed=false;
    let timer:number|undefined;
    const poll=async()=>{
      try{
        const result=await window.mkApi.cloudAccount.getPasswordRecoveryStatus();
        if(!disposed&&result.success){
          setActive(result.data);
          if(result.data)setOpen(true);
        }
      }finally{
        if(!disposed)timer=window.setTimeout(()=>void poll(),750);
      }
    };
    void poll();
    return()=>{disposed=true;if(timer!==undefined)window.clearTimeout(timer)};
  },[]);

  async function requestReset(){
    if(!email.trim()){
      setMessage("יש להזין כתובת אימייל.");
      return;
    }
    setBusy(true);setMessage("");
    try{
      const result=await window.mkApi.cloudAccount.requestPasswordRecovery({email:email.trim().toLowerCase()});
      if(!result.success)throw new Error(resultError(result));
      setSent(true);
      setMessage("אם קיימת כתובת חשבון תואמת, נשלח אליה קישור מאובטח לשינוי הסיסמה.");
    }catch{
      setMessage("לא ניתן להתחיל כרגע את תהליך השחזור. יש לנסות שוב מאוחר יותר.");
    }finally{setBusy(false)}
  }

  async function completeReset(){
    if(password.length<MIN_PASSWORD_LENGTH||password.length>MAX_PASSWORD_LENGTH){
      setMessage(`הסיסמה החדשה חייבת להכיל ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} תווים.`);
      return;
    }
    if(password!==confirmation){
      setMessage("הסיסמאות אינן תואמות.");
      return;
    }
    setBusy(true);setMessage("");
    try{
      const result=await window.mkApi.cloudAccount.completePasswordRecovery({newPassword:password});
      if(!result.success)throw new Error(resultError(result));
      setActive(false);setOpen(false);setPassword("");setConfirmation("");setMessage("הסיסמה עודכנה וכל ההתחברויות נותקו. אפשר להתחבר מחדש.");
    }catch{
      setMessage("לא ניתן לעדכן את הסיסמה. יש לבקש קישור חדש ולנסות שוב.");
    }finally{setBusy(false)}
  }

  return <>
    {!active&&<button type="button" onClick={()=>{setOpen(v=>!v);setMessage("")}} style={{position:"fixed",left:24,bottom:24,zIndex:9999,border:0,borderRadius:14,padding:"10px 16px",background:"#4F46E5",color:"#fff",fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(0,0,0,.16)"}}>שכחתי סיסמה</button>}
    {open&&<div dir="rtl" style={{position:"fixed",left:24,bottom:72,width:360,maxWidth:"calc(100vw - 48px)",zIndex:10000,background:"#fff",border:"1px solid #d9dee8",borderRadius:18,padding:18,boxShadow:"0 18px 50px rgba(0,0,0,.2)",fontFamily:"inherit"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <strong style={{fontSize:18}}>שחזור סיסמה</strong>
        <button type="button" onClick={()=>setOpen(false)} style={{border:0,background:"transparent",fontSize:20,cursor:"pointer"}} aria-label="סגירה">×</button>
      </div>
      {active?<div style={{display:"grid",gap:10,marginTop:14}}>
        <p style={{margin:0,color:"#475569",lineHeight:1.5}}>קישור השחזור אומת. בחרי סיסמה חדשה. אין להזין קוד שחזור באפליקציה.</p>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value.slice(0,MAX_PASSWORD_LENGTH))} autoComplete="new-password" maxLength={MAX_PASSWORD_LENGTH} placeholder="סיסמה חדשה" style={{padding:11,borderRadius:10,border:"1px solid #cbd5e1"}} />
        <input type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value.slice(0,MAX_PASSWORD_LENGTH))} autoComplete="new-password" maxLength={MAX_PASSWORD_LENGTH} placeholder="אימות הסיסמה" style={{padding:11,borderRadius:10,border:"1px solid #cbd5e1"}} />
        <button type="button" disabled={busy} onClick={()=>void completeReset()} style={{padding:11,border:0,borderRadius:10,background:"#4F46E5",color:"#fff",fontWeight:800,cursor:"pointer"}}>{busy?"מעדכן…":"עדכון סיסמה"}</button>
      </div>:<div style={{display:"grid",gap:10,marginTop:14}}>
        <p style={{margin:0,color:"#475569",lineHeight:1.5}}>הזיני את כתובת האימייל של החשבון ושלחי בקשת שחזור. לא נחשוף האם החשבון קיים.</p>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value.slice(0,254))} autoComplete="email" placeholder="אימייל" style={{padding:11,borderRadius:10,border:"1px solid #cbd5e1"}} />
        <button type="button" disabled={busy} onClick={()=>void requestReset()} style={{padding:11,border:0,borderRadius:10,background:"#4F46E5",color:"#fff",fontWeight:800,cursor:"pointer"}}>{busy?"שולח קישור…":sent?"שליחת קישור מחדש":"שליחת קישור לשחזור"}</button>
      </div>}
      {message&&<p style={{margin:"12px 0 0",color:"#475569",lineHeight:1.5}}>{message}</p>}
    </div>}
  </>;
}

const host=document.createElement("div");
host.id="password-recovery-root";
document.body.appendChild(host);
createRoot(host).render(<RecoveryPanel/>);
