import { useState } from "react";
import { predictClaim } from "./api";

const G = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%}
body{font-family:'DM Sans',sans-serif;background:#f7f3ec;color:#1c2b22;font-size:13.5px;-webkit-font-smoothing:antialiased;overflow:hidden}
input,select,button{font-family:'DM Sans',sans-serif}
:root{
  --forest:#1a4d2e;--forest2:#2d6a46;--moss:#3d8b5e;--sage:#6ab187;
  --mint:#a8d5b5;--mintpal:#d4eddc;--cream:#f7f3ec;--parchment:#ede8df;
  --sand:#e0d9ce;--white:#ffffff;--ink:#1c2b22;--slate:#3d5247;--muted:#7a9982;
  --acc1:#c8783a;--acc2:#5b8fc4;--acc3:#9b59b6;--deny:#c0392b;
  --sw:240px;--swc:58px;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp .3s ease both}
.sd{animation:slideDown .35s ease both}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--mint);border-radius:3px}
@media(max-width:640px){
  .sidebar{position:fixed!important;left:0;top:0;height:100vh;z-index:100;transform:translateX(-100%);transition:transform .3s ease!important}
  .sidebar.open{transform:translateX(0)!important}
  .overlay{display:block!important}
  .topbar-menu-btn{display:flex!important}
}
@media(max-width:900px){
  .form-grid-2{grid-template-columns:1fr!important}
  .stats-grid{grid-template-columns:1fr 1fr!important}
  .result-grid{grid-template-columns:1fr 1fr!important}
}
@media(max-width:480px){
  .stats-grid{grid-template-columns:1fr 1fr!important}
  .result-grid{grid-template-columns:1fr 1fr!important}
  .page-body{padding:14px!important}
  .topbar{padding:0 14px!important}
  .hero-banner{padding:18px 16px!important}
  .form-card{padding:16px!important}
}
`;

const COMPANIES = ["UnitedHealth Group","Aetna","Cigna","Humana","Blue Cross Blue Shield","Kaiser Permanente","Molina Healthcare","Oscar Health","Centene Corporation","Highmark Health"];
const SPECIALTIES = ["Primary Care","Cardiology","Oncology","Surgery","Neurology","Psychiatry","Gastroenterology","Dermatology","Emergency Medicine","Orthopedics","Preventive","Obstetrics"];
const CLAIM_TYPES = ["Inpatient","Outpatient","Emergency","Preventive","Specialist","Mental Health","Pharmacy","Dental","Vision"];
const GENDERS = ["Male","Female","Non-Binary"];
const MARITAL = ["Single","Married","Divorced","Widowed","Domestic Partner"];
const EMPLOYMENT = ["Full-Time","Part-Time","Self-Employed","Unemployed","Retired","Student"];
const SUBMISSION = ["Electronic","Paper","Portal","Clearinghouse"];
const STATES = ["CA","TX","NY","FL","IL","PA","OH","GA","NC","MI","NJ","VA","WA","AZ","MA","TN","IN","MO","MD","WI"];

// Risk level → colors
const RS = {
  "Low":      {bg:"#d0ead8",c:"#1a4d2e",bd:"#a8d5b5",bar:"#3d8b5e",icon:"✓"},
  "Medium":   {bg:"#fdecd5",c:"#9b5f1a",bd:"#f5cc96",bar:"#c8783a",icon:"⚠"},
  "High":     {bg:"#fde0de",c:"#c0392b",bd:"#f5b0ab",bar:"#e74c3c",icon:"✗"},
  "Critical": {bg:"#f5e6f5",c:"#6c3483",bd:"#d4a8e8",bar:"#9b59b6",icon:"🚨"},
};
const SEV = {
  "High":   {bg:"#fde0de",c:"#c0392b",bd:"#f5b0ab"},
  "Medium": {bg:"#fdecd5",c:"#9b5f1a",bd:"#f5cc96"},
  "Low":    {bg:"#d0ead8",c:"#1a4d2e",bd:"#a8d5b5"},
};

// History badge
const HB = {
  "Low":      {bg:"#d0ead8",c:"#1a4d2e",bd:"#a8d5b5"},
  "Medium":   {bg:"#fdecd5",c:"#9b5f1a",bd:"#f5cc96"},
  "High":     {bg:"#fde0de",c:"#c0392b",bd:"#f5b0ab"},
  "Critical": {bg:"#f5e6f5",c:"#6c3483",bd:"#d4a8e8"},
};

function RiskBadge({level}){
  const s=HB[level]||HB["Medium"];
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,color:s.c,border:`1.5px solid ${s.bd}`,whiteSpace:"nowrap"}}>
      {level||"—"}
    </span>
  );
}

const iBase={padding:"9px 12px",border:"1.5px solid #e0d9ce",borderRadius:8,background:"#fff",color:"#1c2b22",fontSize:13.5,outline:"none",width:"100%",transition:"border-color .18s,box-shadow .18s"};

function FInp({style={},onFocus:of,onBlur:ob,...p}){
  const [f,setF]=useState(false);
  return(
    <input {...p}
      style={{...iBase,...style,borderColor:f?"#2d6a46":"#e0d9ce",boxShadow:f?"0 0 0 3px rgba(45,106,70,.10)":"none"}}
      onFocus={e=>{setF(true);of&&of(e)}}
      onBlur={e=>{setF(false);ob&&ob(e)}}
    />
  );
}

function FSel({children,style={},...p}){
  const [f,setF]=useState(false);
  return(
    <div style={{position:"relative",width:"100%"}}>
      <select {...p}
        style={{...iBase,...style,paddingRight:30,appearance:"none",WebkitAppearance:"none",cursor:"pointer",borderColor:f?"#2d6a46":"#e0d9ce",boxShadow:f?"0 0 0 3px rgba(45,106,70,.10)":"none"}}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      >{children}</select>
      <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a9982" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}

function FG({label,children,col=1}){
  return(
    <div style={{gridColumn:`span ${col}`,display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:10,fontWeight:700,color:"#3d5247",textTransform:"uppercase",letterSpacing:".09em"}}>{label}</label>
      {children}
    </div>
  );
}

function SecLbl({color="#3d8b5e",children}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"18px 0 12px"}}>
      <div style={{width:3,height:15,background:color,borderRadius:2}}/>
      <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color}}>{children}</span>
      <div style={{flex:1,height:1,background:"#d4eddc"}}/>
    </div>
  );
}

// ── ENTRY PAGE ────────────────────────────────────────────────
const EMPTY={company:"",age:"",gender:"",marital:"",employment:"",income:"",claimAmount:"",claimDate:"",diagCode:"",procCode:"",specialty:"",claimType:"",location:"",submission:""};

function EntryPage({onSubmit}){
  const [form,setForm]=useState(EMPTY);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const predict=async()=>{
    if(!form.company||!form.age||!form.employment){
      alert("Please fill: Insurance Company, Patient Age, and Employment Status.");return;
    }
    setLoading(true);setResult(null);
    try{
      // Call real ML backend — returns:
      // risk_score, risk_level, prevention_suggestions,
      // projected_risk_if_fixed, top_risk_features
      const data=await predictClaim(form);
      const entry={
        id:"CLM"+String(Math.floor(Math.random()*90000)+10000),
        company:form.company,
        age:parseInt(form.age)||0,
        employment:form.employment,
        income:parseInt(form.income)||0,
        claimAmount:parseFloat(form.claimAmount)||0,
        claimType:form.claimType,
        date:new Date().toISOString().split("T")[0],
        marital:form.marital,
        gender:form.gender,
        specialty:form.specialty,
        diagCode:form.diagCode,
        procCode:form.procCode,
        location:form.location,
        // ── Real ML fields ──
        riskScore:   Math.round(data.risk_score ?? 0),
        riskLevel:   data.risk_level ?? "Unknown",
        suggestions: data.prevention_suggestions ?? [],
        projectedRisk: data.projected_risk_if_fixed ?? null,
        topFeatures: data.top_risk_features ?? [],
      };
      setResult(entry);
      onSubmit(entry);
      setTimeout(()=>document.getElementById("result-anchor")?.scrollIntoView({behavior:"smooth"}),100);
    }catch(err){
      alert("Prediction failed: "+err.message+"\n\nCheck that backend is running:\ncd ml/backend\nuvicorn main:app --reload --port 8000");
    }finally{
      setLoading(false);
    }
  };

  return(
    <div className="fu" style={{width:"100%",maxWidth:780,margin:"0 auto"}}>

      {/* Hero banner */}
      <div className="hero-banner" style={{background:"linear-gradient(135deg,#1a4d2e 0%,#2d6a46 55%,#3d8b5e 100%)",borderRadius:14,padding:"22px 26px",marginBottom:18,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.04)"}}/>
        <div style={{position:"absolute",bottom:-60,right:40,width:150,height:150,borderRadius:"50%",background:"rgba(168,213,181,.08)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#6dffaa",boxShadow:"0 0 8px #6dffaa",animation:"pulse 2s ease infinite"}}/>
            <span style={{color:"rgba(255,255,255,.55)",fontSize:10.5,textTransform:"uppercase",letterSpacing:".1em",fontWeight:700}}>New Claim Submission</span>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(18px,4vw,26px)",color:"#fff",fontWeight:600,marginBottom:5,lineHeight:1.2}}>Insurance Denial Predictor</h2>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:"clamp(11px,2vw,13px)",lineHeight:1.5}}>Fill in claim details · ML model predicts denial risk + gives recommendations</p>
        </div>
      </div>

      {/* Form card */}
      <div className="form-card" style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:14,padding:"20px 22px",boxShadow:"0 2px 20px rgba(26,77,46,.07)"}}>

        <SecLbl>Company & Provider</SecLbl>
        <div className="form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FG label="Insurance Company ★">
            <FSel value={form.company} onChange={set("company")}>
              <option value="">Select company…</option>
              {COMPANIES.map(c=><option key={c}>{c}</option>)}
            </FSel>
          </FG>
          <FG label="Provider Specialty ★">
            <FSel value={form.specialty} onChange={set("specialty")}>
              <option value="">Select specialty…</option>
              {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
            </FSel>
          </FG>
          <FG label="Provider Location (State)">
            <FSel value={form.location} onChange={set("location")}>
              <option value="">Select state…</option>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </FSel>
          </FG>
          <FG label="Submission Method ★">
            <FSel value={form.submission} onChange={set("submission")}>
              <option value="">Select method…</option>
              {SUBMISSION.map(s=><option key={s}>{s}</option>)}
            </FSel>
          </FG>
        </div>

        <SecLbl color="#5b8fc4">Patient Information</SecLbl>
        <div className="form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FG label="Patient Age ★"><FInp type="number" placeholder="e.g. 45" value={form.age} onChange={set("age")}/></FG>
          <FG label="Gender ★">
            <FSel value={form.gender} onChange={set("gender")}>
              <option value="">Select gender…</option>
              {GENDERS.map(g=><option key={g}>{g}</option>)}
            </FSel>
          </FG>
          <FG label="Marital Status ★">
            <FSel value={form.marital} onChange={set("marital")}>
              <option value="">Select status…</option>
              {MARITAL.map(m=><option key={m}>{m}</option>)}
            </FSel>
          </FG>
          <FG label="Employment Status ★">
            <FSel value={form.employment} onChange={set("employment")}>
              <option value="">Select employment…</option>
              {EMPLOYMENT.map(e=><option key={e}>{e}</option>)}
            </FSel>
          </FG>
          <FG label="Annual Income ($)" col={2}>
            <FInp type="number" placeholder="e.g. 65000" value={form.income} onChange={set("income")}/>
          </FG>
        </div>

        <SecLbl color="#9b5f1a">Claim Details</SecLbl>
        <div className="form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FG label="Claim Amount ($) ★"><FInp type="number" placeholder="e.g. 12500" value={form.claimAmount} onChange={set("claimAmount")}/></FG>
          <FG label="Claim Date">
            <FInp type="date" value={form.claimDate} onChange={set("claimDate")} style={{colorScheme:"light",accentColor:"#1a4d2e",background:"#fff"}}/>
          </FG>
          <FG label="Claim Type ★">
            <FSel value={form.claimType} onChange={set("claimType")}>
              <option value="">Select type…</option>
              {CLAIM_TYPES.map(c=><option key={c}>{c}</option>)}
            </FSel>
          </FG>
          <FG label="Diagnosis Code (ICD-10) ★"><FInp placeholder="e.g. I25.10" value={form.diagCode} onChange={set("diagCode")}/></FG>
          <FG label="Procedure Code (CPT) ★" col={2}><FInp placeholder="e.g. 70553" value={form.procCode} onChange={set("procCode")}/></FG>
        </div>

        {/* Actions */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #d4eddc",gap:10}}>
          <button onClick={()=>{setForm(EMPTY);setResult(null);}}
            style={{padding:"9px 18px",background:"transparent",color:"#3d5247",border:"1.5px solid #e0d9ce",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500,transition:"all .2s",flexShrink:0}}>
            Clear
          </button>
          <button onClick={predict} disabled={loading}
            style={{padding:"11px 28px",background:loading?"#2d6a46":"#1a4d2e",color:"#fff",border:"none",borderRadius:8,cursor:loading?"not-allowed":"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(26,77,46,.3)",transition:"all .2s",flexShrink:0}}>
            {loading
              ?<><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{animation:"spin .8s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Analyzing…</>
              :<><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>Run ML Prediction</>
            }
          </button>
        </div>
      </div>

      {/* Loading state */}
      <div id="result-anchor"/>
      {loading&&(
        <div style={{marginTop:16,background:"#fff",border:"1.5px solid #d4eddc",borderRadius:14,padding:"24px 22px",display:"flex",alignItems:"center",gap:14}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a4d2e" strokeWidth="2.2" style={{animation:"spin 1s linear infinite",flexShrink:0}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <div>
            <div style={{fontWeight:600,color:"#1a4d2e",marginBottom:2}}>ML model analyzing claim…</div>
            <div style={{fontSize:12,color:"#7a9982"}}>Calculating denial risk · Generating recommendations</div>
          </div>
        </div>
      )}

      {/* ── RESULT SECTION — only real ML output, no mock ── */}
      {result&&!loading&&(()=>{
        const rs  = RS[result.riskLevel]||RS["Medium"];
        const score = result.riskScore||0;
        const suggs = result.suggestions||[];
        const feats = result.topFeatures||[];
        const proj  = result.projectedRisk;

        return(
          <div className="sd" style={{marginTop:16,display:"flex",flexDirection:"column",gap:14}}>

            {/* ── 1. RISK SCORE HEADER ── */}
            <div style={{border:`2px solid ${rs.bd}`,borderRadius:14,overflow:"hidden",boxShadow:`0 4px 24px ${rs.bd}44`}}>

              {/* Top strip — risk level + score */}
              <div style={{background:rs.bg,padding:"20px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",borderBottom:`1.5px solid ${rs.bd}`}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:rs.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",fontWeight:700,flexShrink:0}}>
                    {rs.icon}
                  </div>
                  <div>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:rs.c,fontWeight:700,marginBottom:3,opacity:.7}}>ML Denial Risk Prediction</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(20px,4vw,28px)",color:rs.c,fontWeight:600,lineHeight:1.1}}>{result.riskLevel} Risk</div>
                    <div style={{fontSize:11,color:rs.c,opacity:.6,marginTop:3}}>Claim {result.id} · {result.date}</div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:rs.c,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4,fontWeight:700,opacity:.7}}>Denial Risk Score</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,6vw,44px)",color:rs.c,fontWeight:600,lineHeight:1}}>{score}%</div>
                  <div style={{width:140,height:7,background:`${rs.c}22`,borderRadius:4,marginTop:8,overflow:"hidden",marginLeft:"auto"}}>
                    <div style={{height:"100%",width:`${score}%`,background:rs.bar,borderRadius:4,transition:"width 1.2s cubic-bezier(.4,0,.2,1)"}}/>
                  </div>
                  {proj!=null&&(
                    <div style={{fontSize:11,color:rs.c,marginTop:6,opacity:.75}}>
                      After fix: <strong>{Math.round(proj)}%</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Claim detail grid */}
              <div className="result-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:"#fff"}}>
                {[
                  ["Claim ID",result.id],
                  ["Company",result.company],
                  ["Amount",result.claimAmount?`$${result.claimAmount.toLocaleString()}`:"—"],
                  ["Claim Type",result.claimType||"—"],
                  ["Employment",result.employment],
                  ["Income",result.income?`$${result.income.toLocaleString()}`:"—"],
                  ["Age",result.age],
                  ["Date",result.date],
                ].map(([k,v],i)=>(
                  <div key={k} style={{padding:"12px 16px",borderRight:(i+1)%4!==0?"1px solid #d4eddc":"none",borderBottom:i<4?"1px solid #d4eddc":"none"}}>
                    <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#7a9982",marginBottom:3,fontWeight:700}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1c2b22",wordBreak:"break-word"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 2. TOP RISK FEATURES (from top_risk_features list) ── */}
            {feats.length>0&&(
              <div style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:14,padding:"18px 20px"}}>
                <SecLbl color="#5b8fc4">Top Risk Factors</SecLbl>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {feats.map((feat,i)=>{
                    const barPct = Math.max(20, 100 - i*18);
                    const barC   = i===0?"#c0392b":i===1?"#c8783a":"#3d8b5e";
                    return(
                      <div key={feat} style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{width:20,height:20,borderRadius:"50%",background:barC,color:"#fff",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                        <div style={{minWidth:140,fontSize:12.5,color:"#3d5247",fontWeight:500,flexShrink:0}}>{feat}</div>
                        <div style={{flex:1,height:7,background:"#e0d9ce",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${barPct}%`,background:barC,borderRadius:4,transition:"width .9s ease"}}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:barC,minWidth:30,textAlign:"right"}}>#{i+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 3. PREVENTION RECOMMENDATIONS (from prevention_suggestions) ── */}
            {suggs.length>0&&(
              <div style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:14,padding:"18px 20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{width:3,height:15,background:"#9b5f1a",borderRadius:2}}/>
                  <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"#9b5f1a"}}>ML Recommendations</span>
                  <div style={{flex:1,height:1,background:"#d4eddc"}}/>
                  <span style={{fontSize:10,color:"#7a9982",flexShrink:0}}>{suggs.length} action{suggs.length!==1?"s":""}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {suggs.map((s,i)=>{
                    // Each suggestion has: feature, risk_contribution, severity, message, action
                    const sev   = SEV[s.severity]||SEV["Medium"];
                    const pColor= s.severity==="High"?"#c0392b":s.severity==="Medium"?"#c8783a":"#3d8b5e";
                    return(
                      <div key={i} style={{background:"#f7f3ec",border:`1.5px solid ${sev.bd}`,borderRadius:10,padding:"14px 16px",borderLeft:`4px solid ${pColor}`}}>
                        {/* Header row: feature + severity + risk contribution */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:22,height:22,borderRadius:"50%",background:pColor,color:"#fff",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#1c2b22"}}>{s.feature||"Risk Factor"}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {s.severity&&(
                              <span style={{fontSize:10,fontWeight:700,background:sev.bg,color:sev.c,border:`1px solid ${sev.bd}`,padding:"2px 8px",borderRadius:10}}>{s.severity}</span>
                            )}
                            {s.risk_contribution&&(
                              <span style={{fontSize:10,fontWeight:700,color:pColor,background:`${pColor}15`,padding:"2px 8px",borderRadius:10}}>{s.risk_contribution}</span>
                            )}
                          </div>
                        </div>
                        {/* Issue message */}
                        {s.message&&(
                          <div style={{fontSize:12.5,color:"#3d5247",lineHeight:1.55,marginBottom:8,paddingLeft:30}}>{s.message}</div>
                        )}
                        {/* Corrective action */}
                        {s.action&&(
                          <div style={{display:"flex",alignItems:"flex-start",gap:7,paddingLeft:30,marginTop:4}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d8b5e" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="M5 12l5 5L20 7"/></svg>
                            <span style={{fontSize:12,color:"#1a4d2e",fontWeight:500,lineHeight:1.5}}>{s.action}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 4. PROJECTED IMPROVEMENT banner ── */}
            {(()=>{
              const reduction = proj!=null ? Math.max(0, score - Math.round(proj)) : 0;
              const hasImprovement = proj!=null && reduction > 0;
              const noImprovement = suggs.length > 0 && !hasImprovement;
              if(!suggs.length) return null;
              return(
                <div style={{background:hasImprovement?"linear-gradient(135deg,#1a4d2e 0%,#2d6a46 100%)":"linear-gradient(135deg,#4a3520 0%,#7a5230 100%)",border:`1.5px solid ${hasImprovement?"#3d8b5e":"#c8783a"}`,borderRadius:14,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(168,213,181,.15)",border:"1px solid rgba(168,213,181,.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {hasImprovement
                        ?<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8d5b5" strokeWidth="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        :<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5cc96" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      }
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"rgba(168,213,181,.55)",textTransform:"uppercase",letterSpacing:".08em",fontWeight:700,marginBottom:3}}>Apply all recommendations</div>
                      {hasImprovement
                        ?<div style={{fontSize:13.5,color:"#fff",fontWeight:600}}>Risk drops from <span style={{color:"#ff9e80",fontWeight:700}}>{score}%</span> → <span style={{color:"#6dffaa",fontWeight:700}}>{Math.round(proj)}%</span></div>
                        :<div style={{fontSize:13.5,color:"#f5cc96",fontWeight:600}}>Risk remains at <span style={{color:"#ff9e80",fontWeight:700}}>{score}%</span> — structural risk factors apply</div>
                      }
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:"rgba(168,213,181,.55)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:2}}>Potential reduction</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:hasImprovement?"#6dffaa":"#f5cc96",fontWeight:600,lineHeight:1}}>{reduction}%</div>
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

// ── HISTORY PAGE ──────────────────────────────────────────────
function HistoryPage({history,onClear}){
  const [search,setSearch]=useState("");
  const [fRl,setFRl]=useState("All");
  const [fCo,setFCo]=useState("All");
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

  if(tot===0) return(
    <div className="fu" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:380,gap:16,textAlign:"center",padding:24}}>
      <div style={{width:70,height:70,borderRadius:"50%",background:"#d4eddc",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3d8b5e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
      </div>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#1c2b22",marginBottom:6}}>No Claims Yet</div>
        <div style={{color:"#7a9982",fontSize:13,maxWidth:280,lineHeight:1.6}}>Submit a claim from New Entry — it will appear here.</div>
      </div>
    </div>
  );

  return(
    <div className="fu" style={{width:"100%"}}>
      {/* Stats */}
      <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {[
          {l:"Total",v:tot,s:"claims",c:"#1a4d2e",bg:"#fff",bd:"#d4eddc"},
          {l:"Low Risk",v:low,s:`${tot?((low/tot)*100).toFixed(0):0}%`,c:"#1a4d2e",bg:"#d0ead8",bd:"#a8d5b5"},
          {l:"High Risk",v:high,s:`${tot?((high/tot)*100).toFixed(0):0}%`,c:"#c0392b",bg:"#fde0de",bd:"#f5b0ab"},
          {l:"Avg Risk",v:`${avgS}%`,s:"avg score",c:"#9b5f1a",bg:"#fdecd5",bd:"#f5cc96"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,border:`1.5px solid ${s.bd}`,borderRadius:12,padding:"13px 15px"}}>
            <div style={{fontSize:9.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:s.c,opacity:.65,marginBottom:3}}>{s.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(22px,4vw,28px)",color:s.c,lineHeight:1.1}}>{s.v}</div>
            <div style={{fontSize:11,color:s.c,opacity:.55,marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:12,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 8px rgba(26,77,46,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3d8b5e" strokeWidth="2.2"><path d="M22 3H2l8 9.46V19l4 2V12.46z"/></svg>
          <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",color:"#3d5247"}}>Filter Claims</span>
          {(search||fRl!=="All"||fCo!=="All")&&(
            <button onClick={()=>{setSearch("");setFRl("All");setFCo("All");}}
              style={{marginLeft:"auto",padding:"2px 10px",background:"#f0f7f3",color:"#3d8b5e",border:"1.5px solid #a8d5b5",borderRadius:20,cursor:"pointer",fontSize:10.5,fontWeight:600}}>
              Reset filters
            </button>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {/* Search */}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Search</label>
            <div style={{position:"relative"}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a9982" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Claim ID or company…" style={{...iBase,paddingLeft:30,fontSize:12.5}}/>
            </div>
          </div>
          {/* Company filter */}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Insurance Company</label>
            <FSel value={fCo} onChange={e=>setFCo(e.target.value)} style={{fontSize:12.5}}>
              {cos.map(c=><option key={c}>{c}</option>)}
            </FSel>
          </div>
          {/* Risk level filter */}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#7a9982",textTransform:"uppercase",letterSpacing:".08em"}}>Risk Level</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {rls.map(r=>{
                const active=fRl===r;
                const rc=r==="Low"?"#3d8b5e":r==="Medium"?"#c8783a":r==="High"?"#c0392b":r==="Critical"?"#9b59b6":"#3d5247";
                const rbg=r==="Low"?"#d0ead8":r==="Medium"?"#fdecd5":r==="High"?"#fde0de":r==="Critical"?"#f0d0f0":"#f0ede8";
                const rbd=r==="Low"?"#a8d5b5":r==="Medium"?"#f5cc96":r==="High"?"#f5b0ab":r==="Critical"?"#d4a8e8":"#d4eddc";
                return(
                  <button key={r} onClick={()=>setFRl(r)}
                    style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${active?rbd:"#e0d9ce"}`,background:active?rbg:"#f7f3ec",color:active?rc:"#7a9982",fontSize:11,fontWeight:active?700:400,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Footer row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid #f0ede8"}}>
          <span style={{fontSize:11,color:"#7a9982"}}>
            Showing <strong style={{color:"#1c2b22"}}>{filtered.length}</strong> of <strong style={{color:"#1c2b22"}}>{tot}</strong> claims
          </span>
          {onClear&&tot>0&&(
            <button onClick={()=>{if(window.confirm("Clear all claim history?"))onClear();}}
              style={{padding:"5px 14px",background:"#fde0de",color:"#c0392b",border:"1.5px solid #f5b0ab",borderRadius:7,cursor:"pointer",fontSize:11.5,fontWeight:600}}>
              Clear All History
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 16px rgba(26,77,46,.06)"}}>
        {filtered.length===0
          ?<div style={{textAlign:"center",padding:40,color:"#7a9982",fontSize:13}}>No records match your filters.</div>
          :(
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
                <thead>
                  <tr style={{background:"linear-gradient(90deg,#1a4d2e,#2d6a46)"}}>
                    {["Claim ID","Company","Age","Employment","Amount","Type","Date","Risk Score","Risk Level"].map(h=>(
                      <th key={h} style={{padding:"11px 12px",textAlign:"left",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"rgba(255,255,255,.75)",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h,i)=>{
                    const sc=h.riskScore||0;
                    const bc=sc>=70?"#c0392b":sc>=40?"#c8783a":"#3d8b5e";
                    return(
                      <tr key={h.id+i}
                        style={{borderBottom:"1px solid #d4eddc",background:i%2===0?"#fff":"#f7f3ec",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#d4eddc"}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#f7f3ec"}>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:11,color:"#7a9982"}}>{h.id}</td>
                        <td style={{padding:"10px 12px",fontWeight:600,fontSize:12.5,whiteSpace:"nowrap"}}>{h.company}</td>
                        <td style={{padding:"10px 12px",fontSize:12.5,color:"#3d5247"}}>{h.age}</td>
                        <td style={{padding:"10px 12px",fontSize:12,color:"#3d5247",whiteSpace:"nowrap"}}>{h.employment}</td>
                        <td style={{padding:"10px 12px",fontSize:12,color:"#3d5247"}}>{h.claimAmount?`$${h.claimAmount.toLocaleString()}`:"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:12,color:"#3d5247",whiteSpace:"nowrap"}}>{h.claimType||"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:11,color:"#7a9982"}}>{h.date}</td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:38,height:4,background:"#e0d9ce",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                              <div style={{height:"100%",width:`${sc}%`,background:bc,borderRadius:2}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:700,color:bc}}>{sc}%</span>
                          </div>
                        </td>
                        <td style={{padding:"10px 12px"}}><RiskBadge level={h.riskLevel}/></td>
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

// ── HARDCODED DATASET STATS (from dataset_featured.csv, 5000 records) ──────
const DS_COMPANIES=["Aetna","Blue Cross Blue Shield","Centene Corporation","Cigna","Highmark Health","Humana","Kaiser Permanente","Molina Healthcare","Oscar Health","UnitedHealth Group"];
const DS_MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DS_CLAIM_TYPES=["Dental","Emergency","Inpatient","Mental Health","Outpatient","Pharmacy","Preventive","Specialist","Vision"];
const DS_CO_STATS={
  "Aetna":{total:500,rej:104,rate:21},"Blue Cross Blue Shield":{total:500,rej:101,rate:20},
  "Centene Corporation":{total:500,rej:88,rate:18},"Cigna":{total:500,rej:110,rate:22},
  "Highmark Health":{total:500,rej:91,rate:18},"Humana":{total:500,rej:115,rate:23},
  "Kaiser Permanente":{total:500,rej:115,rate:23},"Molina Healthcare":{total:500,rej:111,rate:22},
  "Oscar Health":{total:500,rej:87,rate:17},"UnitedHealth Group":{total:500,rej:118,rate:24}
};
// Company x Month rejection rates
const DS_HM_MONTH={
  "Aetna":[12,15,33,16,19,18,24,17,20,20,22,31],
  "Blue Cross Blue Shield":[9,20,19,10,28,30,32,10,26,20,17,29],
  "Centene Corporation":[17,17,19,19,17,10,24,18,28,12,14,17],
  "Cigna":[15,16,24,21,28,15,25,21,22,25,21,30],
  "Highmark Health":[16,24,21,20,21,13,24,16,17,19,15,17],
  "Humana":[27,16,26,27,18,24,27,16,18,21,31,34],
  "Kaiser Permanente":[24,29,23,20,21,23,18,25,18,26,20,31],
  "Molina Healthcare":[35,15,21,21,8,22,29,27,28,15,18,23],
  "Oscar Health":[17,19,13,19,16,20,17,17,10,17,31,17],
  "UnitedHealth Group":[20,14,37,18,30,23,17,28,29,16,30,24]
};
// Company x ClaimType rejection rates (null = no data)
const DS_HM_TYPE={
  "Aetna":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":24,Outpatient:21,Pharmacy:17,Preventive:22,Specialist:null,Vision:null},
  "Blue Cross Blue Shield":{Dental:25,Emergency:null,Inpatient:18,"Mental Health":null,Outpatient:21,Pharmacy:null,Preventive:17,Specialist:null,Vision:19},
  "Centene Corporation":{Dental:null,Emergency:22,Inpatient:null,"Mental Health":19,Outpatient:14,Pharmacy:11,Preventive:23,Specialist:null,Vision:null},
  "Cigna":{Dental:null,Emergency:20,Inpatient:28,"Mental Health":null,Outpatient:18,Pharmacy:null,Preventive:null,Specialist:22,Vision:null},
  "Highmark Health":{Dental:null,Emergency:24,Inpatient:20,"Mental Health":null,Outpatient:12,Pharmacy:null,Preventive:null,Specialist:16,Vision:null},
  "Humana":{Dental:18,Emergency:null,Inpatient:28,"Mental Health":null,Outpatient:null,Pharmacy:23,Preventive:27,Specialist:null,Vision:21},
  "Kaiser Permanente":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":27,Outpatient:21,Pharmacy:20,Preventive:25,Specialist:null,Vision:null},
  "Molina Healthcare":{Dental:null,Emergency:19,Inpatient:null,"Mental Health":27,Outpatient:22,Pharmacy:24,Preventive:19,Specialist:null,Vision:null},
  "Oscar Health":{Dental:null,Emergency:null,Inpatient:null,"Mental Health":18,Outpatient:18,Pharmacy:18,Preventive:15,Specialist:null,Vision:null},
  "UnitedHealth Group":{Dental:null,Emergency:null,Inpatient:22,"Mental Health":null,Outpatient:26,Pharmacy:null,Preventive:null,Specialist:23,Vision:null}
};

// ── ANALYTICS PAGE ───────────────────────────────────────────
function AnalyticsPage({history}){
  const [hmView,setHmView]=useState("month"); // "month" | "type"
  const [tooltip,setTooltip]=useState(null);
  const [ttPos,setTtPos]=useState({x:0,y:0});
  const [activeCompany,setActiveCompany]=useState(null);

  // ── helper: heatmap color by rejection % ──
  const hmColor=v=>{
    if(v===null)return"#f0ede8";
    if(v<15)return"#c8efd4";
    if(v<20)return"#a8d5b5";
    if(v<25)return"#fdecd5";
    if(v<30)return"#f8c89a";
    return"#faa";
  };
  const hmText=v=>{
    if(v===null)return"#ccc";
    if(v<20)return"#1a4d2e";
    if(v<25)return"#9b5f1a";
    return"#8b1a1a";
  };

  const Card=({children,style={}})=>(
    <div style={{background:"#fff",border:"1.5px solid #d4eddc",borderRadius:14,padding:"18px 20px",boxShadow:"0 2px 16px rgba(26,77,46,.05)",...style}}>
      {children}
    </div>
  );
  const CardTitle=({children,color="#3d8b5e",right=null})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <div style={{width:3,height:14,background:color,borderRadius:2}}/>
      <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color}}>{children}</span>
      {right&&<div style={{marginLeft:"auto"}}>{right}</div>}
    </div>
  );

  // ── company bar data from dataset ──
  const sortedCos=[...DS_COMPANIES].sort((a,b)=>DS_CO_STATS[b].rate-DS_CO_STATS[a].rate);

  return(
    <div className="fu" style={{width:"100%",maxWidth:1160,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

      {/* ── DATASET SOURCE BADGE ── */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"linear-gradient(90deg,#1a4d2e,#2d6a46)",borderRadius:10,color:"rgba(255,255,255,.75)",fontSize:11}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        <span>Dataset: <strong style={{color:"#6dffaa"}}>5,000 historical claims</strong> across 10 insurers · Source: dataset_featured.csv</span>
      </div>

      {/* ── TOP KPI STRIP ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {l:"Total Records",v:"5,000",s:"historical claims",c:"#1a4d2e",bg:"#fff",bd:"#d4eddc"},
          {l:"Avg Rejection Rate",v:"21%",s:"across all insurers",c:"#9b5f1a",bg:"#fdecd5",bd:"#f5cc96"},
          {l:"Highest Rejection",v:"24%",s:"UnitedHealth Group",c:"#c0392b",bg:"#fde0de",bd:"#f5b0ab"},
          {l:"Lowest Rejection",v:"17%",s:"Oscar Health",c:"#1a4d2e",bg:"#d0ead8",bd:"#a8d5b5"},
          {l:"Insurers Tracked",v:"10",s:"major US companies",c:"#5b8fc4",bg:"#ddeaf8",bd:"#a0c4f0"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,border:`1.5px solid ${k.bd}`,borderRadius:12,padding:"13px 15px"}}>
            <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:k.c,opacity:.65,marginBottom:3}}>{k.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:k.c,lineHeight:1.1}}>{k.v}</div>
            <div style={{fontSize:10,color:k.c,opacity:.55,marginTop:2}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: Company bars + Your live data donut ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16}}>

        {/* Company rejection rate bars */}
        <Card>
          <CardTitle color="#5b8fc4">Rejection Rate by Insurance Company (All 10)</CardTitle>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {sortedCos.map((co,i)=>{
              const s=DS_CO_STATS[co];
              const isActive=activeCompany===co;
              const barC=s.rate>=23?"#c0392b":s.rate>=20?"#c8783a":"#3d8b5e";
              return(
                <div key={co} onClick={()=>setActiveCompany(isActive?null:co)}
                  style={{cursor:"pointer",borderRadius:8,padding:"7px 10px",background:isActive?"#f0f7f3":"transparent",border:isActive?"1.5px solid #a8d5b5":"1.5px solid transparent",transition:"all .18s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:"#1c2b22",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{co}</span>
                    <span style={{fontSize:10,color:"#7a9982",flexShrink:0}}>{s.rej}/{s.total}</span>
                    <span style={{fontSize:12,fontWeight:700,color:barC,minWidth:34,textAlign:"right",flexShrink:0}}>{s.rate}%</span>
                  </div>
                  <div style={{height:7,background:"#e0d9ce",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${s.rate/40*100}%`,background:`linear-gradient(90deg,${barC}88,${barC})`,borderRadius:4,transition:"width .8s ease"}}/>
                  </div>
                  {isActive&&(
                    <div style={{marginTop:7,display:"flex",gap:10,flexWrap:"wrap",paddingLeft:2}}>
                      <span style={{fontSize:10.5,color:"#c0392b"}}>⬆ {s.rej} rejected</span>
                      <span style={{fontSize:10.5,color:"#3d8b5e"}}>✓ {s.total-s.rej} approved/processed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Your live claims quick stat */}
        <Card>
          <CardTitle>Your Live Claims</CardTitle>
          {history.length===0
            ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:160,gap:10,textAlign:"center"}}>
               <div style={{width:50,height:50,borderRadius:"50%",background:"#d4eddc",display:"flex",alignItems:"center",justifyContent:"center"}}>
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d8b5e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <div style={{color:"#7a9982",fontSize:12,lineHeight:1.5}}>Submit your first claim from New Entry to see live stats here.</div>
             </div>
            :(()=>{
              const tot=history.length;
              const dist={Low:0,Medium:0,High:0,Critical:0};
              history.forEach(h=>{if(h.riskLevel)dist[h.riskLevel]=(dist[h.riskLevel]||0)+1;});
              const dColors={Low:"#3d8b5e",Medium:"#c8783a",High:"#c0392b",Critical:"#9b59b6"};
              const avg=Math.round(history.reduce((s,h)=>s+(h.riskScore||0),0)/tot);
              return(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{textAlign:"center",padding:"8px 0"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:"#1a4d2e"}}>{tot}</div>
                    <div style={{fontSize:10,color:"#7a9982",textTransform:"uppercase",letterSpacing:".07em"}}>claims submitted</div>
                  </div>
                  <div style={{textAlign:"center",padding:"4px 0",background:"#fdecd5",borderRadius:8}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#9b5f1a"}}>{avg}%</div>
                    <div style={{fontSize:10,color:"#9b5f1a",opacity:.7}}>avg risk score</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {Object.entries(dist).filter(([,n])=>n>0).map(([k,n])=>(
                      <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:8,height:8,borderRadius:2,background:dColors[k]}}/>
                          <span style={{fontSize:11,color:"#3d5247"}}>{k}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:dColors[k]}}>{n} <span style={{fontWeight:400,color:"#7a9982"}}>({Math.round(n/tot*100)}%)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          }
        </Card>
      </div>

      {/* ── HEATMAP SECTION ── */}
      <Card>
        <CardTitle color="#9b5f1a"
          right={
            <div style={{display:"flex",background:"#f0ede8",borderRadius:8,overflow:"hidden",border:"1.5px solid #e0d9ce"}}>
              {[{id:"month",label:"By Month"},{id:"type",label:"By Claim Type"}].map(tab=>(
                <button key={tab.id} onClick={()=>setHmView(tab.id)}
                  style={{padding:"5px 14px",fontSize:11,fontWeight:hmView===tab.id?700:400,background:hmView===tab.id?"#1a4d2e":"transparent",color:hmView===tab.id?"#fff":"#7a9982",border:"none",cursor:"pointer",transition:"all .18s"}}>
                  {tab.label}
                </button>
              ))}
            </div>
          }>
          Denial Heatmap — {hmView==="month"?"All 10 Insurers × Month":"All 10 Insurers × Claim Type"}
        </CardTitle>

        <div style={{fontSize:11,color:"#7a9982",marginBottom:14}}>
          {hmView==="month"
            ?"Rejection rate (%) per insurer per calendar month. Spot seasonal spikes — darker red = higher denial risk."
            :"Rejection rate (%) per insurer per claim type. Grey = this insurer doesn't offer this claim type in the dataset."
          }
        </div>

        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",position:"relative"}}>
          <table style={{borderCollapse:"separate",borderSpacing:3,minWidth:hmView==="month"?700:640}}>
            <thead>
              <tr>
                <th style={{padding:"4px 10px",fontSize:9,textTransform:"uppercase",letterSpacing:".06em",color:"#7a9982",textAlign:"left",minWidth:140,position:"sticky",left:0,background:"#fff",zIndex:2}}/>
                {(hmView==="month"?DS_MONTHS:DS_CLAIM_TYPES).map(col=>(
                  <th key={col} style={{padding:"4px 5px",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:"#3d5247",textAlign:"center",minWidth:hmView==="month"?52:72,whiteSpace:"nowrap"}}>{col}</th>
                ))}
                <th style={{padding:"4px 8px",fontSize:9,color:"#7a9982",textAlign:"center",minWidth:44}}>AVG</th>
              </tr>
            </thead>
            <tbody>
              {DS_COMPANIES.map(co=>{
                const vals=hmView==="month"
                  ?DS_HM_MONTH[co]
                  :DS_CLAIM_TYPES.map(ct=>DS_HM_TYPE[co][ct]);
                const validVals=vals.filter(v=>v!==null);
                const rowAvg=validVals.length?Math.round(validVals.reduce((s,v)=>s+v,0)/validVals.length):null;
                return(
                  <tr key={co}>
                    <td style={{padding:"3px 10px 3px 2px",fontSize:11,fontWeight:600,color:"#1c2b22",whiteSpace:"nowrap",position:"sticky",left:0,background:"#fff",zIndex:1}} title={co}>
                      {co.length>18?co.substring(0,16)+"…":co}
                    </td>
                    {vals.map((v,ci)=>{
                      const colLabel=hmView==="month"?DS_MONTHS[ci]:DS_CLAIM_TYPES[ci];
                      return(
                        <td key={ci}
                          style={{background:hmColor(v),borderRadius:5,padding:hmView==="month"?"7px 3px":"8px 3px",textAlign:"center",cursor:v!==null?"pointer":"default",transition:"transform .1s,box-shadow .1s"}}
                          onMouseEnter={e=>{
                            if(v!==null){e.currentTarget.style.transform="scale(1.12)";e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,.2)";e.currentTarget.style.zIndex="10";}
                            const r=e.currentTarget.getBoundingClientRect();
                            setTtPos({x:r.left+r.width/2,y:r.top-8});
                            setTooltip({co,col:colLabel,v,n:null});
                          }}
                          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.zIndex="";setTooltip(null);}}>
                          {v!==null
                            ?<span style={{fontSize:10.5,fontWeight:700,color:hmText(v)}}>{v}%</span>
                            :<span style={{fontSize:10,color:"#d0cdc8"}}>—</span>
                          }
                        </td>
                      );
                    })}
                    <td style={{padding:"7px 5px",textAlign:"center",background:rowAvg?hmColor(rowAvg)+"88":"transparent",borderRadius:5}}>
                      {rowAvg!==null&&<span style={{fontSize:11,fontWeight:700,color:hmText(rowAvg)}}>{rowAvg}%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:14,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#7a9982",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Rejection rate:</span>
          {[{label:"<15%",c:"#c8efd4",t:"#1a4d2e"},{label:"15–20%",c:"#a8d5b5",t:"#1a4d2e"},{label:"20–25%",c:"#fdecd5",t:"#9b5f1a"},{label:"25–30%",c:"#f8c89a",t:"#9b5f1a"},{label:">30%",c:"#faa",t:"#8b1a1a"},{label:"No data",c:"#f0ede8",t:"#ccc"}].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:13,height:13,borderRadius:3,background:l.c,border:"1px solid rgba(0,0,0,.08)"}}/>
              <span style={{fontSize:10,color:"#7a9982"}}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── ROW 4: Monthly trend lines per company ── */}
      <Card>
        <CardTitle color="#5b8fc4">Monthly Rejection Trend — All Insurers</CardTitle>
        <div style={{fontSize:11,color:"#7a9982",marginBottom:14}}>Each line = one insurer's rejection rate across Jan–Dec. Click a company bar above to highlight.</div>
        {(()=>{
          const W=680,H=160,padL=28,padR=10,padT=10,padB=20;
          const months=12;
          const allVals=DS_COMPANIES.flatMap(co=>DS_HM_MONTH[co]);
          const maxV=Math.max(...allVals);
          const xScale=i=>padL+(i/(months-1))*(W-padL-padR);
          const yScale=v=>H-padB-(v/maxV)*(H-padT-padB);
          const coColors=["#3d8b5e","#5b8fc4","#c8783a","#9b59b6","#c0392b","#2d9e9e","#d4a020","#7a5230","#5a9e5a","#8b4a8b"];
          return(
            <div style={{overflowX:"auto"}}>
              <svg width={W} height={H} style={{display:"block"}}>
                {/* Grid */}
                {[10,20,30,40].map(v=>{
                  const y=yScale(v);
                  return <g key={v}>
                    <line x1={padL} x2={W-padR} y1={y} y2={y} stroke="#e8e4de" strokeWidth="1" strokeDasharray="3 3"/>
                    <text x={padL-4} y={y+3} textAnchor="end" fontSize="7.5" fill="#aaa">{v}%</text>
                  </g>;
                })}
                {/* Month labels */}
                {DS_MONTHS.map((m,i)=>(
                  <text key={m} x={xScale(i)} y={H-4} textAnchor="middle" fontSize="8" fill="#aaa">{m}</text>
                ))}
                {/* Lines */}
                {DS_COMPANIES.map((co,ci)=>{
                  const vals=DS_HM_MONTH[co];
                  const pts=vals.map((v,i)=>({x:xScale(i),y:yScale(v)}));
                  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  const isActive=activeCompany===co;
                  const c=coColors[ci];
                  return(
                    <g key={co}>
                      <path d={d} fill="none" stroke={c} strokeWidth={isActive?2.5:1.2} opacity={activeCompany&&!isActive?.25:1} strokeLinejoin="round"/>
                      {isActive&&pts.map((p,i)=>(
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill={c} stroke="#fff" strokeWidth="1.5"/>
                      ))}
                    </g>
                  );
                })}
              </svg>
              {/* Legend */}
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",marginTop:8}}>
                {DS_COMPANIES.map((co,ci)=>(
                  <button key={co} onClick={()=>setActiveCompany(activeCompany===co?null:co)}
                    style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",borderRadius:4,background:activeCompany===co?"#f0f7f3":"transparent"}}>
                    <div style={{width:16,height:3,borderRadius:2,background:coColors[ci]}}/>
                    <span style={{fontSize:10,color:activeCompany===co?"#1a4d2e":"#7a9982",fontWeight:activeCompany===co?700:400}}>{co}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Tooltip */}
      {tooltip&&(
        <div style={{position:"fixed",pointerEvents:"none",zIndex:9999,background:"#1c2b22",color:"#fff",borderRadius:8,padding:"8px 13px",fontSize:11.5,boxShadow:"0 4px 20px rgba(0,0,0,.3)",left:ttPos.x,top:ttPos.y,transform:"translate(-50%,-100%)",whiteSpace:"nowrap"}}>
          <strong>{tooltip.co}</strong> · {tooltip.col}<br/>
          Rejection rate: <strong style={{color:tooltip.v>=30?"#faa":tooltip.v>=25?"#f8c89a":tooltip.v>=20?"#fdecd5":"#c8efd4"}}>{tooltip.v}%</strong>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("entry");
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [history,setHistory]=useState(()=>{
    try{const s=localStorage.getItem("rcm_claim_history");return s?JSON.parse(s):[];}
    catch{return[];}
  });
  const addH=e=>setHistory(p=>{const n=[e,...p];try{localStorage.setItem("rcm_claim_history",JSON.stringify(n));}catch{}return n;});

  const nav=[
    {id:"entry",label:"New Entry",
     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>},
    {id:"analytics",label:"Insights",
     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>},
    {id:"history",label:"Claim History",
     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>},
  ];

  const goPage=(id)=>{setPage(id);setMobileOpen(false);};

  return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",position:"relative"}}>

        {/* Mobile overlay */}
        <div className="overlay" onClick={()=>setMobileOpen(false)}
          style={{display:"none",position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:99,backdropFilter:"blur(2px)"}}
          ref={el=>{if(el)el.style.display=mobileOpen?"block":"none"}}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar${mobileOpen?" open":""}`}
          style={{width:collapsed?"var(--swc)":"var(--sw)",minWidth:collapsed?"var(--swc)":"var(--sw)",background:"linear-gradient(180deg,#1a4d2e 0%,#0f3320 100%)",display:"flex",flexDirection:"column",transition:"width .28s cubic-bezier(.4,0,.2,1),min-width .28s cubic-bezier(.4,0,.2,1)",overflow:"hidden",boxShadow:"4px 0 28px rgba(10,30,16,.4)",zIndex:100,flexShrink:0}}>

          {/* Brand */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 12px 12px",minHeight:62}}>
            <div style={{display:"flex",alignItems:"center",gap:10,overflow:"hidden",flex:1}}>
              <div style={{width:34,height:34,minWidth:34,background:"rgba(168,213,181,.18)",border:"1px solid rgba(168,213,181,.28)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",color:"#a8d5b5",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              {!collapsed&&(
                <div style={{overflow:"hidden",minWidth:0}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#fff",whiteSpace:"nowrap",fontWeight:600,letterSpacing:".01em"}}>Re-Medi</div>
                  <div style={{fontSize:9,color:"rgba(168,213,181,.5)",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".07em"}}>RCM Predictor</div>
                </div>
              )}
            </div>
            <button onClick={()=>setCollapsed(!collapsed)}
              style={{width:22,height:22,minWidth:22,border:"none",background:"rgba(255,255,255,.1)",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.55)",flexShrink:0}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:collapsed?"rotate(180deg)":"rotate(0)",transition:"transform .28s"}}><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>

          <div style={{height:1,background:"rgba(168,213,181,.14)",margin:"0 12px"}}/>

          {/* Nav */}
          <nav style={{padding:"12px 7px",flex:1,display:"flex",flexDirection:"column",gap:2}}>
            {!collapsed&&<span style={{fontSize:9,fontWeight:800,color:"rgba(168,213,181,.3)",textTransform:"uppercase",letterSpacing:".12em",padding:"0 7px 8px"}}>Navigation</span>}
            {nav.map(n=>(
              <button key={n.id} onClick={()=>goPage(n.id)} title={collapsed?n.label:""}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 9px",border:"none",background:page===n.id?"rgba(168,213,181,.18)":"transparent",borderRadius:7,cursor:"pointer",color:page===n.id?"#a8d5b5":"rgba(255,255,255,.5)",fontSize:13,fontWeight:page===n.id?600:400,width:"100%",textAlign:"left",transition:"all .18s",whiteSpace:"nowrap",overflow:"hidden"}}>
                <span style={{display:"flex",minWidth:16,flexShrink:0}}>{n.icon}</span>
                {!collapsed&&(
                  <>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis"}}>{n.label}</span>
                    {n.id==="history"&&history.length>0&&(
                      <span style={{background:"rgba(109,255,170,.15)",color:"#6dffaa",padding:"1px 6px",borderRadius:9,fontSize:10,fontWeight:700,flexShrink:0}}>{history.length}</span>
                    )}
                    {n.id==="entry"&&page==="entry"&&(
                      <span style={{background:"rgba(109,255,170,.15)",color:"#6dffaa",padding:"1px 6px",borderRadius:9,fontSize:10,fontWeight:700,flexShrink:0}}>●</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{padding:"8px 7px 14px"}}>
            <div style={{height:1,background:"rgba(168,213,181,.14)",margin:"0 5px 10px"}}/>
            {!collapsed&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 7px 8px",fontSize:9.5,color:"rgba(168,213,181,.3)",whiteSpace:"nowrap"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:"#6dffaa",boxShadow:"0 0 6px #6dffaa",animation:"pulse 2s ease infinite",flexShrink:0}}/>
                Model v1.0 · Glitchcon 2026
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:7,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.5)",fontSize:12,overflow:"hidden",whiteSpace:"nowrap"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {!collapsed&&<span>Analyst</span>}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0,background:"#f7f3ec"}}>

          {/* Topbar */}
          <header style={{height:56,minHeight:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",background:"#fff",borderBottom:"1.5px solid #d4eddc",boxShadow:"0 1px 8px rgba(26,77,46,.05)",gap:10,flexShrink:0}}>
            <button className="topbar-menu-btn" onClick={()=>setMobileOpen(!mobileOpen)}
              style={{display:"none",width:32,height:32,border:"none",background:"#d4eddc",borderRadius:7,cursor:"pointer",alignItems:"center",justifyContent:"center",color:"#1a4d2e",flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(15px,3vw,18px)",color:"#1c2b22",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {page==="entry"?"New Claim Entry":page==="analytics"?"Insights":"Claim History"}
              </div>
              <div style={{fontSize:10,color:"#7a9982"}}>RCM Predict / {page==="entry"?"Entry":page==="analytics"?"Insights":"History"}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",background:"#d4eddc",border:"1.5px solid #a8d5b5",borderRadius:18,fontSize:11.5,color:"#1a4d2e",fontWeight:600,whiteSpace:"nowrap"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#3d8b5e",boxShadow:"0 0 5px #3d8b5e",animation:"pulse 2s ease infinite"}}/>
                ML Model Active
              </div>
              {page==="history"&&history.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",background:"#ddeaf8",border:"1.5px solid #a0c4f0",borderRadius:18,fontSize:11.5,color:"#1a4d7a",fontWeight:600,whiteSpace:"nowrap"}}>
                  {history.length} Claims
                </div>
              )}
            </div>
          </header>

          {/* Body */}
          <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"clamp(14px,3vw,24px) clamp(14px,3vw,26px)"}}>
            {page==="entry"&&<EntryPage onSubmit={addH}/>}
            {page==="analytics"&&<AnalyticsPage history={history}/>}
            {page==="history"&&<HistoryPage history={history} onClear={()=>{setHistory([]);try{localStorage.removeItem("rcm_claim_history");}catch{}}}/>}
          </div>
        </main>
      </div>
    </>
  );
}
