<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>DenyShield — RCM Denial Prediction Engine</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.12.7/Recharts.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#05080f;--bg1:#080d18;--bg2:#0b1220;--bg3:#0e1a2e;
    --border:#112035;--border2:#1c3655;
    --text:#c4d4e8;--muted:#3d5a7a;--muted2:#5a7a9a;
    --accent:#22d3ee;--accent2:#0ea5e9;
    --red:#f43f5e;--orange:#fb923c;--green:#34d399;
    --purple:#a78bfa;--yellow:#fbbf24;
  }
  html{font-size:13px}
  body{
    font-family:'IBM Plex Mono',monospace;
    background:var(--bg);color:var(--text);
    min-height:100vh;overflow-x:hidden;
  }
  body::before{
    content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
    background-image:
      linear-gradient(rgba(34,211,238,.022) 1px,transparent 1px),
      linear-gradient(90deg,rgba(34,211,238,.022) 1px,transparent 1px);
    background-size:38px 38px;
  }
  #root{position:relative;z-index:1}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:var(--bg1)}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
  select option{background:var(--bg2)}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState, useEffect, useRef, useCallback} = React;
const {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} = Recharts;

/* ─── DATA ─────────────────────────────────────────────────────────── */
const MONTHLY = [
  {m:'Aug',denials:412,submitted:1200,revenue:124000},
  {m:'Sep',denials:398,submitted:1150,revenue:119400},
  {m:'Oct',denials:445,submitted:1320,revenue:133500},
  {m:'Nov',denials:380,submitted:1280,revenue:114000},
  {m:'Dec',denials:361,submitted:1190,revenue:108300},
  {m:'Jan',denials:312,submitted:1240,revenue:93600},
  {m:'Feb',denials:287,submitted:1310,revenue:86100},
];

const REASONS = [
  {name:'No Authorization',  value:35, color:'#f43f5e'},
  {name:'Incomplete Docs',   value:25, color:'#fb923c'},
  {name:'Timely Filing',     value:18, color:'#fbbf24'},
  {name:'Coding Error',      value:12, color:'#22d3ee'},
  {name:'Missing Modifier',  value:10, color:'#a78bfa'},
];

const PAYER_DENIAL = [
  {payer:'Medicaid',    rate:42},
  {payer:'Medicare',    rate:38},
  {payer:'UnitedHealth',rate:35},
  {payer:'Cigna',       rate:31},
  {payer:'Aetna',       rate:28},
  {payer:'Humana',      rate:24},
  {payer:'BlueCross',   rate:21},
];

const PROC_DENIAL = [
  {code:'27447 – Knee Repl.',  rate:41},
  {code:'70553 – MRI Brain',   rate:38},
  {code:'99291 – Critical Care',rate:35},
  {code:'45378 – Colonoscopy', rate:30},
  {code:'99283 – ED Visit',    rate:28},
  {code:'71046 – Chest X-Ray', rate:22},
  {code:'93000 – EKG',         rate:15},
  {code:'99214 – Office Visit',rate:12},
];

const INS_DENIAL = [
  {type:'Medicaid',rate:42,color:'#f43f5e'},
  {type:'Medicare', rate:38,color:'#fb923c'},
  {type:'HMO',     rate:34,color:'#fbbf24'},
  {type:'EPO',     rate:31,color:'#22d3ee'},
  {type:'PPO',     rate:26,color:'#34d399'},
  {type:'HDHP',    rate:22,color:'#a78bfa'},
  {type:'POS',     rate:19,color:'#60a5fa'},
];

const FEAT_IMP = [
  {feat:'Auth Present',     imp:26.2},
  {feat:'Claim Amount',     imp:17.5},
  {feat:'Days Since Svc',   imp:10.8},
  {feat:'Docs Complete',    imp:9.0},
  {feat:'Patient Age',      imp:6.8},
  {feat:'Provider ID',      imp:5.4},
  {feat:'Prior Denials',    imp:4.1},
  {feat:'Timely Filing',    imp:3.9},
];

const CLAIMS = [
  {id:'CLM-0091',payer:'Medicaid',    proc:'27447',provider:'PRV0014',amount:12400,risk:0.82,level:'HIGH',  auth:false,docs:false},
  {id:'CLM-0204',payer:'UnitedHealth',proc:'99291',provider:'PRV0033',amount:3200, risk:0.71,level:'HIGH',  auth:false,docs:true},
  {id:'CLM-0317',payer:'Cigna',       proc:'70553',provider:'PRV0007',amount:5800, risk:0.64,level:'HIGH',  auth:true, docs:false},
  {id:'CLM-0428',payer:'Aetna',       proc:'99214',provider:'PRV0021',amount:850,  risk:0.48,level:'MEDIUM',auth:true, docs:false},
  {id:'CLM-0535',payer:'Medicare',    proc:'45378',provider:'PRV0042',amount:2100, risk:0.44,level:'MEDIUM',auth:false,docs:true},
  {id:'CLM-0619',payer:'BlueCross',   proc:'93000',provider:'PRV0018',amount:320,  risk:0.29,level:'MEDIUM',auth:true, docs:true},
  {id:'CLM-0724',payer:'Humana',      proc:'99213',provider:'PRV0009',amount:180,  risk:0.14,level:'LOW',   auth:true, docs:true},
  {id:'CLM-0831',payer:'BlueCross',   proc:'71046',provider:'PRV0031',amount:440,  risk:0.11,level:'LOW',   auth:true, docs:true},
  {id:'CLM-0942',payer:'Aetna',       proc:'99213',provider:'PRV0005',amount:210,  risk:0.08,level:'LOW',   auth:true, docs:true},
];

const ACTIONS = {
  'No Auth':       {icon:'🔐', text:'Obtain prior authorization from payer portal. Required for procedures 27447, 70553, 99291.'},
  'Missing Docs':  {icon:'📋', text:'Attach clinical notes, referral letters, and lab results. Verify payer-specific requirements.'},
  'Timely Filing': {icon:'⏱',  text:'Submit claim immediately or file appeal with proof of timely filing if deadline was missed.'},
  'No Modifier':   {icon:'🏷', text:'Attach appropriate modifier (-25, -59, -GT). Verify acceptance with this payer.'},
  'High Prior Denials':{icon:'📊', text:'Review denial history for this payer/procedure. Consider peer-to-peer review with payer.'},
};

/* ─── HELPERS ──────────────────────────────────────────────────────── */
const C = {
  bg:'#05080f', bg1:'#080d18', bg2:'#0b1220', bg3:'#0e1a2e',
  border:'#112035', border2:'#1c3655',
  text:'#c4d4e8', muted:'#3d5a7a', muted2:'#5a7a9a',
  accent:'#22d3ee', red:'#f43f5e', orange:'#fb923c',
  green:'#34d399', purple:'#a78bfa', yellow:'#fbbf24',
};

const riskColor = l => l==='HIGH' ? C.red : l==='MEDIUM' ? C.orange : C.green;

const ttStyle = {
  background:C.bg2, border:`1px solid ${C.border2}`,
  borderRadius:8, fontSize:11, fontFamily:'IBM Plex Mono',
  color:C.text,
};

function SectionTitle({children}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,
      fontSize:10,color:C.muted,letterSpacing:'.14em',marginBottom:18}}>
      <div style={{width:3,height:14,background:C.accent,borderRadius:2,flexShrink:0}}/>
      {children}
    </div>
  );
}

function Card({children, style={}, noPad=false}) {
  return (
    <div style={{
      background:C.bg1, border:`1px solid ${C.border}`,
      borderRadius:11, padding: noPad ? 0 : 20,
      overflow: noPad ? 'hidden' : undefined, ...style
    }}>{children}</div>
  );
}

function CardTitle({children}) {
  return <div style={{fontSize:10,color:C.muted,letterSpacing:'.1em',marginBottom:16}}>{children}</div>;
}

function Badge({level}) {
  const colors = {
    HIGH:  {bg:'rgba(244,63,94,.12)',  color:C.red,    border:'rgba(244,63,94,.25)'},
    MEDIUM:{bg:'rgba(251,146,60,.12)', color:C.orange, border:'rgba(251,146,60,.25)'},
    LOW:   {bg:'rgba(52,211,153,.12)', color:C.green,  border:'rgba(52,211,153,.25)'},
  };
  const s = colors[level]||colors.LOW;
  return (
    <span style={{
      display:'inline-block', padding:'3px 11px', borderRadius:10,
      fontSize:10, fontWeight:600, letterSpacing:'.06em',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }}>{level}</span>
  );
}

function HBar({label, val, max, color}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
      <div style={{fontSize:11,color:C.muted2,width:110,flexShrink:0,textAlign:'right',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
      <div style={{flex:1,height:8,background:C.bg3,borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:4,width:`${(val/max)*100}%`,background:color,
          transition:'width .8s cubic-bezier(.22,1,.36,1)'}}/>
      </div>
      <div style={{fontSize:11,color:color,width:36,flexShrink:0,textAlign:'right'}}>{val}%</div>
    </div>
  );
}

/* ─── OVERVIEW ─────────────────────────────────────────────────────── */
function Overview() {
  const stats = [
    {label:'TOTAL CLAIMS (MTD)', value:'1,310', delta:'+8.4% vs last month',   color:C.accent,  icon:'📄'},
    {label:'DENIAL RATE',        value:'30.6%', delta:'▼ 3.2% improvement',    color:C.red,     icon:'🚫'},
    {label:'HIGH RISK CLAIMS',   value:'124',   delta:'Flagged for review',     color:C.orange,  icon:'⚠️'},
    {label:'REVENUE AT RISK',    value:'$284K', delta:'▼ $18K vs last month',  color:C.yellow,  icon:'💰'},
    {label:'PREVENTION SAVES',   value:'$96K',  delta:'+$14K recovered',        color:C.green,   icon:'✅'},
    {label:'MODEL AUC SCORE',    value:'0.682', delta:'GBM · 70.4% accuracy',  color:C.purple,  icon:'🤖'},
  ];
  return (
    <div>
      <SectionTitle>OPERATIONAL OVERVIEW</SectionTitle>

      {/* stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
        {stats.map(s=>(
          <Card key={s.label} style={{cursor:'default',transition:'all .22s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=C.border2}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor=C.border}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:'.08em'}}>{s.label}</div>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:30,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted2,marginTop:5}}>{s.delta}</div>
          </Card>
        ))}
      </div>

      {/* charts row */}
      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:18,marginBottom:18}}>
        <Card>
          <CardTitle>MONTHLY DENIAL TREND</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY} margin={{top:5,right:10,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="m"  tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={ttStyle}/>
              <Area type="monotone" dataKey="denials" stroke={C.red} fill="url(#dg)" strokeWidth={2}
                dot={{fill:C.red,r:3,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>DENIAL REASONS</CardTitle>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={REASONS} cx="50%" cy="50%" innerRadius={42} outerRadius={70}
                  dataKey="value" paddingAngle={3}>
                  {REASONS.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={ttStyle}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {REASONS.map(r=>(
                <div key={r.name} style={{display:'flex',alignItems:'center',gap:8,fontSize:11}}>
                  <div style={{width:9,height:9,borderRadius:2,background:r.color,flexShrink:0}}/>
                  <span style={{color:C.muted2,flex:1}}>{r.name}</span>
                  <span style={{color:r.color,fontWeight:600}}>{r.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>DENIAL RATE BY PAYER</CardTitle>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={PAYER_DENIAL} layout="vertical" margin={{top:0,right:40,left:10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
            <XAxis type="number" domain={[0,50]} tick={{fill:C.muted,fontSize:11}}
              axisLine={false} tickLine={false} unit="%"/>
            <YAxis type="category" dataKey="payer" tick={{fill:C.muted2,fontSize:11}}
              axisLine={false} tickLine={false} width={82}/>
            <Tooltip contentStyle={ttStyle} formatter={v=>[`${v}%`,'Denial Rate']}/>
            <Bar dataKey="rate" radius={[0,4,4,0]} maxBarSize={14}>
              {PAYER_DENIAL.map((e,i)=>(
                <Cell key={i} fill={e.rate>35?C.red:e.rate>28?C.orange:C.accent}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ─── PREDICT ──────────────────────────────────────────────────────── */
const INIT_FORM = {
  payer:'Aetna', procedure_code:'99214', insurance_type:'HMO',
  patient_age:45, claim_amount:850, days_since_service:10, prior_denial_count:0,
  authorization_present:true, documentation_complete:true,
  modifier_present:true, referral_present:true, timely_filing:true,
};

function Predict() {
  const [form, setForm] = useState(INIT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const setField = (k,v) => setForm(f=>({...f,[k]:v}));

  const runPrediction = () => {
    setLoading(true); setResult(null);
    setTimeout(()=>{
      const {authorization_present:auth, documentation_complete:docs,
        timely_filing:filing, modifier_present:mod,
        referral_present:ref, prior_denial_count:pd,
        days_since_service:days, payer, procedure_code:proc} = form;

      let score = 0.05
        +(auth?0:0.30) +(docs?0:0.22) +(filing?0:0.15)
        +(pd/10)*0.12  +(mod?0:0.08)  +(days/365)*0.05
        +(['Medicaid','Medicare'].includes(payer)?0.05:0)
        +(['27447','70553','99291'].includes(proc)?0.04:0)
        +(ref?0:0.03);
      score = Math.min(0.97, Math.max(0.03, score+(Math.random()*.06-.03)));
      const level = score>=0.60?'HIGH':score>=0.30?'MEDIUM':'LOW';

      const factors=[];
      if(!auth)    factors.push('No Auth');
      if(!docs)    factors.push('Missing Docs');
      if(!filing)  factors.push('Timely Filing');
      if(!mod)     factors.push('No Modifier');
      if(pd>=3)    factors.push('High Prior Denials');

      setResult({score, level, factors});
      setLoading(false);
    }, 900);
  };

  const iStyle = {
    width:'100%', background:C.bg, border:`1px solid ${C.border}`,
    borderRadius:7, color:C.text, padding:'9px 12px', fontSize:12,
    fontFamily:'IBM Plex Mono,monospace', outline:'none',
  };
  const lblStyle = {display:'block',fontSize:10,color:C.muted,letterSpacing:'.08em',marginBottom:5};

  const selects = [
    {k:'payer',label:'PAYER',opts:['Aetna','UnitedHealth','BlueCross','Cigna','Humana','Medicare','Medicaid']},
    {k:'procedure_code',label:'PROCEDURE CODE',opts:['99213','99214','99232','27447','71046','93000','99283','45378','70553','99291']},
    {k:'insurance_type',label:'INSURANCE TYPE',opts:['HMO','PPO','EPO','POS','HDHP']},
  ];
  const nums = [
    {k:'patient_age',label:'PATIENT AGE'},
    {k:'claim_amount',label:'CLAIM AMOUNT ($)'},
    {k:'days_since_service',label:'DAYS SINCE SERVICE'},
    {k:'prior_denial_count',label:'PRIOR DENIAL COUNT'},
  ];
  const toggles = [
    {k:'authorization_present',label:'Prior Authorization'},
    {k:'documentation_complete',label:'Documentation Complete'},
    {k:'modifier_present',label:'Modifier Present'},
    {k:'referral_present',label:'Referral Present'},
    {k:'timely_filing',label:'Timely Filing'},
  ];

  const rc = result ? riskColor(result.level) : C.accent;
  const pct = result ? Math.round(result.score*100) : 0;

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
      {/* LEFT — form */}
      <div>
        <SectionTitle>CLAIM RISK PREDICTOR</SectionTitle>
        <Card>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginBottom:16}}>
            {selects.map(f=>(
              <div key={f.k}>
                <label style={lblStyle}>{f.label}</label>
                <select value={form[f.k]} onChange={e=>setField(f.k,e.target.value)} style={iStyle}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {nums.map(f=>(
              <div key={f.k}>
                <label style={lblStyle}>{f.label}</label>
                <input type="number" value={form[f.k]}
                  onChange={e=>setField(f.k, parseFloat(e.target.value)||0)} style={iStyle}/>
              </div>
            ))}
          </div>

          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,letterSpacing:'.08em',marginBottom:12}}>COMPLIANCE FLAGS</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {toggles.map(f=>(
                <div key={f.k} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:12,color:C.muted2}}
                  onClick={()=>setField(f.k,!form[f.k])}>
                  <div style={{
                    width:38,height:21,borderRadius:11,position:'relative',flexShrink:0,
                    background:form[f.k]?'rgba(52,211,153,.2)':C.bg3,
                    border:`1px solid ${form[f.k]?C.green:C.border}`,
                    transition:'all .2s', cursor:'pointer',
                  }}>
                    <div style={{
                      position:'absolute',top:3,
                      left:form[f.k]?20:3,
                      width:13,height:13,borderRadius:'50%',
                      background:form[f.k]?C.green:C.muted,
                      transition:'left .2s, background .2s',
                    }}/>
                  </div>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runPrediction}
            disabled={loading}
            style={{
              width:'100%',padding:13,background:C.bg2,
              border:`1px solid ${C.border2}`,borderRadius:9,
              color:C.accent,fontFamily:'IBM Plex Mono,monospace',
              fontSize:11,letterSpacing:'.12em',cursor:loading?'not-allowed':'pointer',
              transition:'all .2s', opacity:loading?.6:1,
            }}
            onMouseEnter={e=>{if(!loading){e.target.style.background=C.accent;e.target.style.color=C.bg}}}
            onMouseLeave={e=>{e.target.style.background=C.bg2;e.target.style.color=C.accent}}>
            {loading ? 'ANALYZING CLAIM...' : '▶  RUN DENIAL PREDICTION'}
          </button>
        </Card>
      </div>

      {/* RIGHT — result */}
      <div>
        <SectionTitle>PREDICTION RESULT</SectionTitle>

        {!result && !loading && (
          <div style={{
            background:C.bg1,border:`1px dashed ${C.border}`,borderRadius:11,
            padding:'56px 20px',textAlign:'center',color:C.muted,
          }}>
            <div style={{fontSize:44,marginBottom:14}}>🔍</div>
            <div style={{fontSize:11,lineHeight:1.8}}>
              Fill in the claim details<br/>and run the prediction to see<br/>denial risk analysis &amp; corrective actions.
            </div>
          </div>
        )}

        {loading && (
          <Card style={{padding:'56px 20px',textAlign:'center'}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:'.1em',
              animation:'pulse 1s infinite'}}>RUNNING ML INFERENCE...</div>
            <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
          </Card>
        )}

        {result && !loading && (
          <Card style={{border:`1px solid ${rc}33`}}>
            {/* score */}
            <div style={{textAlign:'center',marginBottom:22}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:'.12em',marginBottom:8}}>DENIAL RISK SCORE</div>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:80,fontWeight:800,lineHeight:1,color:rc}}>
                {pct}%
              </div>
              <div style={{marginTop:12}}><Badge level={result.level}/></div>
            </div>

            {/* bar */}
            <div style={{marginBottom:20}}>
              <div style={{height:9,background:C.bg3,borderRadius:5,overflow:'hidden',marginBottom:5}}>
                <div style={{height:'100%',borderRadius:5,width:`${pct}%`,
                  background:`linear-gradient(90deg,${C.green},${rc})`,
                  transition:'width 1s cubic-bezier(.22,1,.36,1)'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.muted}}>
                <span>LOW</span><span>MEDIUM</span><span>HIGH</span>
              </div>
            </div>

            {/* recommendation */}
            <div style={{
              background:`${rc}11`,border:`1px solid ${rc}33`,
              borderRadius:8,padding:'12px 14px',marginBottom:18,fontSize:12,color:rc,
            }}>
              {result.level==='HIGH' ? '🚫 Block claim — requires review before submission'
                :result.level==='MEDIUM' ? '⚠️ Flag for pre-submission audit'
                :'✅ Clear for submission'}
            </div>

            {/* actions */}
            {result.factors.length===0 && (
              <div style={{textAlign:'center',color:C.green,fontSize:12,padding:10}}>
                ✓ No critical risk factors detected
              </div>
            )}
            {result.factors.length>0 && (
              <>
                <div style={{fontSize:10,color:C.muted,letterSpacing:'.08em',marginBottom:10}}>
                  CORRECTIVE ACTIONS
                </div>
                {result.factors.map(f=>{
                  const a=ACTIONS[f]||{icon:'⚠️',text:'Review this factor before submission.'};
                  return (
                    <div key={f} style={{
                      background:C.bg,border:`1px solid ${C.border}`,
                      borderRadius:8,padding:'12px 14px',marginBottom:8,
                    }}>
                      <div style={{fontSize:12,color:C.orange,marginBottom:4}}>{a.icon} {f}</div>
                      <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>{a.text}</div>
                    </div>
                  );
                })}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── CLAIMS QUEUE ─────────────────────────────────────────────────── */
function ClaimsQueue() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <SectionTitle>PENDING CLAIMS QUEUE · {CLAIMS.length} CLAIMS</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 360px':'1fr',gap:18}}>
        <Card noPad>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:C.bg,borderBottom:`1px solid ${C.border}`}}>
                {['CLAIM ID','PAYER','PROCEDURE','PROVIDER','AMOUNT','RISK SCORE','LEVEL',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,
                    color:C.muted,fontWeight:500,letterSpacing:'.08em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLAIMS.map(c=>{
                const rc = riskColor(c.level);
                return (
                  <tr key={c.id}
                    onClick={()=>setSelected(selected?.id===c.id?null:c)}
                    style={{
                      borderBottom:`1px solid rgba(17,32,53,.7)`,
                      cursor:'pointer',
                      background:selected?.id===c.id?`rgba(34,211,238,.05)`:'transparent',
                      transition:'background .15s',
                    }}
                    onMouseEnter={e=>{ if(selected?.id!==c.id) e.currentTarget.style.background=C.bg2}}
                    onMouseLeave={e=>{ e.currentTarget.style.background=selected?.id===c.id?`rgba(34,211,238,.05)`:'transparent'}}>
                    <td style={{padding:'10px 14px',color:C.accent}}>{c.id}</td>
                    <td style={{padding:'10px 14px'}}>{c.payer}</td>
                    <td style={{padding:'10px 14px',color:C.muted2}}>{c.proc}</td>
                    <td style={{padding:'10px 14px',color:C.muted2}}>{c.provider}</td>
                    <td style={{padding:'10px 14px'}}>${c.amount.toLocaleString()}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:52,height:4,background:C.bg3,borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${Math.round(c.risk*100)}%`,background:rc,borderRadius:2}}/>
                        </div>
                        <span style={{color:rc,fontWeight:600}}>{Math.round(c.risk*100)}%</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 14px'}}><Badge level={c.level}/></td>
                    <td style={{padding:'10px 14px',color:C.muted,fontSize:16}}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {selected && (
          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.accent}}>
                {selected.id}
              </div>
              <Badge level={selected.level}/>
            </div>
            <div style={{fontSize:10,color:C.muted,marginBottom:16}}>Click row again to close</div>

            {[['Payer',selected.payer],['Procedure',selected.proc],
              ['Provider',selected.provider],['Amount',`$${selected.amount.toLocaleString()}`]].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',
                padding:'9px 0',borderBottom:`1px solid rgba(17,32,53,.8)`,fontSize:12}}>
                <span style={{color:C.muted}}>{k}</span>
                <span>{v}</span>
              </div>
            ))}

            <div style={{marginTop:16}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:'.08em',marginBottom:10}}>RISK FACTORS</div>
              {!selected.auth && (
                <div style={{background:'rgba(244,63,94,.08)',border:'1px solid rgba(244,63,94,.2)',
                  borderRadius:8,padding:10,marginBottom:8,fontSize:11}}>
                  <div style={{color:C.red,marginBottom:4}}>🔐 Missing Prior Authorization</div>
                  <div style={{color:C.muted2,lineHeight:1.6}}>Obtain prior auth from payer portal before submitting.</div>
                </div>
              )}
              {!selected.docs && (
                <div style={{background:'rgba(251,146,60,.08)',border:'1px solid rgba(251,146,60,.2)',
                  borderRadius:8,padding:10,marginBottom:8,fontSize:11}}>
                  <div style={{color:C.orange,marginBottom:4}}>📋 Incomplete Documentation</div>
                  <div style={{color:C.muted2,lineHeight:1.6}}>Attach all clinical notes and referral letters.</div>
                </div>
              )}
              {selected.auth && selected.docs && (
                <div style={{color:C.green,fontSize:11}}>✓ No critical flags detected</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── ANALYTICS ────────────────────────────────────────────────────── */
function Analytics() {
  return (
    <div>
      <SectionTitle>DEEP ANALYTICS</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card>
          <CardTitle>DENIAL RATE BY PROCEDURE CODE</CardTitle>
          {PROC_DENIAL.map((e,i)=>(
            <HBar key={i} label={e.code} val={e.rate} max={50}
              color={e.rate>35?C.red:e.rate>25?C.orange:C.accent}/>
          ))}
        </Card>

        <Card>
          <CardTitle>DENIAL RATE BY INSURANCE TYPE</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={INS_DENIAL} margin={{top:5,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="type" tick={{fill:C.muted2,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} unit="%"/>
              <Tooltip contentStyle={ttStyle} formatter={v=>[`${v}%`,'Denial Rate']}/>
              <Bar dataKey="rate" radius={[4,4,0,0]} maxBarSize={28}>
                {INS_DENIAL.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>REVENUE AT RISK TREND</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MONTHLY} margin={{top:5,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="m" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}
                tickFormatter={v=>`$${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={ttStyle} formatter={v=>[`$${v.toLocaleString()}`,'Revenue at Risk']}/>
              <Line type="monotone" dataKey="revenue" stroke={C.yellow} strokeWidth={2}
                dot={{fill:C.yellow,r:4,strokeWidth:0}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>SUBMITTED VS DENIED</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MONTHLY} margin={{top:5,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="m" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={ttStyle}/>
              <Legend wrapperStyle={{fontSize:11,color:C.muted}}/>
              <Bar dataKey="submitted" fill={C.accent}  radius={[3,3,0,0]} maxBarSize={18}/>
              <Bar dataKey="denials"   fill={C.red}     radius={[3,3,0,0]} maxBarSize={18}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ─── MODEL INFO ───────────────────────────────────────────────────── */
function ModelInfo() {
  const metrics = [
    ['Algorithm',       'Gradient Boosting Classifier'],
    ['Training Samples','10,000'],
    ['Test Samples',    '2,000'],
    ['ROC-AUC Score',   '0.6820'],
    ['Accuracy',        '70.4%'],
    ['Precision (Denial)','51%'],
    ['Recall (Denial)', '26%'],
    ['Features Used',   '15'],
  ];

  const pipeline = [
    {n:'01',title:'Data Ingestion',     desc:'Ingest historical claims via EHR/billing system (HL7 FHIR or CSV batch upload).'},
    {n:'02',title:'Feature Engineering',desc:'Extract 15 features: payer, procedure, insurance type, auth, docs, filing, prior denials, etc.'},
    {n:'03',title:'Risk Scoring',       desc:'GBM model outputs denial probability 0–100% per claim in real time.'},
    {n:'04',title:'Triage',             desc:'HIGH (≥60%) → block · MEDIUM (30–59%) → flag · LOW (<30%) → auto-submit.'},
    {n:'05',title:'Corrective Actions', desc:'Rule engine maps top risk factors to actionable fixes for billing staff.'},
    {n:'06',title:'Feedback Loop',      desc:'Actual denial outcomes fed back monthly to retrain and improve accuracy.'},
  ];

  const stack = [
    ['ML',      'scikit-learn GBM · pandas · numpy · joblib'],
    ['API',     'FastAPI · Pydantic · uvicorn'],
    ['Frontend','React · Recharts · IBM Plex Mono'],
    ['Data',    'HL7 FHIR · CSV batch · JSON REST'],
    ['Deploy',  'Docker · AWS ECS · PostgreSQL'],
  ];

  return (
    <div>
      <SectionTitle>MODEL ARCHITECTURE &amp; PERFORMANCE</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <div>
          <Card>
            <CardTitle>FEATURE IMPORTANCE</CardTitle>
            {FEAT_IMP.map((e,i)=>(
              <HBar key={i} label={e.feat} val={e.imp} max={30} color={C.accent}/>
            ))}
          </Card>

          <Card style={{marginTop:18}}>
            <CardTitle>MODEL METRICS</CardTitle>
            {metrics.map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',
                padding:'9px 0',borderBottom:`1px solid rgba(17,32,53,.7)`,fontSize:12}}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <Card>
            <CardTitle>INFERENCE PIPELINE</CardTitle>
            {pipeline.map((p,i)=>(
              <div key={p.n} style={{display:'flex',gap:14,marginBottom:i<pipeline.length-1?18:0}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:30,height:30,borderRadius:'50%',background:C.bg2,
                    border:`1px solid ${C.accent}`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:10,color:C.accent,flexShrink:0}}>{p.n}</div>
                  {i<pipeline.length-1 &&
                    <div style={{width:1,flex:1,background:C.border,marginTop:4,minHeight:12}}/>}
                </div>
                <div style={{paddingBottom:i<pipeline.length-1?18:0}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{p.title}</div>
                  <div style={{fontSize:11,color:C.muted2,lineHeight:1.6}}>{p.desc}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card style={{marginTop:18}}>
            <CardTitle>TECH STACK</CardTitle>
            {stack.map(([l,t])=>(
              <div key={l} style={{display:'flex',gap:12,marginBottom:9,fontSize:12}}>
                <span style={{color:C.accent,width:60,flexShrink:0}}>{l}</span>
                <span style={{color:C.muted2}}>{t}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT APP ─────────────────────────────────────────────────────── */
function App() {
  const [tab, setTab] = useState('overview');
  const [time, setTime] = useState('');

  useEffect(()=>{
    const tick = ()=>{
      const n=new Date();
      setTime(n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    };
    tick();
    const t=setInterval(tick,1000);
    return ()=>clearInterval(t);
  },[]);

  const tabs = [
    {k:'overview', label:'OVERVIEW'},
    {k:'predict',  label:'PREDICT'},
    {k:'queue',    label:'CLAIMS QUEUE'},
    {k:'analytics',label:'ANALYTICS'},
    {k:'model',    label:'MODEL INFO'},
  ];

  const pages = {
    overview:  <Overview/>,
    predict:   <Predict/>,
    queue:     <ClaimsQueue/>,
    analytics: <Analytics/>,
    model:     <ModelInfo/>,
  };

  return (
    <>
      {/* header */}
      <div style={{
        background:'rgba(8,13,24,0.97)', borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, zIndex:100, padding:'0 28px',
        backdropFilter:'blur(10px)',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:58}}>
          <div style={{display:'flex',alignItems:'center',gap:13}}>
            <div style={{
              width:36,height:36,borderRadius:9,
              background:'linear-gradient(135deg,#22d3ee 0%,#0ea5e9 100%)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:18, boxShadow:'0 0 18px rgba(34,211,238,.3)', flexShrink:0,
            }}>⚡</div>
            <div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:16,
                color:'#e8f4ff',letterSpacing:'.03em'}}>DENYSHIELD</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:'.12em',marginTop:1}}>
                RCM DENIAL PREDICTION &amp; PREVENTION ENGINE
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:10,color:C.muted,letterSpacing:'.08em'}}>
              <div style={{
                width:7,height:7,borderRadius:'50%',background:C.green,
                animation:'livepulse 2s infinite',
              }}/>
              LIVE · MODEL v1.0 · AUC 0.682
            </div>
            <div style={{fontSize:10,color:C.muted}}>{time}</div>
          </div>
        </div>

        <div style={{display:'flex',gap:0,marginTop:-1}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{
                background:'none', border:'none',
                borderBottom:`2px solid ${tab===t.k?C.accent:'transparent'}`,
                color:tab===t.k?C.accent:C.muted,
                padding:'11px 18px', fontSize:10, cursor:'pointer',
                letterSpacing:'.1em', fontFamily:'IBM Plex Mono,monospace',
                transition:'all .2s', whiteSpace:'nowrap',
              }}
              onMouseEnter={e=>{ if(tab!==t.k) e.target.style.color=C.text }}
              onMouseLeave={e=>{ if(tab!==t.k) e.target.style.color=C.muted }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* page content */}
      <div key={tab} style={{
        padding:28,
        animation:'fadein .3s ease',
      }}>
        {pages[tab]}
      </div>

      <style>{`
        @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{opacity:.6;box-shadow:0 0 0 4px rgba(52,211,153,0)}}
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script>
</body>
</html>