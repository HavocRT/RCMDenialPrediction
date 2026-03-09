<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DenyShield — RCM Denial Prediction Engine</title>

<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">

<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.12.7/Recharts.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>

<style>

*,*::before,*::after{
box-sizing:border-box;
margin:0;
padding:0;
}

:root{
--bg:#05080f;
--bg1:#080d18;
--bg2:#0b1220;
--bg3:#0e1a2e;
--border:#112035;
--border2:#1c3655;

--text:#c4d4e8;
--muted:#3d5a7a;
--muted2:#5a7a9a;

--accent:#22d3ee;
--red:#f43f5e;
--orange:#fb923c;
--green:#34d399;
--purple:#a78bfa;
--yellow:#fbbf24;
}

body{
font-family:'IBM Plex Mono',monospace;
background:var(--bg);
color:var(--text);
min-height:100vh;
}

#root{
padding:30px;
}

.card{
background:var(--bg1);
border:1px solid var(--border);
border-radius:12px;
padding:20px;
margin-bottom:20px;
}

.title{
font-family:'Syne',sans-serif;
font-weight:800;
font-size:22px;
margin-bottom:15px;
}

.btn{
width:100%;
padding:12px;
background:var(--bg2);
border:1px solid var(--border2);
border-radius:8px;
color:var(--accent);
cursor:pointer;
}

.badge{
padding:4px 10px;
border-radius:10px;
font-size:10px;
font-weight:600;
}

.high{background:rgba(244,63,94,.12);color:var(--red)}
.medium{background:rgba(251,146,60,.12);color:var(--orange)}
.low{background:rgba(52,211,153,.12);color:var(--green)}

input,select{
width:100%;
padding:8px;
background:var(--bg);
border:1px solid var(--border);
border-radius:6px;
color:var(--text);
margin-bottom:10px;
}

table{
width:100%;
border-collapse:collapse;
}

td,th{
padding:10px;
border-bottom:1px solid var(--border);
font-size:12px;
}

</style>
</head>


<body>

<div id="root"></div>

<script type="text/babel">

const {
AreaChart,Area,
BarChart,Bar,
LineChart,Line,
PieChart,Pie,Cell,
XAxis,YAxis,
CartesianGrid,Tooltip,Legend,
ResponsiveContainer
}=window.Recharts


const MONTHLY=[
{m:'Aug',denials:412,submitted:1200,revenue:124000},
{m:'Sep',denials:398,submitted:1150,revenue:119400},
{m:'Oct',denials:445,submitted:1320,revenue:133500},
{m:'Nov',denials:380,submitted:1280,revenue:114000},
{m:'Dec',denials:361,submitted:1190,revenue:108300},
{m:'Jan',denials:312,submitted:1240,revenue:93600},
{m:'Feb',denials:287,submitted:1310,revenue:86100}
]


const CLAIMS=[
{id:'CLM-0091',payer:'Medicaid',amount:12400,risk:.82,level:'HIGH'},
{id:'CLM-0204',payer:'UnitedHealth',amount:3200,risk:.71,level:'HIGH'},
{id:'CLM-0317',payer:'Cigna',amount:5800,risk:.64,level:'HIGH'},
{id:'CLM-0428',payer:'Aetna',amount:850,risk:.48,level:'MEDIUM'},
{id:'CLM-0535',payer:'Medicare',amount:2100,risk:.44,level:'MEDIUM'},
{id:'CLM-0619',payer:'BlueCross',amount:320,risk:.29,level:'MEDIUM'},
{id:'CLM-0724',payer:'Humana',amount:180,risk:.14,level:'LOW'}
]


function Badge({level}){

if(level==="HIGH")return <span className="badge high">HIGH</span>
if(level==="MEDIUM")return <span className="badge medium">MEDIUM</span>
return <span className="badge low">LOW</span>

}



function Overview(){

return(

<div className="card">

<div className="title">Monthly Denial Trend</div>

<ResponsiveContainer width="100%" height={250}>
<AreaChart data={MONTHLY}>

<CartesianGrid stroke="#112035"/>

<XAxis dataKey="m"/>
<YAxis/>

<Tooltip/>

<Area
type="monotone"
dataKey="denials"
stroke="#f43f5e"
fill="#f43f5e"
/>

</AreaChart>
</ResponsiveContainer>

</div>

)

}



function Predict(){

const [form,setForm]=React.useState({
payer:"Aetna",
claim_amount:800,
prior_denials:0,
auth:true,
docs:true
})

const [result,setResult]=React.useState(null)


function update(k,v){
setForm(f=>({...f,[k]:v}))
}


function run(){

let score=0.1

if(!form.auth)score+=0.35
if(!form.docs)score+=0.25

score+=form.prior_denials*.05

if(form.payer==="Medicaid"||form.payer==="Medicare")score+=0.05

score=Math.min(.95,score+Math.random()*.05)

let level="LOW"
if(score>=.6)level="HIGH"
else if(score>=.3)level="MEDIUM"

setResult({score,level})

}


return(

<div className="card">

<div className="title">Claim Risk Predictor</div>

<select
value={form.payer}
onChange={e=>update("payer",e.target.value)}
>
<option>Aetna</option>
<option>UnitedHealth</option>
<option>Cigna</option>
<option>Humana</option>
<option>Medicare</option>
<option>Medicaid</option>
</select>

<input
type="number"
value={form.claim_amount}
onChange={e=>{
const val=e.target.value===""?0:parseFloat(e.target.value)
update("claim_amount",val)
}}
placeholder="Claim Amount"
/>

<input
type="number"
value={form.prior_denials}
onChange={e=>{
const val=e.target.value===""?0:parseInt(e.target.value)
update("prior_denials",val)
}}
placeholder="Prior Denials"
/>

<label>
<input
type="checkbox"
checked={form.auth}
onChange={e=>update("auth",e.target.checked)}
/> Authorization
</label>

<br/>

<label>
<input
type="checkbox"
checked={form.docs}
onChange={e=>update("docs",e.target.checked)}
/> Documentation
</label>

<br/><br/>

<button className="btn" type="button" onClick={run}>
Run Prediction
</button>

<br/><br/>

{result&&(

<div>

<div style={{fontSize:40,fontWeight:800}}>
{Math.round(result.score*100)}%
</div>

<Badge level={result.level}/>

</div>

)}

</div>

)

}



function Queue(){

return(

<div className="card">

<div className="title">Claims Queue</div>

<table>

<thead>

<tr>
<th>ID</th>
<th>Payer</th>
<th>Amount</th>
<th>Risk</th>
<th>Level</th>
</tr>

</thead>

<tbody>

{CLAIMS.map(c=>(

<tr key={c.id}>

<td>{c.id}</td>
<td>{c.payer}</td>
<td>${c.amount}</td>
<td>{Math.round(c.risk*100)}%</td>
<td><Badge level={c.level}/></td>

</tr>

))}

</tbody>

</table>

</div>

)

}



function App(){

const [tab,setTab]=React.useState("overview")

return(

<div>

<div style={{marginBottom:20}}>

<button className="btn" onClick={()=>setTab("overview")}>Overview</button>
<button className="btn" onClick={()=>setTab("predict")}>Predict</button>
<button className="btn" onClick={()=>setTab("queue")}>Queue</button>

</div>

{tab==="overview"&&<Overview/>}
{tab==="predict"&&<Predict/>}
{tab==="queue"&&<Queue/>}

</div>

)

}


const root=ReactDOM.createRoot(document.getElementById("root"))

root.render(

<React.StrictMode>
<App/>
</React.StrictMode>

)

</script>

</body>
</html>