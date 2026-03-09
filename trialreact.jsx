import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, Legend, AreaChart, Area
} from "recharts";

const DENIAL_BY_PAYER = [
  { payer: "Medicaid", rate: 42, claims: 1420 },
  { payer: "Medicare", rate: 38, claims: 1680 },
  { payer: "UnitedHealth", rate: 35, claims: 2100 },
  { payer: "Cigna", rate: 31, claims: 980 },
  { payer: "Aetna", rate: 28, claims: 1340 },
  { payer: "Humana", rate: 24, claims: 760 },
  { payer: "BlueCross", rate: 21, claims: 1720 },
];

const DENIAL_REASONS = [
  { name: "No Authorization", value: 35, color: "#ff4d6d" },
  { name: "Incomplete Docs", value: 25, color: "#ff9500" },
  { name: "Timely Filing", value: 18, color: "#ffdd00" },
  { name: "Coding Error", value: 12, color: "#4cc9f0" },
  { name: "Missing Modifier", value: 10, color: "#7b5ea7" },
];

const MONTHLY_TREND = [
  { month: "Aug", denials: 412, submitted: 1200, cost: 124000 },
  { month: "Sep", denials: 398, submitted: 1150, cost: 119400 },
  { month: "Oct", denials: 445, submitted: 1320, cost: 133500 },
  { month: "Nov", denials: 380, submitted: 1280, cost: 114000 },
  { month: "Dec", denials: 361, submitted: 1190, cost: 108300 },
  { month: "Jan", denials: 312, submitted: 1240, cost: 93600 },
  { month: "Feb", denials: 287, submitted: 1310, cost: 86100 },
];

const FEATURE_IMPORTANCE = [
  { feature: "Auth Present", importance: 26.2 },
  { feature: "Claim Amount", importance: 17.5 },
  { feature: "Days Since Svc", importance: 10.8 },
  { feature: "Docs Complete", importance: 9.0 },
  { feature: "Patient Age", importance: 6.8 },
  { feature: "Provider ID", importance: 5.4 },
  { feature: "Prior Denials", importance: 4.1 },
  { feature: "Timely Filing", importance: 3.9 },
];

const SAMPLE_CLAIMS = [
  { id: "CLM-0091", payer: "Medicaid", procedure: "27447", provider: "PRV0014", amount: 12400, risk: 0.82, level: "HIGH", auth: 0, docs: 0 },
  { id: "CLM-0204", payer: "UnitedHealth", procedure: "99291", provider: "PRV0033", amount: 3200, risk: 0.71, level: "HIGH", auth: 0, docs: 1 },
  { id: "CLM-0317", payer: "Cigna", procedure: "70553", provider: "PRV0007", amount: 5800, risk: 0.64, level: "HIGH", auth: 1, docs: 0 },
  { id: "CLM-0428", payer: "Aetna", procedure: "99214", provider: "PRV0021", amount: 850, risk: 0.48, level: "MEDIUM", auth: 1, docs: 0 },
  { id: "CLM-0535", payer: "Medicare", procedure: "45378", provider: "PRV0042", amount: 2100, risk: 0.44, level: "MEDIUM", auth: 0, docs: 1 },
  { id: "CLM-0619", payer: "BlueCross", procedure: "93000", provider: "PRV0018", amount: 320, risk: 0.29, level: "MEDIUM", auth: 1, docs: 1 },
  { id: "CLM-0724", payer: "Humana", procedure: "99213", provider: "PRV0009", amount: 180, risk: 0.14, level: "LOW", auth: 1, docs: 1 },
  { id: "CLM-0831", payer: "BlueCross", procedure: "71046", provider: "PRV0031", amount: 440, risk: 0.11, level: "LOW", auth: 1, docs: 1 },
  { id: "CLM-0942", payer: "Aetna", procedure: "99213", provider: "PRV0005", amount: 210, risk: 0.08, level: "LOW", auth: 1, docs: 1 },
];

const CORRECTIVE_MAP = {
  "No Auth": { icon: "🔐", text: "Obtain prior authorization from payer portal. Required for procedure codes 27447, 70553, 99291." },
  "Missing Docs": { icon: "📋", text: "Attach all clinical notes, lab results, and referral letters. Verify payer-specific documentation requirements." },
  "Timely Filing": { icon: "⏱", text: "Submit claim immediately. If deadline missed, file appeal with proof of timely filing." },
  "Missing Modifier": { icon: "🏷", text: "Attach appropriate modifier (-25, -59, -GT). Verify modifier acceptance with this payer." },
  "High Prior Denial History": { icon: "📊", text: "Review denial history for this payer/procedure. Consider pre-submission audit and peer-to-peer review." },
};

const TABS = ["Overview", "Predict", "Claims Queue", "Analytics", "Model Info"];

const insuranceDenial = [
  { type: "Medicaid", rate: 42, fill: "#ff4d6d" },
  { type: "Medicare", rate: 38, fill: "#ff8c42" },
  { type: "HMO", rate: 34, fill: "#ffd166" },
  { type: "EPO", rate: 31, fill: "#4dd9ff" },
  { type: "PPO", rate: 26, fill: "#3ddc97" },
  { type: "HDHP", rate: 22, fill: "#a78bfa" },
  { type: "POS", rate: 19, fill: "#60a5fa" },
];

const procedureData = [
  { code: "27447", name: "Knee Replacement", denials: 41 },
  { code: "70553", name: "MRI Brain", denials: 38 },
  { code: "99291", name: "Critical Care", denials: 35 },
  { code: "45378", name: "Colonoscopy", denials: 30 },
  { code: "99283", name: "ED Visit", denials: 28 },
  { code: "71046", name: "Chest X-Ray", denials: 22 },
  { code: "99232", name: "Inpatient", denials: 18 },
  { code: "93000", name: "EKG", denials: 15 },
];

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.15em", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 3, height: 14, background: "#4dd9ff", borderRadius: 2 }} />
      {children}
    </div>
  );
}

function ChartCard({ title, children, style = {} }) {
  return (
    <div style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 12, padding: 20, ...style }}>
      <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.1em", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function OverviewTab() {
  const stats = [
    { label: "Total Claims (MTD)", value: "1,310", delta: "+8.4%", icon: "📄", color: "#4dd9ff" },
    { label: "Denial Rate", value: "30.6%", delta: "-3.2% ↓", icon: "🚫", color: "#ff4d6d" },
    { label: "High Risk Claims", value: "124", delta: "+12 this week", icon: "⚠️", color: "#ffa940" },
    { label: "Revenue at Risk", value: "$284K", delta: "-$18K ↓", icon: "💰", color: "#ffa940" },
    { label: "Prevention Saves", value: "$96K", delta: "+$14K ↑", icon: "✅", color: "#3ddc97" },
    { label: "Model AUC", value: "0.682", delta: "v1.0 live", icon: "🤖", color: "#a78bfa" },
  ];
  return (
    <div>
      <SectionTitle>OPERATIONAL OVERVIEW</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label.toUpperCase()}</div>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#4d7aaa", marginTop: 4 }}>{s.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 18 }}>
        <ChartCard title="MONTHLY DENIAL TREND">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={MONTHLY_TREND} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" />
              <XAxis dataKey="month" tick={{ fill: "#4d7aaa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4d7aaa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="denials" stroke="#ff4d6d" fill="url(#dg)" strokeWidth={2} dot={{ fill: "#ff4d6d", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="DENIAL REASONS">
          <div style={{ display: "flex", alignItems: "center" }}>
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie data={DENIAL_REASONS} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {DENIAL_REASONS.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              {DENIAL_REASONS.map(r => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ color: "#8aabcc", flex: 1 }}>{r.name}</span>
                  <span style={{ color: r.color, fontWeight: 600 }}>{r.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
      <ChartCard title="DENIAL RATE BY PAYER">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={DENIAL_BY_PAYER} layout="vertical" margin={{ top: 0, right: 40, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" horizontal={false} />
            <XAxis type="number" domain={[0, 50]} tick={{ fill: "#4d7aaa", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="payer" tick={{ fill: "#8aabcc", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 8, fontSize: 11 }} formatter={v => [`${v}%`, "Denial Rate"]} />
            <Bar dataKey="rate" radius={[0, 3, 3, 0]} maxBarSize={15}>
              {DENIAL_BY_PAYER.map((e, i) => <Cell key={i} fill={e.rate > 35 ? "#ff4d6d" : e.rate > 28 ? "#ffa940" : "#4dd9ff"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function PredictTab() {
  const [form, setForm] = useState({
    payer: "Aetna", procedure_code: "99214", insurance_type: "HMO",
    patient_age: "45", claim_amount: "850", days_since_service: "10",
    prior_denial_count: "0",
    authorization_present: "1", documentation_complete: "1",
    modifier_present: "1", referral_present: "1", timely_filing: "1",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = key => setForm(f => ({ ...f, [key]: f[key] === "1" ? "0" : "1" }));

  const run = () => {
    setLoading(true); setResult(null);
    setTimeout(() => {
      const auth = +form.authorization_present, docs = +form.documentation_complete;
      const filing = +form.timely_filing, modifier = +form.modifier_present;
      const referral = +form.referral_present, prior = +form.prior_denial_count || 0;
      const days = +form.days_since_service || 0;
      let score = 0.05 + (1-auth)*0.30 + (1-docs)*0.22 + (1-filing)*0.15
        + (prior/10)*0.12 + (1-modifier)*0.08 + (days/365)*0.05
        + (["Medicaid","Medicare"].includes(form.payer) ? 0.05 : 0)
        + (["27447","70553","99291"].includes(form.procedure_code) ? 0.04 : 0)
        + (1-referral)*0.03;
      score = Math.min(0.97, Math.max(0.03, score + (Math.random()*0.06-0.03)));
      const level = score >= 0.60 ? "HIGH" : score >= 0.30 ? "MEDIUM" : "LOW";
      const factors = [];
      if (!auth) factors.push("No Auth");
      if (!docs) factors.push("Missing Docs");
      if (!filing) factors.push("Timely Filing");
      if (!modifier) factors.push("Missing Modifier");
      if (prior >= 3) factors.push("High Prior Denial History");
      setResult({ score, level, factors });
      setLoading(false);
    }, 800);
  };

  const riskColor = result ? (result.level === "HIGH" ? "#ff4d6d" : result.level === "MEDIUM" ? "#ffa940" : "#3ddc97") : "#4dd9ff";
  const pct = result ? Math.round(result.score * 100) : 0;

  const inputStyle = { background: "#040a14", border: "1px solid #0f2540", borderRadius: 6, color: "#c8d8f0", padding: "8px 10px", fontSize: 12, width: "100%", fontFamily: "monospace", outline: "none" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      <div>
        <SectionTitle>CLAIM RISK PREDICTOR</SectionTitle>
        <div style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 12, padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { key: "payer", label: "Payer", type: "select", opts: ["Aetna","UnitedHealth","BlueCross","Cigna","Humana","Medicare","Medicaid"] },
              { key: "procedure_code", label: "Procedure Code", type: "select", opts: ["99213","99214","99232","27447","71046","93000","99283","45378","70553","99291"] },
              { key: "insurance_type", label: "Insurance Type", type: "select", opts: ["HMO","PPO","EPO","POS","HDHP"] },
              { key: "patient_age", label: "Patient Age", type: "number" },
              { key: "claim_amount", label: "Claim Amount ($)", type: "number" },
              { key: "days_since_service", label: "Days Since Service", type: "number" },
              { key: "prior_denial_count", label: "Prior Denials", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: "#4d7aaa", marginBottom: 5, letterSpacing: "0.08em" }}>{f.label.toUpperCase()}</div>
                {f.type === "select"
                  ? <select value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} style={inputStyle}>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
                  : <input type="number" value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} style={inputStyle} />}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #0f2540", paddingTop: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.08em", marginBottom: 10 }}>COMPLIANCE FLAGS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { key: "authorization_present", label: "Prior Authorization" },
                { key: "documentation_complete", label: "Docs Complete" },
                { key: "modifier_present", label: "Modifier Present" },
                { key: "referral_present", label: "Referral Present" },
                { key: "timely_filing", label: "Timely Filing" },
              ].map(f => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 12, color: "#8aabcc" }}>
                  <div onClick={() => toggle(f.key)} style={{ width: 34, height: 18, borderRadius: 9, background: form[f.key] === "1" ? "#3ddc97" : "#0f2540", position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: form[f.key] === "1" ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={run} disabled={loading} style={{ width: "100%", background: "#102a50", border: "1px solid #1e4a80", color: "#4dd9ff", borderRadius: 8, padding: "11px", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em", fontFamily: "monospace", transition: "all 0.2s" }}>
            {loading ? "ANALYZING..." : "▶  RUN DENIAL PREDICTION"}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle>PREDICTION RESULT</SectionTitle>
        {!result && !loading && (
          <div style={{ background: "#060f20", border: "1px dashed #0f2540", borderRadius: 12, padding: 48, textAlign: "center", color: "#2a4a6a" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 12 }}>Submit a claim to see denial risk analysis</div>
          </div>
        )}
        {loading && (
          <div style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 12, padding: 48, textAlign: "center", color: "#4d7aaa", fontSize: 11, letterSpacing: "0.1em" }}>
            RUNNING ML INFERENCE...
          </div>
        )}
        {result && !loading && (
          <div style={{ background: "#060f20", border: `1px solid ${riskColor}44`, borderRadius: 12, padding: 22 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.1em", marginBottom: 6 }}>DENIAL RISK SCORE</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: riskColor, lineHeight: 1, fontFamily: "monospace" }}>{pct}%</div>
              <div style={{ marginTop: 10 }}>
                <span style={{ padding: "4px 16px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
                  {result.level} RISK
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ height: 7, background: "#0f2540", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,#3ddc97,${riskColor})`, borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#2a4a6a", marginTop: 3 }}>
                <span>LOW</span><span>MEDIUM</span><span>HIGH</span>
              </div>
            </div>
            <div style={{ background: `${riskColor}11`, border: `1px solid ${riskColor}33`, borderRadius: 8, padding: 11, marginBottom: 16, fontSize: 12, color: riskColor }}>
              {result.level === "HIGH" ? "🚫 Block claim — requires review before submission"
                : result.level === "MEDIUM" ? "⚠️ Flag for pre-submission audit"
                : "✅ Clear for submission"}
            </div>
            {result.factors.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.08em", marginBottom: 8 }}>CORRECTIVE ACTIONS</div>
                {result.factors.map(f => {
                  const ca = CORRECTIVE_MAP[f] || { icon: "⚠️", text: "Review before submission." };
                  return (
                    <div key={f} style={{ background: "#040a14", borderRadius: 8, padding: "10px 13px", marginBottom: 7, border: "1px solid #0f2540" }}>
                      <div style={{ fontSize: 12, color: "#ffa940", marginBottom: 3 }}>{ca.icon} {f}</div>
                      <div style={{ fontSize: 11, color: "#6a8aaa", lineHeight: 1.5 }}>{ca.text}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {result.factors.length === 0 && <div style={{ textAlign: "center", color: "#3ddc97", fontSize: 12 }}>✓ No critical risk factors detected</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimsQueueTab() {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20 }}>
      <div>
        <SectionTitle>PENDING CLAIMS QUEUE · {SAMPLE_CLAIMS.length} CLAIMS</SectionTitle>
        <div style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#040a14", borderBottom: "1px solid #0f2540" }}>
                {["Claim ID","Payer","Procedure","Provider","Amount","Risk","Level",""].map(h => (
                  <th key={h} style={{ padding: "10px 13px", textAlign: "left", fontSize: 10, color: "#4d7aaa", fontWeight: 500, letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_CLAIMS.map(c => (
                <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  style={{ borderBottom: "1px solid #0a1a2e", cursor: "pointer", background: selected?.id === c.id ? "#0d2444" : "transparent", transition: "background 0.15s" }}>
                  <td style={{ padding: "10px 13px", color: "#4dd9ff" }}>{c.id}</td>
                  <td style={{ padding: "10px 13px", color: "#c8d8f0" }}>{c.payer}</td>
                  <td style={{ padding: "10px 13px", color: "#8aabcc" }}>{c.procedure}</td>
                  <td style={{ padding: "10px 13px", color: "#8aabcc" }}>{c.provider}</td>
                  <td style={{ padding: "10px 13px", color: "#c8d8f0" }}>${c.amount.toLocaleString()}</td>
                  <td style={{ padding: "10px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 48, height: 4, background: "#0f2540", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(c.risk*100)}%`, background: c.level==="HIGH"?"#ff4d6d":c.level==="MEDIUM"?"#ffa940":"#3ddc97", borderRadius: 2 }} />
                      </div>
                      <span style={{ color: c.level==="HIGH"?"#ff4d6d":c.level==="MEDIUM"?"#ffa940":"#3ddc97", fontWeight: 600 }}>{Math.round(c.risk*100)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 13px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: c.level==="HIGH"?"rgba(255,77,109,0.15)":c.level==="MEDIUM"?"rgba(255,169,64,0.15)":"rgba(61,220,151,0.15)",
                      color: c.level==="HIGH"?"#ff4d6d":c.level==="MEDIUM"?"#ffa940":"#3ddc97",
                      border: `1px solid ${c.level==="HIGH"?"rgba(255,77,109,0.3)":c.level==="MEDIUM"?"rgba(255,169,64,0.3)":"rgba(61,220,151,0.3)"}`
                    }}>{c.level}</span>
                  </td>
                  <td style={{ padding: "10px 13px", color: "#4d7aaa" }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div>
          <SectionTitle>CLAIM DETAIL</SectionTitle>
          <div style={{ background: "#060f20", border: "1px solid #0f2540", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#4dd9ff", fontFamily: "monospace" }}>{selected.id}</div>
              <span style={{ padding: "4px 12px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: selected.level==="HIGH"?"rgba(255,77,109,0.15)":selected.level==="MEDIUM"?"rgba(255,169,64,0.15)":"rgba(61,220,151,0.15)",
                color: selected.level==="HIGH"?"#ff4d6d":selected.level==="MEDIUM"?"#ffa940":"#3ddc97",
                border: `1px solid ${selected.level==="HIGH"?"rgba(255,77,109,0.3)":selected.level==="MEDIUM"?"rgba(255,169,64,0.3)":"rgba(61,220,151,0.3)"}`
              }}>{selected.level}</span>
            </div>
            {[["Payer",selected.payer],["Procedure",selected.procedure],["Provider",selected.provider],["Amount",`$${selected.amount.toLocaleString()}`],["Risk Score",`${Math.round(selected.risk*100)}%`]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0a1a2e", fontSize: 12 }}>
                <span style={{ color: "#4d7aaa" }}>{k}</span><span style={{ color: "#c8d8f0" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: "#4d7aaa", letterSpacing: "0.08em", marginBottom: 8 }}>RISK FACTORS</div>
              {!selected.auth && <div style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 8, padding: 10, marginBottom: 7, fontSize: 11, color: "#ff8fa3" }}>
                🔐 Missing Prior Authorization<br /><span style={{ color: "#6a8aaa", lineHeight: 1.5, display: "block", marginTop: 3 }}>Obtain prior authorization from payer before submitting.</span>
              </div>}
              {!selected.docs && <div style={{ background: "rgba(255,169,64,0.08)", border: "1px solid rgba(255,169,64,0.2)", borderRadius: 8, padding: 10, marginBottom: 7, fontSize: 11, color: "#ffc166" }}>
                📋 Incomplete Documentation<br /><span style={{ color: "#6a8aaa", lineHeight: 1.5, display: "block", marginTop: 3 }}>Attach all clinical notes and referral letters.</span>
              </div>}
              {selected.auth && selected.docs && <div style={{ color: "#3ddc97", fontSize: 11 }}>✓ No critical flags detected</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div>
      <SectionTitle>DEEP ANALYTICS</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <ChartCard title="DENIAL RATE BY PROCEDURE CODE">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={procedureData} layout="vertical" margin={{ top: 0, right: 30, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" horizontal={false} />
              <XAxis type="number" domain={[0,50]} tick={{ fill:"#4d7aaa", fontSize:10 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="code" tick={{ fill:"#8aabcc", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:"#060f20", border:"1px solid #0f2540", borderRadius:8, fontSize:11 }} formatter={(v,n,p) => [`${v}%`, p.payload.name]} />
              <Bar dataKey="denials" radius={[0,3,3,0]} maxBarSize={13}>
                {procedureData.map((e,i) => <Cell key={i} fill={e.denials>35?"#ff4d6d":e.denials>25?"#ffa940":"#4dd9ff"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="DENIAL RATE BY INSURANCE TYPE">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={insuranceDenial} margin={{ top:10, right:20, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" vertical={false} />
              <XAxis dataKey="type" tick={{ fill:"#8aabcc", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#4d7aaa", fontSize:11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background:"#060f20", border:"1px solid #0f2540", borderRadius:8, fontSize:11 }} formatter={v=>[`${v}%`,"Denial Rate"]} />
              <Bar dataKey="rate" radius={[3,3,0,0]} maxBarSize={26}>
                {insuranceDenial.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="REVENUE AT RISK TREND ($)">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={MONTHLY_TREND} margin={{ top:5, right:20, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" />
              <XAxis dataKey="month" tick={{ fill:"#4d7aaa", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#4d7aaa", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background:"#060f20", border:"1px solid #0f2540", borderRadius:8, fontSize:11 }} formatter={v=>[`$${v.toLocaleString()}`,"Revenue at Risk"]} />
              <Line type="monotone" dataKey="cost" stroke="#ffa940" strokeWidth={2} dot={{ fill:"#ffa940", r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="CLAIMS SUBMITTED VS DENIED">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={MONTHLY_TREND} margin={{ top:5, right:20, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" vertical={false} />
              <XAxis dataKey="month" tick={{ fill:"#4d7aaa", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#4d7aaa", fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:"#060f20", border:"1px solid #0f2540", borderRadius:8, fontSize:11 }} />
              <Legend wrapperStyle={{ fontSize:11, color:"#4d7aaa" }} />
              <Bar dataKey="submitted" fill="#4dd9ff" radius={[2,2,0,0]} maxBarSize={16} />
              <Bar dataKey="denials" fill="#ff4d6d" radius={[2,2,0,0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ModelInfoTab() {
  const metrics = [
    ["Algorithm","Gradient Boosting Classifier"],["Training Samples","10,000"],
    ["Test Samples","2,000"],["ROC-AUC Score","0.6820"],
    ["Accuracy","70.4%"],["Precision (Denial)","51%"],
    ["Recall (Denial)","26%"],["Features Used","15"],
  ];
  const pipeline = [
    { n:"01", t:"Data Ingestion", d:"Ingest historical claims from EHR/billing system via HL7 FHIR or CSV batch." },
    { n:"02", t:"Feature Engineering", d:"Extract 15 features: payer, procedure, auth status, docs, filing, prior denials, etc." },
    { n:"03", t:"Risk Scoring", d:"GBM model outputs denial probability 0–100% for each claim in real time." },
    { n:"04", t:"Triage Routing", d:"HIGH (≥60%) → block; MEDIUM (30–59%) → flag; LOW (<30%) → auto-submit." },
    { n:"05", t:"Corrective Actions", d:"Rule engine maps top risk factors to actionable fixes for billing staff." },
    { n:"06", t:"Feedback Loop", d:"Actual denial outcomes retrain model monthly, continuously improving accuracy." },
  ];
  return (
    <div>
      <SectionTitle>MODEL ARCHITECTURE & PERFORMANCE</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <div>
          <ChartCard title="FEATURE IMPORTANCE">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={FEATURE_IMPORTANCE} layout="vertical" margin={{ top:0, right:30, left:80, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f2540" horizontal={false} />
                <XAxis type="number" tick={{ fill:"#4d7aaa", fontSize:10 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="feature" tick={{ fill:"#8aabcc", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:"#060f20", border:"1px solid #0f2540", borderRadius:8, fontSize:11 }} />
                <Bar dataKey="importance" fill="#4dd9ff" radius={[0,3,3,0]} maxBarSize={11} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>