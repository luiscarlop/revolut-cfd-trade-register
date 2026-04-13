import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import AuthPage from "./Auth";
import LandingPage from "./LandingPage";

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = ["Trades", "Assets DB", "Charts", "Summary"];
const FONT = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";
const BG = "#080E1A";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) =>
  n === undefined || n === null || isNaN(n)
    ? "—"
    : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

// ── P&L calculation ───────────────────────────────────────────────────────────
function calcPL(trade, assets) {
  const asset = assets.find((a) => a.ticker === trade.ticker);
  if (!asset || !trade.entryPrice || !trade.exitPrice || !trade.lots) return null;
  const dir = trade.direction === "Long" ? 1 : -1;
  const positionValue = trade.entryPrice * asset.lotSize * trade.lots;
  const margin = asset.leverage ? positionValue / asset.leverage : positionValue;
  const gross = dir * (trade.exitPrice - trade.entryPrice) * asset.lotSize * trade.lots;
  const fees = asset.feePerLot * trade.lots;
  return { gross, fees, net: gross - fees, margin, positionValue };
}

// ── Shared glass helper ───────────────────────────────────────────────────────
const glass = (extra = {}) => ({
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  ...extra,
});

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "0.6rem 0.85rem",
  color: "#F1F5F9",
  fontFamily: FONT,
  fontSize: "0.82rem",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: "0.65rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#475569",
  marginBottom: "0.3rem",
};

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ msg, icon }) {
  return (
    <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#334155" }}>
      {icon && <div style={{ marginBottom: "0.75rem", opacity: 0.4 }}>{icon}</div>}
      <p style={{ fontSize: "0.85rem" }}>{msg}</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      ...glass({ padding: "1.1rem 1.25rem", borderRadius: "14px" }),
      borderLeft: `2px solid ${color}40`,
      transition: "border-color 0.2s, transform 0.15s",
      cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderLeftColor = color; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderLeftColor = `${color}40`; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ fontSize: "0.62rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.68rem", color: "#334155", marginTop: "0.2rem" }}>{sub}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  const map = {
    green: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", text: "#4ADE80" },
    red:   { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  text: "#F87171" },
    blue:  { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", text: "#60A5FA" },
  };
  const c = map[color] || map.blue;
  return (
    <span style={{ display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "20px", fontSize: "0.65rem", fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {children}
    </span>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────
const btnVariants = {
  primary:  { bg: "linear-gradient(135deg,#8B5CF6,#6D28D9)", color: "#fff", border: "none", shadow: "0 0 16px rgba(139,92,246,0.3)" },
  success:  { bg: "rgba(34,197,94,0.12)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.25)", shadow: "none" },
  danger:   { bg: "rgba(239,68,68,0.1)",  color: "#F87171", border: "1px solid rgba(239,68,68,0.2)",  shadow: "none" },
  ghost:    { bg: "transparent",           color: "#64748B", border: "1px solid rgba(255,255,255,0.08)", shadow: "none" },
  gold:     { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)", shadow: "none" },
};

function Btn({ variant = "primary", size = "md", children, onClick, disabled }) {
  const v = btnVariants[variant];
  const pad = size === "sm" ? "0.3rem 0.65rem" : "0.55rem 1.1rem";
  const fs = size === "sm" ? "0.7rem" : "0.8rem";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad, borderRadius: "8px", border: v.border, cursor: disabled ? "not-allowed" : "pointer",
        background: v.bg, color: v.color, fontFamily: FONT, fontSize: fs, fontWeight: 600,
        letterSpacing: "0.04em", transition: "all 0.15s", boxShadow: v.shadow,
        opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "0.35rem",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 100, H = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`);
  const positive = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={positive ? "#22C55E" : "#EF4444"} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// ── P&L% Bar Chart (per trade, sorted by date) ────────────────────────────────
function PLPercentBars({ trades, assets }) {
  const data = useMemo(() => trades
    .filter(t => t.exitPrice)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const pl = calcPL(t, assets);
      if (!pl || !pl.margin || pl.margin === 0) return null;
      return { ticker: t.ticker, date: fmtDate(t.date), pct: (pl.net / pl.margin) * 100, net: pl.net };
    })
    .filter(Boolean),
  [trades, assets]);

  if (!data.length) return <EmptyState msg="No closed trades yet — P&L% chart will appear here." />;

  const maxAbs = Math.max(...data.map(d => Math.abs(d.pct)), 1);
  const W = 600, H = 180, PAD_L = 40, PAD_R = 12, PAD_T = 20, PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const zeroY = PAD_T + chartH / 2;
  const barW = Math.min(32, chartW / data.length - 4);
  const scale = (chartH / 2 - 6) / maxAbs;

  // Y-axis labels
  const yTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet" style={{ display: "block", overflow: "visible" }}>
      {/* Y-axis ticks */}
      {yTicks.map((v, i) => {
        const y = zeroY - v * scale;
        return (
          <g key={i}>
            <line x1={PAD_L - 4} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fill="#334155" fontSize="8" fontFamily={FONT}>
              {v >= 0 ? "+" : ""}{v.toFixed(0)}%
            </text>
          </g>
        );
      })}
      {/* Zero line */}
      <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />

      {data.map((d, i) => {
        const slotW = chartW / data.length;
        const cx = PAD_L + i * slotW + slotW / 2;
        const barH = Math.max(2, Math.abs(d.pct) * scale);
        const y = d.pct >= 0 ? zeroY - barH : zeroY;
        const color = d.pct >= 0 ? "#22C55E" : "#EF4444";
        const labelY = d.pct >= 0 ? y - 4 : y + barH + 10;

        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={y} width={barW} height={barH}
              fill={color} fillOpacity="0.75" rx="3"
              style={{ transition: "fill-opacity 0.15s" }}
            />
            {/* Value label (only if bar is big enough) */}
            {Math.abs(d.pct) > 2 && (
              <text x={cx} y={labelY} textAnchor="middle" fill={color} fontSize="8" fontFamily={FONT} fontWeight="600">
                {d.pct >= 0 ? "+" : ""}{d.pct.toFixed(1)}%
              </text>
            )}
            {/* Ticker label */}
            <text x={cx} y={H - 6} textAnchor="middle" fill="#475569" fontSize="8" fontFamily={FONT}>
              {d.ticker.length > 6 ? d.ticker.slice(0, 5) + "…" : d.ticker}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Equity Curve ──────────────────────────────────────────────────────────────
function EquityCurveChart({ trades, assets }) {
  const closed = trades.filter(t => t.exitPrice).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (closed.length < 2) return <EmptyState msg="Need at least 2 closed trades for the equity curve." />;

  let cum = 0;
  const points = closed.map(t => { const pl = calcPL(t, assets); cum += pl?.net ?? 0; return cum; });
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const W = 600, H = 160, PL = 40, PR = 12, PT = 16, PB = 8;
  const cW = W - PL - PR, cH = H - PT - PB;
  const zeroY = PT + cH - (((0 - min) / range) * cH);

  const pts = points.map((v, i) => {
    const x = PL + (i / (points.length - 1)) * cW;
    const y = PT + cH - ((v - min) / range) * cH;
    return [x, y];
  });
  const polyline = pts.map(p => p.join(",")).join(" ");
  const area = `M${pts[0].join(",")} ${pts.map(p => `L${p.join(",")}`).join(" ")} L${pts[pts.length-1][0]},${PT + cH} L${pts[0][0]},${PT + cH} Z`;
  const positive = points[points.length - 1] >= 0;
  const color = positive ? "#22C55E" : "#EF4444";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 3" />
      <path d={area} fill="url(#ecGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={points[i] >= 0 ? "#22C55E" : "#EF4444"} />
      ))}
    </svg>
  );
}

// ── P&L bar chart (per trade, absolute) ───────────────────────────────────────
function PnlBarChart({ trades, assets }) {
  const data = trades.filter(t => t.exitPrice).map(t => {
    const pl = calcPL(t, assets);
    return { label: t.ticker, value: pl?.net ?? 0 };
  });
  if (!data.length) return <EmptyState msg="No closed trades yet." />;
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
          <span style={{ width: "64px", color: "#64748B", textAlign: "right", flexShrink: 0, fontWeight: 600 }}>{d.label}</span>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden", height: "18px" }}>
            <div style={{ height: "100%", width: `${(Math.abs(d.value) / max) * 100}%`, background: d.value >= 0 ? "#22C55E" : "#EF4444", borderRadius: "4px", transition: "width 0.4s ease", opacity: 0.8 }} />
          </div>
          <span style={{ width: "72px", color: d.value >= 0 ? "#4ADE80" : "#F87171", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
            {d.value >= 0 ? "+" : ""}{fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: "0.6rem" }}>{children}</div>;
}

// ── Glass card wrapper ────────────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ ...glass({ padding: "1.25rem" }), ...style }}>{children}</div>;
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("Trades");
  const [assets, setAssets] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newAsset, setNewAsset] = useState({ ticker: "", name: "", lotSize: "", feePerLot: "", leverage: "" });
  const [editAssetId, setEditAssetId] = useState(null);
  const emptyTrade = { ticker: "", direction: "Long", date: new Date().toISOString().slice(0, 10), entryPrice: "", exitPrice: "", lots: "", notes: "" };
  const [form, setForm] = useState(emptyTrade);

  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const uid = session.user.id;
      const [{ data: td }, { data: ad }] = await Promise.all([
        supabase.from("trades").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("assets").select("*").eq("user_id", uid),
      ]);
      if (td) setTrades(td.map(dbTradeToApp));
      if (ad) setAssets(ad.map(dbAssetToApp));
      setLoaded(true);
    }
    load();
  }, [session]);

  function dbTradeToApp(r) { return { id: r.id, ticker: r.ticker, direction: r.direction, date: r.date, entryPrice: r.entry_price, exitPrice: r.exit_price, lots: r.lots, notes: r.notes }; }
  function dbAssetToApp(r) { return { id: r.id, ticker: r.ticker, name: r.name, lotSize: r.lot_size, feePerLot: r.fee_per_lot, leverage: r.leverage }; }

  const filtered = useMemo(() => trades.filter(t =>
    t.ticker.toLowerCase().includes(filter.toLowerCase()) ||
    t.direction.toLowerCase().includes(filter.toLowerCase()) ||
    (t.notes || "").toLowerCase().includes(filter.toLowerCase())
  ), [trades, filter]);

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.exitPrice);
    const pls = closed.map(t => calcPL(t, assets)?.net ?? 0);
    const wins = pls.filter(p => p > 0).length;
    const totalPL = pls.reduce((a, b) => a + b, 0);
    const avgWin = wins ? pls.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins : 0;
    const losses = pls.filter(p => p < 0).length;
    const avgLoss = losses ? pls.filter(p => p < 0).reduce((a, b) => a + b, 0) / losses : 0;
    const cumulative = pls.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
    return { closed: closed.length, wins, losses, winRate: closed.length ? (wins / closed.length) * 100 : 0, totalPL, avgWin, avgLoss, cumulative };
  }, [trades, assets]);

  const saveTrade = async () => {
    if (!form.ticker || !form.entryPrice || !form.lots) return;
    const payload = {
      ticker: form.ticker, direction: form.direction, date: form.date,
      entry_price: parseFloat(form.entryPrice),
      exit_price: form.exitPrice !== "" ? parseFloat(form.exitPrice) : null,
      lots: parseFloat(form.lots), notes: form.notes,
    };
    if (editId !== null) {
      const { data, error } = await supabase.from("trades").update(payload).eq("id", editId).select().single();
      if (!error) setTrades(t => t.map(tr => tr.id === editId ? dbTradeToApp(data) : tr));
      setEditId(null);
    } else {
      const { data, error } = await supabase.from("trades").insert({ ...payload, user_id: session.user.id }).select().single();
      if (!error) setTrades(t => [dbTradeToApp(data), ...t]);
    }
    setForm(emptyTrade); setShowForm(false);
  };

  const deleteTrade = async (id) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (!error) setTrades(t => t.filter(tr => tr.id !== id));
  };

  const startEdit = (tr) => { setForm({ ...tr }); setEditId(tr.id); setShowForm(true); };

  const exportCSV = () => {
    const rows = [["Date", "Ticker", "Direction", "Lots", "Leverage", "Entry", "Exit", "Position Value", "Margin", "Gross P&L", "Fees", "Net P&L", "Notes"]];
    trades.forEach(t => {
      const pl = calcPL(t, assets);
      const asset = assets.find(a => a.ticker === t.ticker);
      rows.push([t.date, t.ticker, t.direction, t.lots, asset?.leverage ? `${asset.leverage}x` : "—", t.entryPrice, t.exitPrice || "", fmt(pl?.positionValue), fmt(pl?.margin), fmt(pl?.gross), fmt(pl?.fees), fmt(pl?.net), t.notes || ""]);
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "cfd_trades.csv"; a.click();
  };

  const saveAsset = async () => {
    if (!newAsset.ticker || !newAsset.lotSize || !newAsset.feePerLot) return;
    const payload = { ticker: newAsset.ticker, name: newAsset.name, lot_size: newAsset.lotSize, fee_per_lot: newAsset.feePerLot, leverage: newAsset.leverage };
    if (editAssetId !== null) {
      const { data, error } = await supabase.from("assets").update(payload).eq("id", editAssetId).select().single();
      if (!error) setAssets(a => a.map(x => x.id === editAssetId ? dbAssetToApp(data) : x));
      setEditAssetId(null);
    } else {
      const { data, error } = await supabase.from("assets").insert({ ...payload, user_id: session.user.id }).select().single();
      if (!error) setAssets(a => [...a, dbAssetToApp(data)]);
    }
    setNewAsset({ ticker: "", name: "", lotSize: "", feePerLot: "", leverage: "" });
  };

  const deleteAsset = async (id) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (!error) setAssets(a => a.filter(x => x.id !== id));
  };

  const previewPL = useMemo(() => {
    const asset = assets.find(a => a.ticker === form.ticker);
    if (!form.ticker || !form.entryPrice || !form.lots || !asset) return null;
    const positionValue = form.entryPrice * asset.lotSize * form.lots;
    const margin = asset.leverage ? positionValue / asset.leverage : positionValue;
    const fees = asset.feePerLot * form.lots;
    if (!form.exitPrice) return { margin, positionValue, fees, gross: null, net: null };
    const dir = form.direction === "Long" ? 1 : -1;
    const gross = dir * (form.exitPrice - form.entryPrice) * asset.lotSize * form.lots;
    return { gross, fees, net: gross - fees, margin, positionValue };
  }, [form, assets]);

  // ── Auth gates ────────────────────────────────────────────────────────────
  const loadingScreen = (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: FONT }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      <span style={{ fontSize: "0.75rem", color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authReady) return loadingScreen;
  if (!session) {
    if (!showAuth) return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    return <AuthPage />;
  }
  if (!loaded) return loadingScreen;

  // ── Shared input field component (inline) ─────────────────────────────────
  const Field = ({ label, children }) => (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
    </div>
  );

  const inp = (override = {}) => ({
    ...inputStyle,
    ...override,
    onFocus: e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.background = "rgba(255,255,255,0.06)"; },
    onBlur:  e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.04)"; },
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${BG}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        select option { background: #0F172A; color: #F1F5F9; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .tab-content { animation: fadeIn 0.2s ease; }
        tr:hover td { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: BG, color: "#F8FAFC", fontFamily: FONT, position: "relative" }}>
        {/* Background grid */}
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0, pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: "-10%", right: "10%", width: "40vw", height: "40vh", background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />

        {/* ── Sticky Nav ── */}
        <div style={{ position: "sticky", top: "10px", zIndex: 100, padding: "0 1rem", marginBottom: "0.75rem" }}>
          <nav style={{
            ...glass({ borderRadius: "14px", padding: "0.65rem 1.25rem" }),
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
            {/* Logo */}
            <div style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F8FAFC", flexShrink: 0 }}>
              <span style={{ color: "#F59E0B" }}>CFD</span> Register
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.2rem", background: "rgba(0,0,0,0.25)", borderRadius: "10px", padding: "3px", flex: "0 1 auto" }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "0.38rem 0.9rem", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em",
                  transition: "all 0.2s",
                  background: tab === t ? "rgba(139,92,246,0.22)" : "transparent",
                  color: tab === t ? "#C4B5FD" : "#475569",
                  boxShadow: tab === t ? "0 0 12px rgba(139,92,246,0.2)" : "none",
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* User + logout */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              <span style={{ fontSize: "0.7rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                {session.user.email?.split("@")[0]}
              </span>
              <Btn variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Sign out
              </Btn>
            </div>
          </nav>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem 3rem", position: "relative", zIndex: 1 }}>

          {/* ════════════════════════════════════════
              TRADES TAB
          ════════════════════════════════════════ */}
          {tab === "Trades" && (
            <div className="tab-content">
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <StatCard label="Total Trades" value={trades.length} color="#3B82F6" />
                <StatCard label="Net P&L" value={(stats.totalPL >= 0 ? "+" : "") + fmt(stats.totalPL)} color={stats.totalPL >= 0 ? "#22C55E" : "#EF4444"} />
                <StatCard label="Win Rate" value={fmt(stats.winRate, 1) + "%"} color="#A855F7" />
                <StatCard label="Closed" value={stats.closed} color="#F59E0B" sub={`${stats.wins}W / ${stats.losses}L`} />
              </div>

              {/* P&L% Chart */}
              <Card style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <SectionLabel>Net P&L % per trade</SectionLabel>
                    <div style={{ fontSize: "0.72rem", color: "#334155" }}>Return on margin for each closed trade</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#4ADE80" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#22C55E", display: "inline-block" }} />
                      Profit
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#F87171" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#EF4444", display: "inline-block" }} />
                      Loss
                    </span>
                  </div>
                </div>
                <PLPercentBars trades={trades} assets={assets} />
              </Card>

              {/* Toolbar */}
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <Btn variant={showForm ? "ghost" : "primary"} onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyTrade); }}>
                  {showForm ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel</>
                  ) : (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Trade</>
                  )}
                </Btn>
                <Btn variant="ghost" onClick={exportCSV}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Export CSV
                </Btn>
                <div style={{ flex: 1, maxWidth: "240px" }}>
                  <input
                    style={{ ...inputStyle, padding: "0.5rem 0.85rem" }}
                    placeholder="Search ticker, direction…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>
              </div>

              {/* Trade form */}
              {showForm && (
                <Card style={{ marginBottom: "1.25rem", borderColor: "rgba(139,92,246,0.2)" }}>
                  <SectionLabel>{editId ? "Edit Trade" : "Log New Trade"}</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <Field label="Ticker">
                      <select style={inp()} value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })}>
                        <option value="">Select asset…</option>
                        {assets.map(a => <option key={a.id} value={a.ticker}>{a.ticker} — {a.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Direction">
                      <select style={inp()} value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
                        <option>Long</option><option>Short</option>
                      </select>
                    </Field>
                    <Field label="Date">
                      <input style={inp()} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </Field>
                    <Field label="Lots">
                      <input style={inp()} type="number" step="0.01" placeholder="e.g. 0.5" value={form.lots} onChange={e => setForm({ ...form, lots: e.target.value })} />
                    </Field>
                    <Field label="Entry Price">
                      <input style={inp()} type="number" step="any" placeholder="e.g. 2350.50" value={form.entryPrice} onChange={e => setForm({ ...form, entryPrice: e.target.value })} />
                    </Field>
                    <Field label={<>Exit Price <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span></>}>
                      <input style={inp()} type="number" step="any" placeholder="Leave blank if open" value={form.exitPrice} onChange={e => setForm({ ...form, exitPrice: e.target.value })} />
                    </Field>
                    <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
                      <input style={inp()} placeholder="Optional notes…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </Field>
                  </div>

                  {/* P&L preview strip */}
                  {previewPL && (
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", padding: "0.65rem 0.85rem", background: "rgba(0,0,0,0.25)", borderRadius: "8px", marginBottom: "0.75rem", flexWrap: "wrap", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ color: "#64748B" }}>Position: <strong style={{ color: "#60A5FA" }}>{fmt(previewPL.positionValue)}</strong></span>
                      <span style={{ color: "#64748B" }}>Margin: <strong style={{ color: "#A78BFA" }}>{fmt(previewPL.margin)}</strong></span>
                      <span style={{ color: "#64748B" }}>Fees: <strong style={{ color: "#F59E0B" }}>−{fmt(previewPL.fees)}</strong></span>
                      {previewPL.gross !== null && <span style={{ color: "#64748B" }}>Gross: <strong style={{ color: previewPL.gross >= 0 ? "#4ADE80" : "#F87171" }}>{fmt(previewPL.gross)}</strong></span>}
                      {previewPL.net !== null && <span style={{ color: "#64748B" }}>Net: <strong style={{ color: previewPL.net >= 0 ? "#4ADE80" : "#F87171" }}>{(previewPL.net >= 0 ? "+" : "") + fmt(previewPL.net)}</strong></span>}
                      {previewPL.net !== null && previewPL.margin > 0 && (
                        <span style={{ color: "#64748B" }}>Return: <strong style={{ color: previewPL.net >= 0 ? "#4ADE80" : "#F87171" }}>{(previewPL.net >= 0 ? "+" : "") + fmt((previewPL.net / previewPL.margin) * 100, 1)}%</strong></span>
                      )}
                    </div>
                  )}

                  <Btn variant="success" onClick={saveTrade}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {editId ? "Update Trade" : "Save Trade"}
                  </Btn>
                </Card>
              )}

              {/* Trades table */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {filtered.length === 0 ? (
                  <EmptyState
                    msg={trades.length === 0 ? "No trades yet — click New Trade to get started." : "No trades match your search."}
                    icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          {["Date", "Ticker", "Dir", "Lots", "Lev", "Entry", "Exit", "Margin", "Gross", "Fees", "Net P&L", "P&L %", ""].map(h => (
                            <th key={h} style={{ padding: "0.75rem", textAlign: "left", color: "#334155", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((tr, i) => {
                          const pl = calcPL(tr, assets);
                          const asset = assets.find(a => a.ticker === tr.ticker);
                          const plPct = pl && pl.margin > 0 ? (pl.net / pl.margin) * 100 : null;
                          return (
                            <tr key={tr.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.1s" }}>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#64748B", whiteSpace: "nowrap" }}>{fmtDate(tr.date)}</td>
                              <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: "#60A5FA" }}>{tr.ticker}</td>
                              <td style={{ padding: "0.65rem 0.75rem" }}><Badge color={tr.direction === "Long" ? "green" : "red"}>{tr.direction}</Badge></td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#94A3B8" }}>{tr.lots}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#A78BFA", fontWeight: 600 }}>{asset?.leverage ? `${asset.leverage}x` : "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#94A3B8" }}>{fmt(tr.entryPrice)}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#94A3B8" }}>{tr.exitPrice ? fmt(tr.exitPrice) : <span style={{ color: "#1E293B" }}>open</span>}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#A78BFA" }}>{pl ? fmt(pl.margin) : "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: pl?.gross >= 0 ? "#4ADE80" : "#F87171" }}>{pl ? fmt(pl.gross) : "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#F59E0B" }}>{pl ? fmt(pl.fees) : "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: pl?.net >= 0 ? "#4ADE80" : "#F87171" }}>
                                {pl && tr.exitPrice ? (pl.net >= 0 ? "+" : "") + fmt(pl.net) : "—"}
                              </td>
                              <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: plPct !== null ? (plPct >= 0 ? "#4ADE80" : "#F87171") : "#334155" }}>
                                {plPct !== null ? (plPct >= 0 ? "+" : "") + fmt(plPct, 1) + "%" : "—"}
                              </td>
                              <td style={{ padding: "0.65rem 0.75rem" }}>
                                <div style={{ display: "flex", gap: "0.3rem" }}>
                                  <Btn variant="ghost" size="sm" onClick={() => startEdit(tr)}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </Btn>
                                  <Btn variant="danger" size="sm" onClick={() => deleteTrade(tr.id)}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                                  </Btn>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════
              ASSETS DB TAB
          ════════════════════════════════════════ */}
          {tab === "Assets DB" && (
            <div className="tab-content">
              <Card style={{ marginBottom: "1.25rem", borderColor: editAssetId ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.15)" }}>
                <SectionLabel>{editAssetId ? "Edit Asset" : "Add New Asset"}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  {[
                    { label: "Ticker", key: "ticker", ph: "e.g. XAUUSD", upper: true },
                    { label: "Name", key: "name", ph: "e.g. Gold" },
                    { label: "Lot Size (units)", key: "lotSize", ph: "e.g. 100", num: true },
                    { label: "Fee / Lot (USD)", key: "feePerLot", ph: "e.g. 0.35", num: true, step: "0.01" },
                    { label: "Leverage", key: "leverage", ph: "e.g. 20", num: true, step: "1" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        style={inp()}
                        type={f.num ? "number" : "text"}
                        step={f.step}
                        placeholder={f.ph}
                        value={newAsset[f.key]}
                        onChange={e => setNewAsset({ ...newAsset, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Btn variant={editAssetId ? "gold" : "success"} onClick={saveAsset}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {editAssetId ? <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
                    </svg>
                    {editAssetId ? "Update Asset" : "Add Asset"}
                  </Btn>
                  {editAssetId && (
                    <Btn variant="ghost" onClick={() => { setEditAssetId(null); setNewAsset({ ticker: "", name: "", lotSize: "", feePerLot: "", leverage: "" }); }}>
                      Cancel
                    </Btn>
                  )}
                </div>
              </Card>

              <Card style={{ padding: 0, overflow: "hidden" }}>
                {assets.length === 0 ? (
                  <EmptyState
                    msg="No assets yet — add your first CFD instrument above."
                    icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>}
                  />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          {["Ticker", "Name", "Lot Size", "Fee / Lot", "Leverage", "Trades", ""].map(h => (
                            <th key={h} style={{ padding: "0.75rem", textAlign: "left", color: "#334155", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map(a => {
                          const tradeCount = trades.filter(t => t.ticker === a.ticker).length;
                          return (
                            <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.1s" }}>
                              <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: "#60A5FA" }}>{a.ticker}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#94A3B8" }}>{a.name || "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#94A3B8" }}>{Number(a.lotSize).toLocaleString()}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#F59E0B", fontWeight: 600 }}>${fmt(a.feePerLot)}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#A78BFA", fontWeight: 700 }}>{a.leverage ? `${a.leverage}×` : "—"}</td>
                              <td style={{ padding: "0.65rem 0.75rem", color: "#475569" }}>{tradeCount}</td>
                              <td style={{ padding: "0.65rem 0.75rem" }}>
                                <div style={{ display: "flex", gap: "0.3rem" }}>
                                  <Btn variant="ghost" size="sm" onClick={() => { setEditAssetId(a.id); setNewAsset({ ticker: a.ticker, name: a.name || "", lotSize: a.lotSize, feePerLot: a.feePerLot, leverage: a.leverage || "" }); }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </Btn>
                                  <Btn variant="danger" size="sm" onClick={() => deleteAsset(a.id)}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                                  </Btn>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════
              CHARTS TAB
          ════════════════════════════════════════ */}
          {tab === "Charts" && (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Card>
                <SectionLabel>Equity Curve — Cumulative Net P&L</SectionLabel>
                <div style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "1rem" }}>Running total of net profit/loss across all closed trades</div>
                <EquityCurveChart trades={trades} assets={assets} />
              </Card>

              <Card>
                <SectionLabel>Net P&L % per Trade</SectionLabel>
                <div style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "1rem" }}>Return on margin for each closed trade, sorted by date</div>
                <PLPercentBars trades={trades} assets={assets} />
              </Card>

              <Card>
                <SectionLabel>Net P&L per Trade — Absolute</SectionLabel>
                <div style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "1rem" }}>Raw profit/loss in USD per closed trade</div>
                <PnlBarChart trades={trades} assets={assets} />
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════
              SUMMARY TAB
          ════════════════════════════════════════ */}
          {tab === "Summary" && (
            <div className="tab-content">
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {[
                  { label: "Total Trades",  value: trades.length,    color: "#3B82F6" },
                  { label: "Closed Trades", value: stats.closed,     color: "#6366F1" },
                  { label: "Net P&L",       value: (stats.totalPL >= 0 ? "+" : "") + fmt(stats.totalPL), color: stats.totalPL >= 0 ? "#22C55E" : "#EF4444" },
                  { label: "Win Rate",      value: fmt(stats.winRate, 1) + "%", color: "#A855F7" },
                  { label: "Wins",          value: stats.wins,       color: "#22C55E" },
                  { label: "Losses",        value: stats.losses,     color: "#EF4444" },
                  { label: "Avg Win",       value: "+" + fmt(stats.avgWin), color: "#4ADE80" },
                  { label: "Avg Loss",      value: fmt(stats.avgLoss), color: "#F87171" },
                ].map(s => <StatCard key={s.label} {...s} />)}
              </div>

              {/* Cumulative P&L sparkline */}
              <Card style={{ marginBottom: "1.25rem" }}>
                <SectionLabel>Cumulative P&L trend</SectionLabel>
                {stats.cumulative.length >= 2
                  ? <Sparkline data={stats.cumulative} />
                  : <EmptyState msg="Need at least 2 closed trades." />}
              </Card>

              {/* Per-asset breakdown */}
              <Card>
                <SectionLabel>Performance by Asset</SectionLabel>
                {assets.length === 0
                  ? <EmptyState msg="No assets configured yet." />
                  : assets.map(a => {
                    const atrades = trades.filter(t => t.ticker === a.ticker && t.exitPrice);
                    const pls = atrades.map(t => calcPL(t, assets)?.net ?? 0);
                    const total = pls.reduce((x, y) => x + y, 0);
                    const wins = pls.filter(p => p > 0).length;
                    const cumPls = pls.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: "1rem", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "120px" }}>
                          <span style={{ color: "#60A5FA", fontWeight: 700, fontSize: "0.85rem" }}>{a.ticker}</span>
                          <span style={{ fontSize: "0.7rem", color: "#334155" }}>{a.name}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>{atrades.length} trades</span>
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>WR: {atrades.length ? fmt((wins / atrades.length) * 100, 0) : "—"}%</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: total >= 0 ? "#4ADE80" : "#F87171" }}>
                          {total >= 0 ? "+" : ""}{fmt(total)}
                        </span>
                        <Sparkline data={cumPls} />
                      </div>
                    );
                  })
                }
              </Card>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
