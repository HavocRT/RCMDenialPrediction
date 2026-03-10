import React, { useState } from "react";
import { predictClaim } from "./api";

const G = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%}
body{font-family:'DM Sans',sans-serif;background:#f5f0ea;color:#1c2b22;font-size:13.5px;-webkit-font-smoothing:antialiased;overflow:hidden}
input,select,button{font-family:'DM Sans',sans-serif}
:root{
  --forest:#173f26;--forest2:#235c38;--moss:#3d8b5e;--sage:#6ab187;
  --mint:#a8d5b5;--mintpal:#d0eadb;--cream:#f0ebe2;--parchment:#e8e2d8;
  --sand:#ddd6ca;--card:#faf7f3;--white:#ffffff;
  --ink:#1c2b22;--slate:#3d5247;--muted:#7a9982;
  --acc1:#c07030;--acc2:#4a82b8;--acc3:#8b4faa;--deny:#b83025;
  --r:0 0 0 3px rgba(35,92,56,.13);
  --sw:252px;--swc:60px;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.fu{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) both}
.sd{animation:slideIn .4s cubic-bezier(.22,1,.36,1) both}
.card{background:var(--card);border:1.5px solid #e4ddd4;border-radius:16px;padding:20px 22px;box-shadow:0 2px 18px rgba(20,50,30,.07)}
.inp{padding:9px 13px;border:1.5px solid #ddd6ca;border-radius:9px;background:var(--card);color:#1c2b22;font-size:13.5px;outline:none;width:100%;transition:border-color .18s,box-shadow .18s;font-family:'DM Sans',sans-serif}
.inp:focus{border-color:#235c38;box-shadow:var(--r)}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 11px;border:none;background:transparent;border-radius:10px;cursor:pointer;color:rgba(255,255,255,.45);font-size:13px;font-weight:500;width:100%;text-align:left;transition:all .18s;white-space:nowrap;overflow:hidden;border-left:3px solid transparent}
.nav-item:hover{background:rgba(168,213,181,.1);color:rgba(255,255,255,.8)}
.nav-item.active{background:rgba(168,213,181,.22);color:#a8d5b5;border-left-color:#78c498;font-weight:600}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--mint);border-radius:3px}
@media(max-width:640px){
  .sidebar{position:fixed!important;left:0;top:0;height:100vh;z-index:100;transform:translateX(-100%);transition:transform .3s ease!important}
  .sidebar.open{transform:translateX(0)!important}
  .overlay{display:block!important}
  .mob-btn{display:flex!important}
}
@media(max-width:900px){.fg2{grid-template-columns:1fr!important}.sg{grid-template-columns:1fr 1fr!important}.rg{grid-template-columns:1fr 1fr!important}}
@media(max-width:480px){.page-pad{padding:14px!important}.topbar{padding:0 14px!important}.hero{padding:18px 16px!important}.fcard{padding:16px!important}}
`;

const COMPANIES=["UnitedHealth Group","Aetna","Cigna","Humana","Blue Cross Blue Shield","Kaiser Permanente","Molina Healthcare","Oscar Health","Centene Corporation","Highmark Health"];
const SPECIALTIES=["Primary Care","Cardiology","Oncology","Surgery","Neurology","Psychiatry","Gastroenterology","Dermatology","Emergency Medicine","Orthopedics","Preventive","Obstetrics","Gynecology","Pulmonology","Endocrinology","Ophthalmology","Pediatrics","Sports Medicine"];
const CLAIM_TYPES=["Inpatient","Outpatient","Emergency","Preventive","Specialist","Mental Health","Pharmacy","Dental","Vision"];
const GENDERS=["Male","Female","Non-Binary"];
const MARITAL=["Single","Married","Divorced","Widowed","Domestic Partner"];
const EMPLOYMENT=["Full-Time","Part-Time","Self-Employed","Unemployed","Retired","Student"];
const SUBMISSION=["Electronic","Paper","Portal","Clearinghouse"];
const STATES=["CA","TX","NY","FL","IL","PA","OH","GA","NC","MI","NJ","VA","WA","AZ","MA","TN","IN","MO","MD","WI"];

const RS={
  "Low":     {bg:"#eaf6f0",c:"#1a5c34",bd:"#9ecfae",bar:"#3d8b5e",icon:"✓",glow:"rgba(61,139,94,.18)"},
  "Medium":  {bg:"#fef0e0",c:"#7a3c0a",bd:"#f0bc7a",bar:"#c07030",icon:"⚠",glow:"rgba(192,112,48,.18)"},
  "High":    {bg:"#fde6e4",c:"#8f1e14",bd:"#f0a09a",bar:"#d83828",icon:"✗",glow:"rgba(216,56,40,.18)"},
  "Critical":{bg:"#f3e6f8",c:"#541d72",bd:"#c898e0",bar:"#8b4faa",icon:"🚨",glow:"rgba(139,79,170,.18)"},
};
const SEV={
  "High":  {bg:"#fde6e4",c:"#8f1e14",bd:"#f0a09a"},
  "Medium":{bg:"#fef0e0",c:"#7a3c0a",bd:"#f0bc7a"},
  "Low":   {bg:"#eaf6f0",c:"#1a5c34",bd:"#8ecfb0"},
};
const HB={
  "Low":     {bg:"#eaf6f0",c:"#1a5c34",bd:"#9ecfae"},
  "Medium":  {bg:"#fef0e0",c:"#7a3c0a",bd:"#f0bc7a"},
  "High":    {bg:"#fde6e4",c:"#8f1e14",bd:"#f0a09a"},
  "Critical":{bg:"#f3e6f8",c:"#541d72",bd:"#c898e0"},
};

function RiskBadge({level}){
  const s=HB[level]||HB["Medium"];
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 11px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,color:s.c,border:`1.5px solid ${s.bd}`,whiteSpace:"nowrap",letterSpacing:".02em"}}>{level||"—"}</span>;
}

function FInp({style={},...p}){
  const[f,sF]=useState(false);
  return <input {...p} className="inp" style={{...style,borderColor:f?"#235c38":"#ddd6ca",boxShadow:f?"var(--r)":"none"}} onFocus={()=>sF(true)} onBlur={()=>sF(false)}/>;
}
function FSel({children,style={},...p}){
  const[f,sF]=useState(false);
  return(
    <div style={{position:"relative",width:"100%"}}>
      <select {...p} className="inp" style={{...style,paddingRight:32,appearance:"none",WebkitAppearance:"none",cursor:"pointer",borderColor:f?"#235c38":"#ddd6ca",boxShadow:f?"var(--r)":"none"}} onFocus={()=>sF(true)} onBlur={()=>sF(false)}>{children}</select>
      <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a9982" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}
function FG({label,children,col=1}){
  return(
    <div style={{gridColumn:`span ${col}`,display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:10,fontWeight:700,color:"#3d5247",textTransform:"uppercase",letterSpacing:".09em"}}>{label}</label>
      {children}
    </div>
  );
}
function SecLbl({color="#3d8b5e",children}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9,margin:"22px 0 14px"}}>
      <div style={{width:3,height:15,background:color,borderRadius:2}}/>
      <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color}}>{children}</span>
      <div style={{flex:1,height:1,background:"#e4ddd4"}}/>
    </div>
  );
}

// ────────────────────────────── ENTRY PAGE
const EMPTY={company:"",age:"",gender:"",marital:"",employment:"",income:"",claimAmount:"",claimDate:"",diagCode:"",procCode:"",specialty:"",claimType:"",location:"",submission:""};

function EntryPage({onSubmit}){
  const[form,setForm]=useState(EMPTY);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[confirmClear,setConfirmClear]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const predict=async()=>{
    const missing=[];
    if(!form.company)missing.push("Insurance Company");
    if(!form.age)missing.push("Patient Age");
    if(!form.gender)missing.push("Gender");
    if(!form.marital)missing.push("Marital Status");
    if(!form.employment)missing.push("Employment Status");
    if(!form.income)missing.push("Annual Income");
    if(!form.claimAmount)missing.push("Claim Amount");
    if(!form.claimDate)missing.push("Claim Date");
    if(!form.claimType)missing.push("Claim Type");
    if(!form.diagCode)missing.push("Diagnosis Code");
    if(!form.procCode)missing.push("Procedure Code");
    if(!form.specialty)missing.push("Provider Specialty");
    if(!form.location)missing.push("Provider State");
    if(!form.submission)missing.push("Submission Method");
    if(missing.length){alert("Please fill in:\n• "+missing.join("\n• "));return;}
    setLoading(true);setResult(null);
    try{
      const data=await predictClaim(form);
      const entry={
        id:"CLM"+String(Math.floor(Math.random()*90000)+10000),
        company:form.company,age:parseInt(form.age)||0,employment:form.employment,
        income:parseInt(form.income)||0,claimAmount:parseFloat(form.claimAmount)||0,
        claimType:form.claimType,date:new Date().toISOString().split("T")[0],
        marital:form.marital,gender:form.gender,specialty:form.specialty,
        diagCode:form.diagCode,procCode:form.procCode,location:form.location,
        riskScore:Math.round(data.risk_score??0),riskLevel:data.risk_level??"Unknown",
        suggestions:data.prevention_suggestions??[],
        projectedRisk:data.projected_risk_if_fixed??null,
        topFeatures:data.top_risk_features??[],
      };
      setResult(entry);onSubmit(entry);
      setTimeout(()=>document.getElementById("ra")?.scrollIntoView({behavior:"smooth"}),100);
    }catch(err){
      alert("Prediction failed: "+err.message+"\n\nMake sure backend is running:\ncd ml/backend && uvicorn main:app --reload --port 8000");
    }finally{setLoading(false);}
  };

  return(
    <div className="fu" style={{width:"100%",maxWidth:800,margin:"0 auto"}}>

      {/* Confirm clear modal */}
      {confirmClear&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"var(--card)",borderRadius:18,padding:"28px 32px",maxWidth:360,width:"90%",boxShadow:"0 24px 64px rgba(0,0,0,.22)",border:"1.5px solid #e4ddd4"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:"#1c2b22",marginBottom:8}}>Clear this form?</div>
            <div style={{fontSize:13,color:"#7a9982",lineHeight:1.65,marginBottom:22}}>All current data and results will be removed. This cannot be undone.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmClear(false)} style={{padding:"8px 20px",border:"1.5px solid #ddd6ca",borderRadius:9,background:"transparent",cursor:"pointer",fontSize:13,color:"#3d5247",fontWeight:500}}>Cancel</button>
              <button onClick={()=>{setForm(EMPTY);setResult(null);setConfirmClear(false);}} style={{padding:"8px 20px",border:"none",borderRadius:9,background:"#b83025",cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="hero" style={{background:"linear-gradient(135deg,#1a5c34 0%,#236e42 40%,#2e8a54 100%)",borderRadius:18,padding:"24px 28px",marginBottom:20,position:"relative",overflow:"hidden",boxShadow:"0 8px 36px rgba(14,44,26,.35)"}}>
        <div style={{position:"absolute",top:-60,right:-40,width:240,height:240,borderRadius:"50%",background:"rgba(255,255,255,.025)"}}/>
        <div style={{position:"absolute",bottom:-80,right:60,width:200,height:200,borderRadius:"50%",background:"rgba(168,213,181,.05)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse at 85% 40%,rgba(106,177,135,.1) 0%,transparent 55%)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#3effa0",boxShadow:"0 0 10px #5dffa0",animation:"pulse 2s ease infinite"}}/>
            <span style={{color:"rgba(255,255,255,.45)",fontSize:10,textTransform:"uppercase",letterSpacing:".13em",fontWeight:700}}>New Claim Submission</span>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(19px,4vw,27px)",color:"#fff",fontWeight:600,marginBottom:7,lineHeight:1.2}}>Insurance Denial Predictor</h2>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:"clamp(11px,2vw,13px)",lineHeight:1.65}}>Complete all fields below — every data point improves prediction accuracy</p>
        </div>
      </div>

      {/* Form */}
      <div className="fcard card">

        <SecLbl>Company & Provider</SecLbl>
        <div className="fg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FG label="Insurance Company ★">
            <FSel value={form.company} onChange={set("company")}><option value="">Select company…</option>{COMPANIES.map(c=><option key={c}>{c}</option>)}</FSel>
          </FG>
          <FG label="Provider Specialty ★">
            <FSel value={form.specialty} onChange={set("specialty")}><option value="">Select specialty…</option>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</FSel>
          </FG>
          <FG label="Provider State ★">
            <FSel value={form.location} onChange={set("location")}><option value="">Select state…</option>{STATES.map(s=><option key={s}>{s}</option>)}</FSel>
          </FG>
          <FG label="Submission Method ★">
            <FSel value={form.submission} onChange={set("submission")}><option value="">Select method…</option>{SUBMISSION.map(s=><option key={s}>{s}</option>)}</FSel>
          </FG>
        </div>

        <SecLbl color="#4a82b8">Patient Information</SecLbl>
        <div className="fg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FG label="Patient Age ★"><FInp type="number" placeholder="e.g. 45" value={form.age} onChange={set("age")}/></FG>
          <FG label="Gender ★">
            <FSel value={form.gender} onChange={set("gender")}><option value="">Select gender…</option>{GENDERS.map(g=><option key={g}>{g}</option>)}</FSel>
          </FG>
          <FG label="Marital Status ★">
            <FSel value={form.marital} onChange={set("marital")}><option value="">Select status…</option>{MARITAL.map(m=><option key={m}>{m}</option>)}</FSel>
          </FG>
          <FG label="Employment Status ★">
            <FSel value={form.employment} onChange={set("employment")}><option value="">Select employment…</option>{EMPLOYMENT.map(e=><option key={e}>{e}</option>)}</FSel>
          </FG>
          <FG label="Annual Income ($) ★" col={2}>
            <FInp type="number" placeholder="e.g. 65000" value={form.income} onChange={set("income")}/>
          </FG>
        </div>

        <SecLbl color="#c07030">Claim Details</SecLbl>
        <div className="fg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FG label="Claim Amount ($) ★"><FInp type="number" placeholder="e.g. 12500" value={form.claimAmount} onChange={set("claimAmount")}/></FG>
          <FG label="Claim Date ★">
            <FInp type="date" value={form.claimDate} onChange={set("claimDate")} style={{colorScheme:"light",accentColor:"#173f26"}}/>
          </FG>
          <FG label="Claim Type ★">
            <FSel value={form.claimType} onChange={set("claimType")}><option value="">Select type…</option>{CLAIM_TYPES.map(c=><option key={c}>{c}</option>)}</FSel>
          </FG>
          <FG label="Diagnosis Code (ICD-10) ★"><FInp placeholder="e.g. I25.10" value={form.diagCode} onChange={set("diagCode")}/></FG>
          <FG label="Procedure Code (CPT) ★" col={2}><FInp placeholder="e.g. 70553" value={form.procCode} onChange={set("procCode")}/></FG>
        </div>

        {/* Actions */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,paddingTop:18,borderTop:"1px solid #e4ddd4",gap:10}}>
          <button onClick={()=>result?setConfirmClear(true):(setForm(EMPTY))}
            style={{padding:"9px 22px",background:"transparent",color:"#3d5247",border:"1.5px solid #ddd6ca",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:500}}>
            Clear
          </button>
          <button onClick={predict} disabled={loading}
            style={{padding:"12px 34px",background:loading?"#2d7a4a":"linear-gradient(135deg,#1a5c34,#2d7a4a)",color:"#fff",border:"none",borderRadius:9,cursor:loading?"not-allowed":"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:9,boxShadow:"0 5px 20px rgba(23,63,38,.38)",letterSpacing:".01em"}}>
            {loading
              ?<><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{animation:"spin .8s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Analyzing…</>
              :<><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>Run Prediction</>
            }
          </button>
        </div>
      </div>

      {/* Loading */}
      <div id="ra"/>
      {loading&&(
        <div style={{marginTop:18,background:"var(--card)",border:"1.5px solid #e4ddd4",borderRadius:16,padding:"26px 24px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 2px 16px rgba(20,50,30,.06)"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:"#eaf6f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a5c34" strokeWidth="2.2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
          <div>
            <div style={{fontWeight:600,color:"#173f26",marginBottom:3,fontSize:14}}>Analyzing claim…</div>
            <div style={{fontSize:12,color:"#7a9982"}}>Scoring denial risk · Generating recommendations</div>
          </div>
        </div>
      )}

      {/* Results */}
      {result&&!loading&&(()=>{
        const rs=RS[result.riskLevel]||RS["Medium"];
        const score=result.riskScore||0;
        const suggs=result.suggestions||[];
        const feats=result.topFeatures||[];
        const proj=result.projectedRisk;
        return(
          <div className="sd" style={{marginTop:18,display:"flex",flexDirection:"column",gap:14}}>

            {/* Risk header */}
            <div style={{border:`2px solid ${rs.bd}`,borderRadius:18,overflow:"hidden",boxShadow:`0 8px 36px ${rs.glow}`}}>
              <div style={{background:rs.bg,padding:"22px 26px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",borderBottom:`1.5px solid ${rs.bd}`}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div style={{width:58,height:58,borderRadius:15,background:rs.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#fff",flexShrink:0,boxShadow:`0 4px 16px ${rs.glow}`}}>{rs.icon}</div>
                  <div>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".11em",color:rs.c,fontWeight:700,marginBottom:4,opacity:.6}}>Denial Risk Prediction</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(20px,4vw,29px)",color:rs.c,fontWeight:600,lineHeight:1.1}}>{result.riskLevel} Risk</div>
                    <div style={{fontSize:11,color:rs.c,opacity:.5,marginTop:4}}>Claim {result.id} · {result.date}</div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:rs.c,textTransform:"uppercase",letterSpacing:".09em",marginBottom:5,fontWeight:700,opacity:.6}}>Denial Risk Score</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(34px,6vw,48px)",color:rs.c,fontWeight:600,lineHeight:1}}>{score}%</div>
                  <div style={{width:150,height:6,background:`${rs.c}18`,borderRadius:3,marginTop:10,overflow:"hidden",marginLeft:"auto"}}>
                    <div style={{height:"100%",width:`${score}%`,background:rs.bar,borderRadius:3,transition:"width 1.3s cubic-bezier(.4,0,.2,1)"}}/>
                  </div>
                  {proj!=null&&<div style={{fontSize:11,color:rs.c,marginTop:7,opacity:.65}}>After fix: <strong>{Math.round(proj)}%</strong></div>}
                </div>
              </div>
              <div className="rg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:"var(--card)"}}>
                {[["Claim ID",result.id],["Company",result.company],["Amount",result.claimAmount?`$${result.claimAmount.toLocaleString()}`:"—"],["Type",result.claimType||"—"],["Employment",result.employment],["Income",result.income?`$${result.income.toLocaleString()}`:"—"],["Age / Gender",`${result.age} · ${result.gender||"—"}`],["Date",result.date]].map(([k,v],i)=>(
                  <div key={k} style={{padding:"13px 18px",borderRight:(i+1)%4!==0?"1px solid #e4ddd4":"none",borderBottom:i<4?"1px solid #e4ddd4":"none"}}>
                    <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#7a9982",marginBottom:4,fontWeight:700}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1c2b22",wordBreak:"break-word"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top risk features */}
            {feats.length>0&&(
              <div className="card">
                <SecLbl color="#4a82b8">Top Risk Factors</SecLbl>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {feats.map((feat,i)=>{
                    const pct=Math.max(18,100-i*18);
                    const bc=i===0?"#b83025":i===1?"#c07030":"#3d8b5e";
                    return(
                      <div key={feat} style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{width:22,height:22,borderRadius:7,background:bc,color:"#fff",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                        <div style={{minWidth:140,fontSize:12.5,color:"#3d5247",fontWeight:500,flexShrink:0}}>{feat}</div>
                        <div style={{flex:1,height:6,background:"#e4ddd4",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:bc,borderRadius:3,transition:"width .9s ease"}}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:bc,minWidth:28,textAlign:"right"}}>#{i+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {suggs.length>0&&(
              <div className="card">
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:16}}>
                  <div style={{width:3,height:15,background:"#c07030",borderRadius:2}}/>
                  <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"#c07030"}}>Recommendations</span>
                  <div style={{flex:1,height:1,background:"#e4ddd4"}}/>
                  <span style={{fontSize:10,color:"#7a9982"}}>{suggs.length} action{suggs.length!==1?"s":""}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {suggs.map((s,i)=>{
                    const sev=SEV[s.severity]||SEV["Medium"];
                    const pc=s.severity==="High"?"#b83025":s.severity==="Medium"?"#c07030":"#3d8b5e";
                    return(
                      <div key={i} style={{background:"#fff",border:`1.5px solid ${sev.bd}`,borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${pc}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:9}}>
                            <span style={{width:22,height:22,borderRadius:7,background:pc,color:"#fff",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#1c2b22"}}>{s.feature||"Risk Factor"}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {s.severity&&<span style={{fontSize:10,fontWeight:700,background:sev.bg,color:sev.c,border:`1px solid ${sev.bd}`,padding:"2px 9px",borderRadius:10}}>{s.severity}</span>}
                            {s.risk_contribution&&<span style={{fontSize:10,fontWeight:700,color:pc,background:`${pc}12`,padding:"2px 9px",borderRadius:10}}>{s.risk_contribution}</span>}
                          </div>
                        </div>
                        {s.message&&<div style={{fontSize:12.5,color:"#3d5247",lineHeight:1.6,marginBottom:8,paddingLeft:31}}>{s.message}</div>}
                        {s.action&&(
                          <div style={{display:"flex",alignItems:"flex-start",gap:7,paddingLeft:31}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}><path d="M5 12l5 5L20 7"/></svg>
                            <span style={{fontSize:12,color:"#173f26",fontWeight:500,lineHeight:1.55}}>{s.action}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Projected improvement */}
            {suggs.length>0&&(()=>{
              const red=proj!=null?Math.max(0,score-Math.round(proj)):0;
              const ok=proj!=null&&red>0;
              return(
                <div style={{background:ok?"linear-gradient(135deg,#1a5c34 0%,#2d7a4a 100%)":"linear-gradient(135deg,#321408 0%,#5e2a10 100%)",border:`1.5px solid ${ok?"#3d8b5e":"#c07030"}`,borderRadius:16,padding:"20px 26px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",boxShadow:"0 6px 28px rgba(0,0,0,.18)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:46,height:46,borderRadius:12,background:"rgba(255,255,255,.09)",border:"1px solid rgba(255,255,255,.14)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {ok
                        ?<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8d5b5" strokeWidth="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        :<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5cc96" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      }
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.38)",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:4}}>Apply all recommendations</div>
                      {ok
                        ?<div style={{fontSize:14,color:"#fff",fontWeight:600}}>Risk drops from <span style={{color:"#ffaa7a",fontWeight:700}}>{score}%</span> → <span style={{color:"#5dffa0",fontWeight:700}}>{Math.round(proj)}%</span></div>
                        :<div style={{fontSize:14,color:"#f5cc96",fontWeight:600}}>Risk remains at <span style={{color:"#ffaa7a",fontWeight:700}}>{score}%</span> — structural factors apply</div>
                      }
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>Potential reduction</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:38,color:ok?"#5dffa0":"#f5cc96",fontWeight:600,lineHeight:1}}>{red}%</div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}

// ────────────────────────────── HISTORY PAGE
function HistoryPage({history,onClear}){
  const[search,sSearch]=useState("");
  const[fRl,sFRl]=useState("All");
  const[fCo,sFCo]=useState("All");
  const cos=["All",...Array.from(new Set(history.map(h=>h.company)))];
  const rls=["All","Low","Medium","High","Critical"];
  const filtered=history.filter(h=>{
    const q=search.toLowerCase();
    return(!q||h.id?.toLowerCase().includes(q)||h.company?.toLowerCase().includes(q))
      &&(fRl==="All"||h.riskLevel===fRl)
      &&(fCo==="All"||h.company===fCo);
  });
  const tot=history.length;
  const low=history.filter(h=>h.riskLevel==="Low").length;
  const high=history.filter(h=>h.riskLevel==="High"||h.riskLevel==="Critical").length;
  const avgS=tot?Math.round(history.reduce((s,h)=>s+(h.riskScore||0),0)/tot):0;

  if(!tot) return(
    <div className="fu" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:380,gap:18,textAlign:"center",padding:24}}>
      <div style={{width:74,height:74,borderRadius:20,background:"#eaf6f0",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="1.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
      </div>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:21,color:"#1c2b22",marginBottom:7}}>No Claims Yet</div>
        <div style={{color:"#7a9982",fontSize:13,maxWidth:280,lineHeight:1.65}}>Submit a claim from New Entry — it will appear here.</div>
      </div>
    </div>
  );

  return(
    <div className="fu" style={{width:"100%"}}>
      <div className="sg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {[
          {l:"Total",v:tot,s:"claims",c:"#1a5c34",bg:"var(--card)",bd:"#e4ddd4"},
          {l:"Low Risk",v:low,s:`${tot?((low/tot)*100).toFixed(0):0}%`,c:"#1a5c34",bg:"#eaf6f0",bd:"#9ecfae"},
          {l:"High Risk",v:high,s:`${tot?((high/tot)*100).toFixed(0):0}%`,c:"#8f1e14",bg:"#fde6e4",bd:"#f0a09a"},
          {l:"Avg Risk",v:`${avgS}%`,s:"avg score",c:"#7a3c0a",bg:"#fef0e0",bd:"#f0bc7a"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,border:`1.5px solid ${s.bd}`,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 10px rgba(20,50,30,.05)"}}>
            <div style={{fontSize:9.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:s.c,opacity:.6,marginBottom:3}}>{s.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(22px,4vw,28px)",color:s.c,lineHeight:1.1}}>{s.v}</div>
            <div style={{fontSize:11,color:s.c,opacity:.5,marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{background:"var(--card)",border:"1.5px solid #e4ddd4",borderRadius:14,padding:"16px 18px",marginBottom:14,boxShadow:"0 1px 8px rgba(20,50,30,.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="2.2"><path d="M22 3H2l8 9.46V19l4 2V12.46z"/></svg>
          <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",color:"#3d5247"}}>Filter Claims</span>
          {(search||fRl!=="All"||fCo!=="All")&&(
            <button onClick={()=>{sSearch("");sFRl("All");sFCo("All");}} style={{marginLeft:"auto",padding:"2px 12px",background:"#eaf6f0",color:"#173f26",border:"1.5px solid #9ecfae",borderRadius:20,cursor:"pointer",fontSize:10.5,fontWeight:600}}>Reset</button>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Search</label>
            <div style={{position:"relative"}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a9982" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e=>sSearch(e.target.value)} placeholder="Claim ID or company…" className="inp" style={{paddingLeft:30,fontSize:12.5}}/>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Insurance Company</label>
            <FSel value={fCo} onChange={e=>sFCo(e.target.value)} style={{fontSize:12.5}}>{cos.map(c=><option key={c}>{c}</option>)}</FSel>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Risk Level</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {rls.map(r=>{
                const on=fRl===r;
                const rc=r==="Low"?"#173f26":r==="Medium"?"#7a3c0a":r==="High"?"#8f1e14":r==="Critical"?"#541d72":"#3d5247";
                const rbg=r==="Low"?"#e4f4ea":r==="Medium"?"#fef0e0":r==="High"?"#fde6e4":r==="Critical"?"#f3e6f8":"#f0ebe2";
                const rbd=r==="Low"?"#9ecfae":r==="Medium"?"#f0bc7a":r==="High"?"#f0a09a":r==="Critical"?"#c898e0":"#ddd6ca";
                return <button key={r} onClick={()=>sFRl(r)} style={{padding:"4px 11px",borderRadius:20,border:`1.5px solid ${on?rbd:"#ddd6ca"}`,background:on?rbg:"transparent",color:on?rc:"#7a9982",fontSize:11,fontWeight:on?700:400,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>{r}</button>;
              })}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:12,borderTop:"1px solid #ede8e0"}}>
          <span style={{fontSize:11,color:"#7a9982"}}>Showing <strong style={{color:"#1c2b22"}}>{filtered.length}</strong> of <strong style={{color:"#1c2b22"}}>{tot}</strong> claims</span>
          {onClear&&tot>0&&(
            <button onClick={()=>{if(window.confirm("Clear all claim history?"))onClear();}} style={{padding:"5px 14px",background:"#fde6e4",color:"#8f1e14",border:"1.5px solid #f0a09a",borderRadius:8,cursor:"pointer",fontSize:11.5,fontWeight:600}}>Clear All</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{background:"var(--card)",border:"1.5px solid #e4ddd4",borderRadius:14,overflow:"hidden",boxShadow:"0 4px 22px rgba(20,50,30,.08)"}}>
        {!filtered.length
          ?<div style={{textAlign:"center",padding:40,color:"#7a9982",fontSize:13}}>No records match your filters.</div>
          :(
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
                <thead>
                  <tr style={{background:"linear-gradient(90deg,#1a5c34,#2d7a4a)"}}>
                    {["Claim ID","Company","Age","Employment","Amount","Type","Date","Risk Score","Level"].map(h=>(
                      <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"rgba(255,255,255,.65)",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h,i)=>{
                    const sc=h.riskScore||0;
                    const bc=sc>=70?"#b83025":sc>=40?"#c07030":"#3d8b5e";
                    return(
                      <tr key={h.id+i} style={{borderBottom:"1px solid #e4ddd4",background:i%2===0?"var(--card)":"#f7f3ee",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#ebf7f1"}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"var(--card)":"#f7f3ee"}>
                        <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:11,color:"#7a9982"}}>{h.id}</td>
                        <td style={{padding:"11px 14px",fontWeight:600,fontSize:12.5,whiteSpace:"nowrap"}}>{h.company}</td>
                        <td style={{padding:"11px 14px",fontSize:12.5,color:"#3d5247"}}>{h.age}</td>
                        <td style={{padding:"11px 14px",fontSize:12,color:"#3d5247",whiteSpace:"nowrap"}}>{h.employment}</td>
                        <td style={{padding:"11px 14px",fontSize:12,color:"#3d5247"}}>{h.claimAmount?`$${h.claimAmount.toLocaleString()}`:"—"}</td>
                        <td style={{padding:"11px 14px",fontSize:12,color:"#3d5247",whiteSpace:"nowrap"}}>{h.claimType||"—"}</td>
                        <td style={{padding:"11px 14px",fontSize:11,color:"#7a9982"}}>{h.date}</td>
                        <td style={{padding:"11px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:60,height:5,background:"#e4ddd4",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                              <div style={{height:"100%",width:`${sc}%`,background:bc,borderRadius:2}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:700,color:bc}}>{sc}%</span>
                          </div>
                        </td>
                        <td style={{padding:"11px 14px"}}><RiskBadge level={h.riskLevel}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ────────────────────────────── DATASET CONSTANTS
const DS_COMPANIES=["Aetna","Blue Cross Blue Shield","Centene Corporation","Cigna","Highmark Health","Humana","Kaiser Permanente","Molina Healthcare","Oscar Health","UnitedHealth Group"];
const DS_MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DS_CLAIM_TYPES=["Dental","Emergency","Inpatient","Mental Health","Outpatient","Pharmacy","Preventive","Specialist","Vision"];
const DS_CO_STATS={"Aetna":{total:500,rej:104,rate:21},"Blue Cross Blue Shield":{total:500,rej:101,rate:20},"Centene Corporation":{total:500,rej:88,rate:18},"Cigna":{total:500,rej:110,rate:22},"Highmark Health":{total:500,rej:91,rate:18},"Humana":{total:500,rej:115,rate:23},"Kaiser Permanente":{total:500,rej:115,rate:23},"Molina Healthcare":{total:500,rej:111,rate:22},"Oscar Health":{total:500,rej:87,rate:17},"UnitedHealth Group":{total:500,rej:118,rate:24}};
const DS_HM_MONTH={"Aetna":[12,15,33,16,19,18,24,17,20,20,22,31],"Blue Cross Blue Shield":[9,20,19,10,28,30,32,10,26,20,17,29],"Centene Corporation":[17,17,19,19,17,10,24,18,28,12,14,17],"Cigna":[15,16,24,21,28,15,25,21,22,25,21,30],"Highmark Health":[16,24,21,20,21,13,24,16,17,19,15,17],"Humana":[27,16,26,27,18,24,27,16,18,21,31,34],"Kaiser Permanente":[24,29,23,20,21,23,18,25,18,26,20,31],"Molina Healthcare":[35,15,21,21,8,22,29,27,28,15,18,23],"Oscar Health":[17,19,13,19,16,20,17,17,10,17,31,17],"UnitedHealth Group":[20,14,37,18,30,23,17,28,29,16,30,24]};
const DS_HM_TYPE={"Aetna":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":24,Outpatient:21,Pharmacy:17,Preventive:22,Specialist:null,Vision:null},"Blue Cross Blue Shield":{Dental:25,Emergency:null,Inpatient:18,"Mental Health":null,Outpatient:21,Pharmacy:null,Preventive:17,Specialist:null,Vision:19},"Centene Corporation":{Dental:null,Emergency:22,Inpatient:null,"Mental Health":19,Outpatient:14,Pharmacy:11,Preventive:23,Specialist:null,Vision:null},"Cigna":{Dental:null,Emergency:20,Inpatient:28,"Mental Health":null,Outpatient:18,Pharmacy:null,Preventive:null,Specialist:22,Vision:null},"Highmark Health":{Dental:null,Emergency:24,Inpatient:20,"Mental Health":null,Outpatient:12,Pharmacy:null,Preventive:null,Specialist:16,Vision:null},"Humana":{Dental:18,Emergency:null,Inpatient:28,"Mental Health":null,Outpatient:null,Pharmacy:23,Preventive:27,Specialist:null,Vision:21},"Kaiser Permanente":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":27,Outpatient:21,Pharmacy:20,Preventive:25,Specialist:null,Vision:null},"Molina Healthcare":{Dental:null,Emergency:19,Inpatient:null,"Mental Health":27,Outpatient:22,Pharmacy:24,Preventive:19,Specialist:null,Vision:null},"Oscar Health":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":18,Outpatient:18,Pharmacy:18,Preventive:15,Specialist:null,Vision:null},"UnitedHealth Group":{Dental:null,Emergency:null,Inpatient:22,"Mental Health":null,Outpatient:26,Pharmacy:null,Preventive:null,Specialist:23,Vision:null}};
const CO_COLORS=["#235c38","#4a82b8","#c07030","#8b4faa","#b83025","#267a7a","#b8941a","#7a4820","#3a8e54","#7a3a7a"];

// ────────────────────────────── ANALYTICS PAGE
function AnalyticsPage({history}){
  const[hmView,sHmView]=useState("month");
  const[tooltip,sTt]=useState(null);
  const[ttPos,sTtPos]=useState({x:0,y:0});
  const[activeCo,sActiveCo]=useState(null);

  const hmCol=v=>{if(v===null)return"#ede8e0";if(v<15)return"#c8efd4";if(v<20)return"#a8d5b5";if(v<25)return"#fdecd5";if(v<30)return"#f8c89a";return"#f5a09a";};
  const hmTxt=v=>{if(v===null)return"#c2bcb4";if(v<20)return"#173f26";if(v<25)return"#7a3c0a";return"#6a1410";};

  const Card=({children,style={}})=><div className="card" style={style}>{children}</div>;
  const Title=({children,color="#3d8b5e",right=null})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <div style={{width:3,height:14,background:color,borderRadius:2}}/>
      <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color}}>{children}</span>
      {right&&<div style={{marginLeft:"auto"}}>{right}</div>}
    </div>
  );

  const sortedCos=[...DS_COMPANIES].sort((a,b)=>DS_CO_STATS[b].rate-DS_CO_STATS[a].rate);

  return(
    <div className="fu" style={{width:"100%",maxWidth:1160,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

      {/* Dataset badge */}
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 18px",background:"linear-gradient(90deg,#1a5c34,#2d7a4a)",borderRadius:12,color:"rgba(255,255,255,.65)",fontSize:11,boxShadow:"0 2px 12px rgba(14,44,26,.25)"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        <span>Dataset: <strong style={{color:"#5dffa0"}}>5,000 historical claims</strong> · 10 insurers · dataset_featured.csv</span>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {l:"Records",v:"5,000",s:"historical claims",c:"#1a5c34",bg:"var(--card)",bd:"#e4ddd4"},
          {l:"Avg Rejection",v:"21%",s:"across all insurers",c:"#7a3c0a",bg:"#fef0e0",bd:"#f0bc7a"},
          {l:"Highest",v:"24%",s:"UnitedHealth Group",c:"#8f1e14",bg:"#fde6e4",bd:"#f0a09a"},
          {l:"Lowest",v:"17%",s:"Oscar Health",c:"#1a5c34",bg:"#eaf6f0",bd:"#9ecfae"},
          {l:"Insurers",v:"10",s:"tracked companies",c:"#1e3e6a",bg:"#ddeaf8",bd:"#9ec0e8"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,border:`1.5px solid ${k.bd}`,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 10px rgba(20,50,30,.05)"}}>
            <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:k.c,opacity:.55,marginBottom:4}}>{k.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:k.c,lineHeight:1.1}}>{k.v}</div>
            <div style={{fontSize:10,color:k.c,opacity:.45,marginTop:3}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Bars + live claims */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 276px",gap:16}}>
        <Card>
          <Title color="#4a82b8">Rejection Rate by Insurer</Title>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {sortedCos.map((co,i)=>{
              const s=DS_CO_STATS[co];
              const on=activeCo===co;
              const bc=s.rate>=23?"#b83025":s.rate>=20?"#c07030":"#3d8b5e";
              return(
                <div key={co} onClick={()=>sActiveCo(on?null:co)} style={{cursor:"pointer",borderRadius:10,padding:"7px 10px",background:on?"#ebf5ef":"transparent",border:on?"1.5px solid #9ecfae":"1.5px solid transparent",transition:"all .18s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <span style={{fontSize:11,fontWeight:600,color:"#1c2b22",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{co}</span>
                    <span style={{fontSize:10,color:"#7a9982",flexShrink:0}}>{s.rej}/{s.total}</span>
                    <span style={{fontSize:12,fontWeight:700,color:bc,minWidth:34,textAlign:"right",flexShrink:0}}>{s.rate}%</span>
                  </div>
                  <div style={{height:6,background:"#e4ddd4",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${s.rate/32*100}%`,background:`linear-gradient(90deg,${bc}70,${bc})`,borderRadius:3,transition:"width .9s ease"}}/>
                  </div>
                  {on&&<div style={{marginTop:7,display:"flex",gap:12,paddingLeft:2}}><span style={{fontSize:10.5,color:"#b83025"}}>⬆ {s.rej} rejected</span><span style={{fontSize:10.5,color:"#3d8b5e"}}>✓ {s.total-s.rej} approved</span></div>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <Title>Your Claims</Title>
          {!history.length
            ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:160,gap:12,textAlign:"center"}}>
               <div style={{width:50,height:50,borderRadius:14,background:"#eaf6f0",display:"flex",alignItems:"center",justifyContent:"center"}}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="1.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <div style={{color:"#7a9982",fontSize:12,lineHeight:1.6}}>Submit a claim to see your live stats.</div>
             </div>
            :(()=>{
              const tot=history.length;
              const dist={Low:0,Medium:0,High:0,Critical:0};
              history.forEach(h=>{if(h.riskLevel)dist[h.riskLevel]=(dist[h.riskLevel]||0)+1;});
              const dC={Low:"#3d8b5e",Medium:"#c07030",High:"#b83025",Critical:"#8b4faa"};
              const avg=Math.round(history.reduce((s,h)=>s+(h.riskScore||0),0)/tot);
              return(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{textAlign:"center",padding:"8px 0"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:"#173f26"}}>{tot}</div>
                    <div style={{fontSize:10,color:"#7a9982",textTransform:"uppercase",letterSpacing:".07em"}}>claims submitted</div>
                  </div>
                  <div style={{textAlign:"center",padding:"7px 0",background:"#fef0e0",borderRadius:10}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#7a3c0a"}}>{avg}%</div>
                    <div style={{fontSize:10,color:"#7a3c0a",opacity:.6}}>avg risk score</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {Object.entries(dist).filter(([,n])=>n>0).map(([k,n])=>(
                      <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:dC[k]}}/><span style={{fontSize:11,color:"#3d5247"}}>{k}</span></div>
                        <span style={{fontSize:11,fontWeight:700,color:dC[k]}}>{n} <span style={{fontWeight:400,color:"#7a9982"}}>({Math.round(n/tot*100)}%)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          }
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <Title color="#c07030"
          right={
            <div style={{display:"flex",background:"#f3eeea",borderRadius:9,overflow:"hidden",border:"1.5px solid #ddd6ca"}}>
              {[{id:"month",label:"By Month"},{id:"type",label:"By Claim Type"}].map(t=>(
                <button key={t.id} onClick={()=>sHmView(t.id)} style={{padding:"5px 15px",fontSize:11,fontWeight:hmView===t.id?700:400,background:hmView===t.id?"#1e6e42":"transparent",color:hmView===t.id?"#fff":"#7a9982",border:"none",cursor:"pointer",transition:"all .18s"}}>{t.label}</button>
              ))}
            </div>
          }>
          Denial Heatmap — {hmView==="month"?"Insurer × Month":"Insurer × Claim Type"}
        </Title>
        <div style={{fontSize:11,color:"#7a9982",marginBottom:14}}>
          {hmView==="month"?"Rejection rate per insurer per calendar month — identifies seasonal spikes.":"Rejection rate per insurer per claim type — grey = no data."}
        </div>
        <div style={{overflowX:"auto",position:"relative"}}>
          <table style={{borderCollapse:"separate",borderSpacing:3,minWidth:hmView==="month"?700:640}}>
            <thead>
              <tr>
                <th style={{padding:"4px 10px",fontSize:9,textTransform:"uppercase",color:"#7a9982",textAlign:"left",minWidth:140,position:"sticky",left:0,background:"var(--card)",zIndex:2}}/>
                {(hmView==="month"?DS_MONTHS:DS_CLAIM_TYPES).map(col=>(
                  <th key={col} style={{padding:"4px 5px",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:"#3d5247",textAlign:"center",minWidth:hmView==="month"?52:72,whiteSpace:"nowrap"}}>{col}</th>
                ))}
                <th style={{padding:"4px 8px",fontSize:9,color:"#7a9982",textAlign:"center",minWidth:44}}>AVG</th>
              </tr>
            </thead>
            <tbody>
              {DS_COMPANIES.map(co=>{
                const vals=hmView==="month"?DS_HM_MONTH[co]:DS_CLAIM_TYPES.map(ct=>DS_HM_TYPE[co][ct]);
                const valid=vals.filter(v=>v!==null);
                const avg=valid.length?Math.round(valid.reduce((s,v)=>s+v,0)/valid.length):null;
                return(
                  <tr key={co}>
                    <td style={{padding:"3px 10px 3px 2px",fontSize:11,fontWeight:600,color:"#1c2b22",whiteSpace:"nowrap",position:"sticky",left:0,background:"var(--card)",zIndex:1}} title={co}>{co.length>18?co.substring(0,16)+"…":co}</td>
                    {vals.map((v,ci)=>{
                      const lbl=hmView==="month"?DS_MONTHS[ci]:DS_CLAIM_TYPES[ci];
                      return(
                        <td key={ci} style={{background:hmCol(v),borderRadius:5,padding:hmView==="month"?"7px 3px":"8px 3px",textAlign:"center",cursor:v!==null?"pointer":"default",transition:"transform .1s,box-shadow .1s"}}
                          onMouseEnter={e=>{
                            if(v!==null){e.currentTarget.style.transform="scale(1.14)";e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,.2)";e.currentTarget.style.zIndex="10";}
                            const r=e.currentTarget.getBoundingClientRect();
                            sTtPos({x:r.left+r.width/2,y:r.top-8});
                            sTt({co,col:lbl,v});
                          }}
                          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.zIndex="";sTt(null);}}>
                          {v!==null?<span style={{fontSize:10.5,fontWeight:700,color:hmTxt(v)}}>{v}%</span>:<span style={{fontSize:10,color:"#c2bcb4"}}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{padding:"7px 5px",textAlign:"center",background:avg?hmCol(avg)+"99":"transparent",borderRadius:5}}>
                      {avg!==null&&<span style={{fontSize:11,fontWeight:700,color:hmTxt(avg)}}>{avg}%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:14,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#7a9982",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Scale:</span>
          {[{l:"<15%",c:"#c8efd4"},{l:"15–20%",c:"#a8d5b5"},{l:"20–25%",c:"#fdecd5"},{l:"25–30%",c:"#f8c89a"},{l:">30%",c:"#f5a09a"},{l:"No data",c:"#ede8e0"}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:13,height:13,borderRadius:3,background:x.c,border:"1px solid rgba(0,0,0,.07)"}}/>
              <span style={{fontSize:10,color:"#7a9982"}}>{x.l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Trend lines */}
      <Card>
        <Title color="#4a82b8">Monthly Rejection Trend — All Insurers</Title>
        {(()=>{
          const W=680,H=160,pL=30,pR=10,pT=10,pB=22;
          const xS=i=>pL+(i/11)*(W-pL-pR);
          const yS=v=>H-pB-((v/40)*(H-pT-pB));
          return(
            <div style={{overflowX:"auto"}}>
              <svg width={W} height={H} style={{display:"block"}}>
                {[10,20,30,40].map(v=>(
                  <g key={v}>
                    <line x1={pL} x2={W-pR} y1={yS(v)} y2={yS(v)} stroke="#e4ddd4" strokeWidth="1" strokeDasharray="3 3"/>
                    <text x={pL-4} y={yS(v)+3} textAnchor="end" fontSize="7.5" fill="#b0a898">{v}%</text>
                  </g>
                ))}
                {DS_MONTHS.map((m,i)=><text key={m} x={xS(i)} y={H-4} textAnchor="middle" fontSize="8" fill="#b0a898">{m}</text>)}
                {DS_COMPANIES.map((co,ci)=>{
                  const pts=DS_HM_MONTH[co].map((v,i)=>({x:xS(i),y:yS(v)}));
                  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  const on=activeCo===co;
                  const c=CO_COLORS[ci];
                  return(
                    <g key={co}>
                      <path d={d} fill="none" stroke={c} strokeWidth={on?3:1.2} opacity={activeCo&&!on?.18:1} strokeLinejoin="round"/>
                      {on&&pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill={c} stroke="#fff" strokeWidth="1.5"/>)}
                    </g>
                  );
                })}
              </svg>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",marginTop:8}}>
                {DS_COMPANIES.map((co,ci)=>(
                  <button key={co} onClick={()=>sActiveCo(activeCo===co?null:co)} style={{display:"flex",alignItems:"center",gap:5,border:"none",cursor:"pointer",padding:"2px 7px",borderRadius:6,background:activeCo===co?"#e8f5ed":"transparent"}}>
                    <div style={{width:16,height:3,borderRadius:2,background:CO_COLORS[ci]}}/>
                    <span style={{fontSize:10,color:activeCo===co?"#173f26":"#7a9982",fontWeight:activeCo===co?700:400}}>{co}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </Card>

      {tooltip&&(
        <div style={{position:"fixed",pointerEvents:"none",zIndex:9999,background:"#1c2b22",color:"#fff",borderRadius:10,padding:"9px 15px",fontSize:11.5,boxShadow:"0 6px 24px rgba(0,0,0,.3)",left:ttPos.x,top:ttPos.y,transform:"translate(-50%,-100%)",whiteSpace:"nowrap"}}>
          <strong>{tooltip.co}</strong> · {tooltip.col}<br/>
          Rejection: <strong style={{color:tooltip.v>=30?"#f5a09a":tooltip.v>=25?"#f8c89a":tooltip.v>=20?"#fdecd5":"#c8efd4"}}>{tooltip.v}%</strong>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────── BATCH PAGE
const SAMPLE_JSON = `{
  "claims": [
    {
      "description": "High risk — Inpatient Cardiology, paper submission, pending insurance",
      "CompanyName": "UnitedHealth Group",
      "ClaimAmount": 45000.0,
      "ClaimDate": "2023-06-15",
      "DiagnosisCode": "I25.10",
      "ProcedureCode": "70553",
      "PatientAge": 62,
      "PatientGender": "Male",
      "ProviderSpecialty": "Cardiology",
      "ClaimType": "Inpatient",
      "ClaimSubmissionMethod": "Paper",
      "InsuranceStatus": "Pending",
      "PatientIncome": 55000,
      "PatientMaritalStatus": "Married",
      "PatientEmploymentStatus": "Retired",
      "ProviderLocation": "TX"
    },
    {
      "description": "Low risk — Preventive, electronic, approved insurance, young patient",
      "CompanyName": "Kaiser Permanente",
      "ClaimAmount": 350.0,
      "ClaimDate": "2023-03-18",
      "DiagnosisCode": "Z00.00",
      "ProcedureCode": "99396",
      "PatientAge": 28,
      "PatientGender": "Female",
      "ProviderSpecialty": "Primary Care",
      "ClaimType": "Preventive",
      "ClaimSubmissionMethod": "Electronic",
      "InsuranceStatus": "Approved",
      "PatientIncome": 72000,
      "PatientMaritalStatus": "Single",
      "PatientEmploymentStatus": "Full-Time",
      "ProviderLocation": "WA"
    }
  ]
}`;

function BatchPage({onBatchSubmit}){
  const[mode,sMode]=useState("paste");
  const[raw,sRaw]=useState("");
  const[parseErr,sParseErr]=useState("");
  const[claims,sClaims]=useState([]);
  const[results,sResults]=useState([]);
  const[running,sRunning]=useState(false);
  const[expanded,sExpanded]=useState(null);
  const[progress,sProgress]=useState(0);

  // Normalize any field name format → internal camelCase keys
  // Supports: your hospital format (CompanyName, PatientAge, etc.)
  // AND the flat format (company, age, etc.) — both work seamlessly
  const normalize=(c)=>({
    company:       c.company      || c.CompanyName               || "",
    age:           String(c.age   || c.PatientAge                || ""),
    gender:        c.gender       || c.PatientGender             || "",
    marital:       c.marital      || c.PatientMaritalStatus       || "",
    employment:    c.employment   || c.PatientEmploymentStatus    || "",
    income:        String(c.income|| c.PatientIncome             || ""),
    claimAmount:   String(c.claimAmount || c.ClaimAmount         || ""),
    claimDate:     c.claimDate    || c.ClaimDate                 || "",
    claimType:     c.claimType    || c.ClaimType                 || "",
    diagCode:      c.diagCode     || c.DiagnosisCode             || "",
    procCode:      c.procCode     || c.ProcedureCode             || "",
    specialty:     c.specialty    || c.ProviderSpecialty          || "",
    location:      c.location     || c.ProviderLocation          || "",
    submission:    c.submission   || c.ClaimSubmissionMethod      || "",
    // Extra hospital fields — passed through for display
    description:   c.description  || "",
    insuranceStatus: c.InsuranceStatus || c.insuranceStatus      || "",
  });

  const extractArray=(parsed)=>{
    // Handle: plain array, { claims: [...] }, or single object
    if(Array.isArray(parsed)) return parsed;
    if(parsed && Array.isArray(parsed.claims)) return parsed.claims;
    if(parsed && typeof parsed==="object") return [parsed];
    return [];
  };

  const parseClaims=(text)=>{
    sParseErr(""); sClaims([]); sResults([]);
    try{
      const parsed=JSON.parse(text.trim());
      const arr=extractArray(parsed);
      if(!arr.length){sParseErr("No claims found in the JSON.");return;}
      if(arr.length>200){sParseErr("Max 200 claims per batch.");return;}
      sClaims(arr.map(normalize));
    }catch(e){sParseErr("Invalid JSON: "+e.message);}
  };

  const handleFile=async(e)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const text=await file.text();
    if(file.name.endsWith(".csv")){
      const lines=text.trim().split("\n");
      const headers=lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
      const arr=lines.slice(1).map(line=>{
        const vals=line.split(",").map(v=>v.trim().replace(/"/g,""));
        const obj={}; headers.forEach((h,i)=>{obj[h]=vals[i]||"";}); return obj;
      }).filter(o=>Object.values(o).some(v=>v));
      const j=JSON.stringify(arr,null,2); sRaw(j); parseClaims(j);
    } else { sRaw(text); parseClaims(text); }
    e.target.value="";
  };

  const runBatch=async()=>{
    if(!claims.length)return;
    sRunning(true); sExpanded(null); sProgress(0);
    const res=claims.map(c=>({claim:c,entry:null,status:"pending",error:null}));
    sResults([...res]);
    for(let i=0;i<claims.length;i++){
      res[i].status="running"; sResults([...res]);
      const c=claims[i]; // already normalized
      try{
        const data=await predictClaim(c);
        const entry={
          id:"CLM"+String(Math.floor(Math.random()*90000)+10000),
          company:c.company,age:parseInt(c.age)||0,
          employment:c.employment,income:parseInt(c.income)||0,
          claimAmount:parseFloat(c.claimAmount)||0,
          claimType:c.claimType,date:new Date().toISOString().split("T")[0],
          gender:c.gender,marital:c.marital,
          specialty:c.specialty,diagCode:c.diagCode,
          procCode:c.procCode,location:c.location,
          description:c.description||"",insuranceStatus:c.insuranceStatus||"",
          riskScore:Math.round(data.risk_score??0),riskLevel:data.risk_level??"Unknown",
          suggestions:data.prevention_suggestions??[],
          projectedRisk:data.projected_risk_if_fixed??null,
          topFeatures:data.top_risk_features??[],
        };
        res[i]={...res[i],entry,status:"done"};
        onBatchSubmit(entry);
      }catch(err){res[i]={...res[i],status:"error",error:err.message};}
      sProgress(Math.round((i+1)/claims.length*100));
      sResults([...res]);
    }
    sRunning(false);
  };

  const done=results.filter(r=>r.status==="done");
  const avgRisk=done.length?Math.round(done.reduce((s,r)=>s+(r.entry?.riskScore||0),0)/done.length):0;
  const highRisk=done.filter(r=>(r.entry?.riskScore||0)>=60).length;

  return(
    <div className="fu" style={{width:"100%",maxWidth:1020,margin:"0 auto"}}>

      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#1a5c34 0%,#236e42 50%,#2e8a54 100%)",borderRadius:18,padding:"22px 28px",marginBottom:20,position:"relative",overflow:"hidden",boxShadow:"0 8px 32px rgba(26,92,52,.28)"}}>
        <div style={{position:"absolute",top:-50,right:-30,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.03)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#5dffa0",boxShadow:"0 0 10px #5dffa0",animation:"pulse 2s ease infinite"}}/>
            <span style={{color:"rgba(255,255,255,.5)",fontSize:10,textTransform:"uppercase",letterSpacing:".13em",fontWeight:700}}>Batch Processing</span>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(18px,4vw,26px)",color:"#fff",fontWeight:600,marginBottom:6,lineHeight:1.2}}>Multi-Claim Batch Predictor</h2>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:13,lineHeight:1.6}}>Paste a JSON array or upload a JSON / CSV file · Up to 200 claims at once · Click any result row to expand</p>
        </div>
      </div>

      {/* Input card */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",gap:0,background:"#f0ebe2",borderRadius:10,padding:3,marginBottom:18,width:"fit-content"}}>
          {[{id:"paste",label:"Paste JSON"},{id:"upload",label:"Upload File"}].map(t=>(
            <button key={t.id} onClick={()=>sMode(t.id)}
              style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:mode===t.id?700:400,background:mode===t.id?"#1a5c34":"transparent",color:mode===t.id?"#fff":"#7a9982",transition:"all .18s"}}>
              {t.label}
            </button>
          ))}
        </div>

        {mode==="paste"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
              <label style={{fontSize:10,fontWeight:700,color:"#3d5247",textTransform:"uppercase",letterSpacing:".09em"}}>JSON Array of Claims</label>
              <button onClick={()=>{sRaw(SAMPLE_JSON);parseClaims(SAMPLE_JSON);}} style={{fontSize:11,color:"#4a82b8",background:"none",border:"none",cursor:"pointer",fontWeight:600,textDecoration:"underline",padding:0}}>Load sample</button>
            </div>
            <textarea value={raw} onChange={e=>{sRaw(e.target.value);sParseErr("");sClaims([]);sResults([]);}}
              placeholder={'[\n  {\n    "company": "Aetna",\n    "age": "45",\n    "gender": "Female",\n    ...\n  }\n]'}
              style={{width:"100%",height:200,padding:"12px 14px",border:"1.5px solid #ddd6ca",borderRadius:10,background:"#faf7f3",color:"#1c2b22",fontSize:12.5,fontFamily:"monospace",outline:"none",resize:"vertical",lineHeight:1.6}}
            />
            <button onClick={()=>parseClaims(raw)} disabled={!raw.trim()}
              style={{alignSelf:"flex-start",padding:"8px 22px",background:"#1a5c34",color:"#fff",border:"none",borderRadius:8,cursor:raw.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:600,opacity:raw.trim()?1:.5}}>
              Parse JSON
            </button>
          </div>
        )}

        {mode==="upload"&&(
          <div style={{border:"2px dashed #c0dece",borderRadius:12,padding:"32px 24px",textAlign:"center",background:"#f5fbf8"}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="1.5" style={{marginBottom:10,display:"block",margin:"0 auto 10px"}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style={{fontWeight:600,color:"#1c2b22",marginBottom:4}}>Drop your file here</div>
            <div style={{fontSize:12,color:"#7a9982",marginBottom:14}}>Supports <strong>.json</strong> and <strong>.csv</strong> (with header row)</div>
            <label style={{padding:"8px 22px",background:"#1a5c34",color:"#fff",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,display:"inline-block"}}>
              Browse File
              <input type="file" accept=".json,.csv" onChange={handleFile} style={{display:"none"}}/>
            </label>
          </div>
        )}

        {parseErr&&<div style={{marginTop:10,padding:"10px 14px",background:"#fde6e4",border:"1.5px solid #f0a09a",borderRadius:9,fontSize:12.5,color:"#8f1e14"}}>{parseErr}</div>}

        {claims.length>0&&!results.length&&(
          <div style={{marginTop:14,padding:"12px 16px",background:"#eaf6f0",border:"1.5px solid #8ecfb0",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a5c34" strokeWidth="2.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span style={{fontSize:13,fontWeight:600,color:"#1a5c34"}}>{claims.length} claim{claims.length!==1?"s":""} parsed and ready</span>
              <span style={{fontSize:11,color:"#7a9982"}}>· Claims will be processed one by one</span>
            </div>
            <button onClick={runBatch} disabled={running}
              style={{padding:"9px 24px",background:"linear-gradient(135deg,#1a5c34,#2d7a4a)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 14px rgba(26,92,52,.3)",display:"flex",alignItems:"center",gap:8}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Run All ({claims.length})
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {running&&(
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a5c34" strokeWidth="2.2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span style={{fontWeight:600,color:"#1a5c34",fontSize:13}}>Processing claims…</span>
            </div>
            <span style={{fontSize:12,color:"#7a9982"}}>{progress}%  ·  {results.filter(r=>r.status==="done"||r.status==="error").length} / {claims.length} done</span>
          </div>
          <div style={{height:7,background:"#e4ddd4",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:progress+"%",background:"linear-gradient(90deg,#4aa06e,#2d7a4a)",borderRadius:4,transition:"width .3s ease"}}/>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {results.length>0&&!running&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[
            {l:"Total",v:results.length,s:"claims",c:"#1a5c34",bg:"var(--card)",bd:"#e4ddd4"},
            {l:"Completed",v:done.length,s:"successful",c:"#1a5c34",bg:"#eaf6f0",bd:"#8ecfb0"},
            {l:"High Risk",v:highRisk,s:"score ≥ 60%",c:"#8f1e14",bg:"#fde6e4",bd:"#f0a09a"},
            {l:"Avg Risk",v:done.length?avgRisk+"%":"—",s:"across done",c:"#7a3c0a",bg:"#fef0e0",bd:"#f0bc7a"},
          ].map(k=>(
            <div key={k.l} style={{background:k.bg,border:"1.5px solid "+k.bd,borderRadius:12,padding:"13px 15px"}}>
              <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:k.c,opacity:.6,marginBottom:3}}>{k.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:k.c,lineHeight:1.1}}>{k.v}</div>
              <div style={{fontSize:10,color:k.c,opacity:.5,marginTop:2}}>{k.s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {results.length>0&&(
        <div className="card" style={{padding:0,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #e4ddd4",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:14,background:"#4a82b8",borderRadius:2}}/>
              <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"#4a82b8"}}>Batch Results</span>
            </div>
            <span style={{fontSize:11,color:"#7a9982"}}>Click any completed row to expand full breakdown</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
              <thead>
                <tr style={{background:"linear-gradient(90deg,#1a5c34,#2d7a4a)"}}>
                  {["#","ID","Company","Age","Type","Amount","Ins. Status","Run Status","Risk Score","Level",""].map((h,i)=>(
                    <th key={i} style={{padding:"11px 13px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"rgba(255,255,255,.65)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r,i)=>{
                  const sc=r.entry?.riskScore||0;
                  const bc=sc>=70?"#b83025":sc>=40?"#c07030":"#3d8b5e";
                  const isExp=expanded===i;
                  const rs=RS[r.entry?.riskLevel]||RS["Medium"];
                  return(
                    <React.Fragment key={i}>
                      <tr
                        onClick={()=>r.status==="done"&&sExpanded(isExp?null:i)}
                        style={{borderBottom:isExp?"none":"1px solid #e4ddd4",background:isExp?"#edf8f3":i%2===0?"var(--card)":"#f8f4ef",cursor:r.status==="done"?"pointer":"default",transition:"background .15s"}}
                        onMouseEnter={e=>{if(r.status==="done"&&!isExp)e.currentTarget.style.background="#e8f5ed";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=isExp?"#edf8f3":i%2===0?"var(--card)":"#f8f4ef";}}>
                        <td style={{padding:"11px 13px",fontSize:11,color:"#7a9982",fontWeight:600}}>{"#"+(i+1)}</td>
                        <td style={{padding:"11px 13px",fontFamily:"monospace",fontSize:11,color:"#7a9982"}}>{r.entry?.id||"—"}</td>
                        <td style={{padding:"11px 13px",fontWeight:600,fontSize:12.5,whiteSpace:"nowrap"}}>
                          <div>{r.claim.company||"—"}</div>
                          {r.claim.description&&<div style={{fontSize:10,color:"#7a9982",fontWeight:400,marginTop:2,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.claim.description}>{r.claim.description}</div>}
                        </td>
                        <td style={{padding:"11px 13px",fontSize:12,color:"#3d5247"}}>{r.claim.age||"—"}</td>
                        <td style={{padding:"11px 13px",fontSize:12,color:"#3d5247",whiteSpace:"nowrap"}}>{r.claim.claimType||"—"}</td>
                        <td style={{padding:"11px 13px",fontSize:12,color:"#3d5247"}}>{r.claim.claimAmount?"$"+parseFloat(r.claim.claimAmount).toLocaleString():"—"}</td>
                        <td style={{padding:"11px 13px"}}>
                          {(()=>{
                            const s=r.claim.insuranceStatus;
                            const sc2=s==="Approved"?"#1a5c34":s==="Pending"?"#7a3c0a":s==="Under Review"?"#8f1e14":s==="Partial"?"#541d72":"#3d5247";
                            const bg=s==="Approved"?"#eaf6f0":s==="Pending"?"#fef0e0":s==="Under Review"?"#fde6e4":s==="Partial"?"#f3e6f8":"#f0ebe2";
                            const bd=s==="Approved"?"#8ecfb0":s==="Pending"?"#f0bc7a":s==="Under Review"?"#f0a09a":s==="Partial"?"#c898e0":"#ddd6ca";
                            return s?<span style={{fontSize:10,fontWeight:700,background:bg,color:sc2,border:"1px solid "+bd,padding:"2px 9px",borderRadius:10,whiteSpace:"nowrap"}}>{s}</span>:<span style={{color:"#b0a898",fontSize:11}}>—</span>;
                          })()}
                        </td>
                        <td style={{padding:"11px 13px"}}>
                          {r.status==="running"&&<span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#7a9982"}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin .8s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Running</span>}
                          {r.status==="pending"&&<span style={{fontSize:11,color:"#b0a898"}}>Queued</span>}
                          {r.status==="done"&&<span style={{fontSize:11,color:"#1a5c34",fontWeight:600}}>Done</span>}
                          {r.status==="error"&&<span style={{fontSize:11,color:"#b83025",fontWeight:600}} title={r.error}>Error</span>}
                        </td>
                        <td style={{padding:"11px 13px"}}>
                          {r.status==="done"&&(
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <div style={{width:60,height:5,background:"#e4ddd4",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                                <div style={{height:"100%",width:sc+"%",background:bc,borderRadius:2}}/>
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:bc}}>{sc}%</span>
                            </div>
                          )}
                        </td>
                        <td style={{padding:"11px 13px"}}>{r.status==="done"&&<RiskBadge level={r.entry?.riskLevel}/>}</td>
                        <td style={{padding:"11px 16px",textAlign:"center",fontSize:13,color:"#7a9982"}}>{r.status==="done"&&(isExp?"▲":"▼")}</td>
                      </tr>

                      {isExp&&r.entry&&(
                        <tr>
                          <td colSpan={10} style={{padding:0,borderBottom:"1px solid #e4ddd4"}}>
                            <div className="sd" style={{background:"#f2fbf6",borderTop:"2px solid #8ecfb0",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>

                              {/* Description banner */}
                              {r.entry.description&&(
                                <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"#fff",border:"1.5px solid #e4ddd4",borderRadius:10,borderLeft:"4px solid #4a82b8"}}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a82b8" strokeWidth="2.2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                  <span style={{fontSize:12,color:"#3d5247",fontStyle:"italic"}}>{r.entry.description}</span>
                                </div>
                              )}

                              {/* Score + details */}
                              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                <div style={{display:"flex",alignItems:"center",gap:12}}>
                                  <div style={{width:50,height:50,borderRadius:13,background:rs.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",flexShrink:0}}>{rs.icon}</div>
                                  <div>
                                    <div style={{fontSize:9,textTransform:"uppercase",color:rs.c,fontWeight:700,opacity:.6,marginBottom:3}}>Risk Prediction</div>
                                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:rs.c,fontWeight:600}}>{r.entry.riskLevel} Risk</div>
                                  </div>
                                </div>
                                <div style={{textAlign:"center",padding:"8px 18px",background:rs.bg,border:"1.5px solid "+rs.bd,borderRadius:10}}>
                                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:rs.c,lineHeight:1}}>{sc}%</div>
                                  <div style={{fontSize:9,color:rs.c,opacity:.6,marginTop:2}}>Denial Risk</div>
                                </div>
                                {[
                                    ["Company",r.entry.company],
                                    ["Specialty",r.entry.specialty],
                                    ["Claim Type",r.entry.claimType],
                                    ["Ins. Status",r.entry.insuranceStatus||"—"],
                                    ["Diag Code",r.entry.diagCode],
                                    ["CPT Code",r.entry.procCode],
                                    ["Income",r.entry.income?"$"+r.entry.income.toLocaleString():"—"],
                                    ["Employment",r.entry.employment],
                                    ["Location",r.entry.location],
                                    ["Submission",r.entry.submission||r.claim?.submission||"—"],
                                  ].map(([k,v])=>(
                                  <div key={k} style={{padding:"8px 14px",background:"#fff",border:"1px solid #e4ddd4",borderRadius:9,flexShrink:0}}>
                                    <div style={{fontSize:9,color:"#7a9982",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:2}}>{k}</div>
                                    <div style={{fontSize:12.5,fontWeight:600,color:"#1c2b22"}}>{v}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Top features */}
                              {r.entry.topFeatures?.length>0&&(
                                <div>
                                  <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",color:"#4a82b8",marginBottom:10}}>Top Risk Factors</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                                    {r.entry.topFeatures.map((f,fi)=>{
                                      const bc2=fi===0?"#b83025":fi===1?"#c07030":"#3d8b5e";
                                      return(
                                        <div key={f} style={{display:"flex",alignItems:"center",gap:10}}>
                                          <span style={{width:20,height:20,borderRadius:6,background:bc2,color:"#fff",fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{fi+1}</span>
                                          <div style={{minWidth:140,fontSize:12,color:"#3d5247",fontWeight:500,flexShrink:0}}>{f}</div>
                                          <div style={{flex:1,height:5,background:"#ddd6ca",borderRadius:2,overflow:"hidden"}}>
                                            <div style={{height:"100%",width:Math.max(15,100-fi*18)+"%",background:bc2,borderRadius:2}}/>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Suggestions */}
                              {r.entry.suggestions?.length>0&&(
                                <div>
                                  <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",color:"#c07030",marginBottom:10}}>Recommendations</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    {r.entry.suggestions.map((s,si)=>{
                                      const pc=s.severity==="High"?"#b83025":s.severity==="Medium"?"#c07030":"#3d8b5e";
                                      const sev=SEV[s.severity]||SEV["Medium"];
                                      return(
                                        <div key={si} style={{background:"#fff",border:"1.5px solid "+sev.bd,borderRadius:10,padding:"12px 14px",borderLeft:"4px solid "+pc}}>
                                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:s.message?6:0}}>
                                            <span style={{width:20,height:20,borderRadius:5,background:pc,color:"#fff",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{si+1}</span>
                                            <span style={{fontSize:12.5,fontWeight:700,color:"#1c2b22",flex:1}}>{s.feature||"Risk Factor"}</span>
                                            {s.severity&&<span style={{fontSize:10,fontWeight:700,background:sev.bg,color:sev.c,border:"1px solid "+sev.bd,padding:"2px 8px",borderRadius:8}}>{s.severity}</span>}
                                          </div>
                                          {s.message&&<div style={{fontSize:12,color:"#3d5247",lineHeight:1.55,paddingLeft:28,marginBottom:4}}>{s.message}</div>}
                                          {s.action&&<div style={{display:"flex",alignItems:"flex-start",gap:6,paddingLeft:28}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4aa06e" strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}><path d="M5 12l5 5L20 7"/></svg><span style={{fontSize:11.5,color:"#1a5c34",fontWeight:500}}>{s.action}</span></div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Projected */}
                              {r.entry.suggestions?.length>0&&r.entry.projectedRisk!=null&&(()=>{
                                const red=Math.max(0,sc-Math.round(r.entry.projectedRisk));
                                const ok=red>0;
                                return(
                                  <div style={{background:ok?"linear-gradient(135deg,#1a5c34,#2d7a4a)":"linear-gradient(135deg,#321408,#5e2a10)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                                    <div>
                                      <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".09em",fontWeight:700,marginBottom:3}}>Apply recommendations</div>
                                      {ok?<div style={{fontSize:13,color:"#fff",fontWeight:600}}>Risk: <span style={{color:"#ffaa7a"}}>{sc}%</span> to <span style={{color:"#5dffa0"}}>{Math.round(r.entry.projectedRisk)}%</span></div>
                                         :<div style={{fontSize:13,color:"#f5cc96",fontWeight:600}}>Risk stays at <span style={{color:"#ffaa7a"}}>{sc}%</span></div>}
                                    </div>
                                    <div style={{textAlign:"right"}}>
                                      <div style={{fontSize:9,color:"rgba(255,255,255,.35)",textTransform:"uppercase",marginBottom:2}}>Reduction</div>
                                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:ok?"#5dffa0":"#f5cc96",lineHeight:1}}>{red}%</div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV template download */}
      <div style={{padding:"12px 16px",background:"var(--card)",border:"1.5px solid #e4ddd4",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{fontSize:12,color:"#7a9982"}}>Need a template? Download a CSV with all required column headers pre-filled.</div>
        <button onClick={()=>{
          const h=["company","age","gender","marital","employment","income","claimAmount","claimDate","claimType","diagCode","procCode","specialty","location","submission"];
          const s=["UnitedHealth Group","52","Male","Married","Full-Time","78000","14500","2026-03-01","Inpatient","I25.10","70553","Cardiology","TX","Electronic"];
          const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([[h.join(","),s.join(",")].join("\n")],{type:"text/csv"}));a.download="remedi_batch_template.csv";a.click();
        }} style={{padding:"7px 18px",background:"#1a5c34",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:600,display:"flex",alignItems:"center",gap:7}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download CSV Template
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────── ROOT
export default function App(){
  const[page,sPage]=useState("entry");
  const[collapsed,sCollapsed]=useState(false);
  const[mobileOpen,sMob]=useState(false);
  const[history,sHistory]=useState(()=>{try{const s=localStorage.getItem("rcm_claim_history");return s?JSON.parse(s):[];}catch{return[];}});
  const addH=e=>sHistory(p=>{const n=[e,...p];try{localStorage.setItem("rcm_claim_history",JSON.stringify(n));}catch{}return n;});

  const nav=[
    {id:"entry",label:"New Entry",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>},
    {id:"analytics",label:"Insights",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>},
    {id:"history",label:"Claim History",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>},
    {id:"batch",label:"Batch Upload",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6M9 15l3 3 3-3"/></svg>},
  ];
  const titles={entry:"New Claim Entry",analytics:"Insights",history:"Claim History",batch:"Batch Upload"};

  return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",position:"relative"}}>

        <div className="overlay" onClick={()=>sMob(false)}
          style={{display:"none",position:"fixed",inset:0,background:"rgba(0,0,0,.42)",zIndex:99,backdropFilter:"blur(2px)"}}
          ref={el=>{if(el)el.style.display=mobileOpen?"block":"none"}}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar${mobileOpen?" open":""}`}
          style={{width:collapsed?"var(--swc)":"var(--sw)",minWidth:collapsed?"var(--swc)":"var(--sw)",background:"linear-gradient(180deg,#1a5c34 0%,#124228 100%)",display:"flex",flexDirection:"column",transition:"width .28s cubic-bezier(.4,0,.2,1),min-width .28s cubic-bezier(.4,0,.2,1)",overflow:"hidden",boxShadow:"4px 0 32px rgba(6,18,10,.55)",zIndex:100,flexShrink:0}}>

          {/* Brand row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 14px 14px",minHeight:66}}>
            <div style={{display:"flex",alignItems:"center",gap:10,overflow:"hidden",flex:1}}>
              <div style={{width:36,height:36,minWidth:36,background:"rgba(168,213,181,.12)",border:"1.5px solid rgba(168,213,181,.22)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#a8d5b5",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              {!collapsed&&(
                <div style={{overflow:"hidden",minWidth:0}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#fff",whiteSpace:"nowrap",fontWeight:600,letterSpacing:".01em"}}>Re-Medi</div>
                  <div style={{fontSize:9,color:"rgba(168,213,181,.35)",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".09em"}}>RCM Predictor</div>
                </div>
              )}
            </div>
            <button onClick={()=>sCollapsed(!collapsed)} title={collapsed?"Expand":"Collapse"}
              style={{width:30,height:30,minWidth:30,border:"2px solid rgba(255,255,255,.5)",background:"rgba(255,255,255,.12)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff",fontSize:16,fontWeight:700,lineHeight:1}}>
              {collapsed?"›":"‹"}
            </button>
          </div>

          <div style={{height:1,background:"rgba(168,213,181,.08)",margin:"0 14px"}}/>

          {/* Nav */}
          <nav style={{padding:"14px 9px",flex:1,display:"flex",flexDirection:"column",gap:3}}>
            {!collapsed&&<span style={{fontSize:9,fontWeight:800,color:"rgba(168,213,181,.22)",textTransform:"uppercase",letterSpacing:".15em",padding:"0 8px 10px"}}>Navigation</span>}
            {nav.map(n=>(
              <button key={n.id} onClick={()=>{sPage(n.id);sMob(false);}} title={collapsed?n.label:""}
                className={`nav-item${page===n.id?" active":""}`}>
                <span style={{display:"flex",minWidth:16,flexShrink:0}}>{n.icon}</span>
                {!collapsed&&(
                  <>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis"}}>{n.label}</span>
                    {n.id==="history"&&history.length>0&&(
                      <span style={{background:"rgba(93,255,160,.1)",color:"#5dffa0",padding:"1px 7px",borderRadius:9,fontSize:10,fontWeight:700,flexShrink:0}}>{history.length}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{padding:"8px 9px 16px"}}>
            <div style={{height:1,background:"rgba(168,213,181,.08)",margin:"0 5px 12px"}}/>
            {!collapsed&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 8px 10px",fontSize:9.5,color:"rgba(168,213,181,.22)",whiteSpace:"nowrap"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:"#3effa0",boxShadow:"0 0 7px #5dffa0",animation:"pulse 2s ease infinite",flexShrink:0}}/>
                Re-Medi v1.0 · 2026
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.35)",fontSize:12,overflow:"hidden",whiteSpace:"nowrap"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {!collapsed&&<span>Analyst</span>}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0,background:"#f3eeea"}}>

          {/* Topbar */}
          <header className="topbar" style={{height:58,minHeight:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",background:"#faf7f3",borderBottom:"1.5px solid #e4ddd4",boxShadow:"0 1px 12px rgba(20,50,30,.06)",gap:10,flexShrink:0}}>
            <button className="mob-btn" onClick={()=>sMob(!mobileOpen)}
              style={{display:"none",width:34,height:34,border:"none",background:"#eaf6f0",borderRadius:8,cursor:"pointer",alignItems:"center",justifyContent:"center",color:"#173f26",flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(15px,3vw,18px)",color:"#1c2b22",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {titles[page]}
              </div>
              <div style={{fontSize:10,color:"#7a9982"}}>Re-Medi / {titles[page]}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 14px",background:"#eaf6f0",border:"1.5px solid #8ecfb0",borderRadius:20,fontSize:11.5,color:"#1a5c34",fontWeight:600,whiteSpace:"nowrap"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#4aa06e",boxShadow:"0 0 5px #3d8b5e",animation:"pulse 2s ease infinite"}}/>
                Prediction Ready
              </div>
              {page==="history"&&history.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 14px",background:"#ddeaf8",border:"1.5px solid #9ec0e8",borderRadius:20,fontSize:11.5,color:"#1e3e6a",fontWeight:600,whiteSpace:"nowrap"}}>
                  {history.length} Claims
                </div>
              )}
            </div>
          </header>

          {/* Page body */}
          <div className="page-pad" style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"clamp(14px,3vw,24px) clamp(14px,3vw,28px)"}}>
            {page==="entry"&&<EntryPage onSubmit={addH}/>}
            {page==="analytics"&&<AnalyticsPage history={history}/>}
            {page==="history"&&<HistoryPage history={history} onClear={()=>{sHistory([]);try{localStorage.removeItem("rcm_claim_history");}catch{}}}/>}
            {page==="batch"&&<BatchPage onBatchSubmit={addH}/>}
          </div>
        </main>
      </div>
    </>
  );
}
