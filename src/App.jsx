import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import AuthPage from "./Auth";


const TABS = ["Trades", "Assets DB", "Charts", "Summary"];

const fmt = (n, d = 2) =>
  n === undefined || n === null || isNaN(n)
    ? "—"
    : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    : "—";

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

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 120, H = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  const positive = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ trades, assets }) {
  const data = trades.filter((t) => t.exitPrice).map((t) => {
    const pl = calcPL(t, assets);
    return { label: t.ticker, value: pl?.net ?? 0 };
  });
  if (!data.length) return <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No closed trades yet.</p>;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
          <span style={{ width: "60px", color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, background: "#1e293b", borderRadius: "4px", overflow: "hidden", height: "20px" }}>
            <div style={{ height: "100%", width: `${(Math.abs(d.value) / max) * 100}%`, background: d.value >= 0 ? "#22c55e" : "#ef4444", borderRadius: "4px", transition: "width 0.4s ease" }} />
          </div>
          <span style={{ width: "70px", color: d.value >= 0 ? "#22c55e" : "#ef4444", textAlign: "right", flexShrink: 0 }}>
            {d.value >= 0 ? "+" : ""}{fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EquityCurve({ trades, assets }) {
  const closed = trades.filter((t) => t.exitPrice).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (closed.length < 2) return <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>Need at least 2 closed trades for the equity curve.</p>;
  let cum = 0;
  const points = closed.map((t) => { const pl = calcPL(t, assets); cum += pl?.net ?? 0; return { value: cum }; });
  const min = Math.min(0, ...points.map((p) => p.value));
  const max = Math.max(0, ...points.map((p) => p.value));
  const range = max - min || 1;
  const W = 500, H = 160;
  const pts = points.map((p, i) => {
    const x = 30 + (i / (points.length - 1)) * (W - 40);
    const y = H - 10 - ((p.value - min) / range) * (H - 20);
    return `${x},${y}`;
  });
  const zeroY = H - 10 - ((0 - min) / range) * (H - 20);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <line x1="30" y1={zeroY} x2={W - 10} y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = 30 + (i / (points.length - 1)) * (W - 40);
        const y = H - 10 - ((p.value - min) / range) * (H - 20);
        return <circle key={i} cx={x} cy={y} r="3.5" fill={p.value >= 0 ? "#22c55e" : "#ef4444"} />;
      })}
    </svg>
  );
}

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

  // ── Auth session ──────────────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadData() {
      const userId = session.user.id;
      const { data: tradesData, error: tradesError } = await supabase.from("trades").select("*").eq("user_id", userId).order("date", { ascending: false });
      const { data: assetsData, error: assetsError } = await supabase.from("assets").select("*").eq("user_id", userId);

      if (tradesData) setTrades(tradesData.map(dbTradeToApp))

      if (assetsData) setAssets(assetsData.map(dbAssetToApp));

      setLoaded(true)
    }
    loadData()
  }, [session])

  // DB row -> app object
  function dbTradeToApp(row) {
    return {
      id: row.id,
      ticker: row.ticker,
      direction: row.direction,
      date: row.date,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price,
      lots: row.lots,
      notes: row.notes
    }
  }

  function dbAssetToApp(row) {
    return {
      id: row.id,
      ticker: row.ticker,
      name: row.name,
      lotSize: row.lot_size,
      feePerLot: row.fee_per_lot,
      leverage: row.leverage
    }
  }

  // ── Persist helpers ───────────────────────────────────────────────────────

  // ── Derived state ─────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => trades.filter((t) =>
      t.ticker.toLowerCase().includes(filter.toLowerCase()) ||
      t.direction.toLowerCase().includes(filter.toLowerCase()) ||
      (t.notes || "").toLowerCase().includes(filter.toLowerCase())
    ),
    [trades, filter]
  );

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.exitPrice);
    const pls = closed.map((t) => calcPL(t, assets)?.net ?? 0);
    const wins = pls.filter((p) => p > 0).length;
    const totalPL = pls.reduce((a, b) => a + b, 0);
    const avgWin = wins ? pls.filter((p) => p > 0).reduce((a, b) => a + b, 0) / wins : 0;
    const losses = pls.filter((p) => p < 0).length;
    const avgLoss = losses ? pls.filter((p) => p < 0).reduce((a, b) => a + b, 0) / losses : 0;
    const cumulative = pls.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
    return { closed: closed.length, wins, losses, winRate: closed.length ? (wins / closed.length) * 100 : 0, totalPL, avgWin, avgLoss, cumulative };
  }, [trades, assets]);

  const saveTrade = async () => {
    if (!form.ticker || !form.entryPrice || !form.lots) return;
    if (editId !== null) {
      const { data: updatedData, error: updateError } = await supabase.from("trades").update({
        ticker: form.ticker,
        direction: form.direction,
        date: form.date,
        entry_price: parseFloat(form.entryPrice),
        exit_price: form.exitPrice !== "" ? parseFloat(form.exitPrice) : null,
        lots: parseFloat(form.lots),
        notes: form.notes
      }).eq("id", editId).select().single();
      if (!updateError) setTrades((t) => t.map((tr) => tr.id === editId ? dbTradeToApp(updatedData) : tr));
      setEditId(null);
    } else {
      const { data, error } = await supabase.from("trades").insert({
        user_id: session.user.id,
        ticker: form.ticker,
        direction: form.direction,
        date: form.date,
        entry_price: parseFloat(form.entryPrice),
        exit_price: form.exitPrice !== "" ? parseFloat(form.exitPrice) : null,
        lots: parseFloat(form.lots),
        notes: form.notes
      }).select().single();
      if (!error) setTrades((t) => [dbTradeToApp(data), ...t]);
    }
    setForm(emptyTrade);
    setShowForm(false);
  };

  const deleteTrade = async (id) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (!error) setTrades((t) => t.filter((tr) => tr.id !== id));
  };
  const startEdit = (tr) => { setForm({ ...tr }); setEditId(tr.id); setShowForm(true); };

  const exportCSV = () => {
    const rows = [["Date", "Ticker", "Direction", "Lots", "Leverage", "Entry", "Exit", "Position Value", "Margin", "Gross P&L", "Fees", "Net P&L", "Notes"]];
    trades.forEach((t) => {
      const pl = calcPL(t, assets);
      const asset = assets.find((a) => a.ticker === t.ticker);
      rows.push([t.date, t.ticker, t.direction, t.lots, asset?.leverage ? `${asset.leverage}x` : "—", t.entryPrice, t.exitPrice || "", fmt(pl?.positionValue), fmt(pl?.margin), fmt(pl?.gross), fmt(pl?.fees), fmt(pl?.net), t.notes || ""]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "revolut_cfd_trades.csv";
    a.click();
  };

  const saveAsset = async () => {
    if (!newAsset.ticker || !newAsset.lotSize || !newAsset.feePerLot) return;
    if (editAssetId !== null) {
      const { data: updatedAssetData, error: updatedAssetError } = await supabase.from("assets").update({
        ticker: newAsset.ticker,
        name: newAsset.name,
        lot_size: newAsset.lotSize,
        fee_per_lot: newAsset.feePerLot,
        leverage: newAsset.leverage
      }).eq("id", editAssetId).select().single();
      if (!updatedAssetError) setAssets((a) => a.map((x) => x.id === editAssetId ? dbAssetToApp(updatedAssetData) : x));
      setEditAssetId(null);
    } else {
      const { data: assetData, error: assetError } = await supabase.from("assets").insert({
        user_id: session.user.id,
        ticker: newAsset.ticker,
        name: newAsset.name,
        lot_size: newAsset.lotSize,
        fee_per_lot: newAsset.feePerLot,
        leverage: newAsset.leverage
      }).select().single();
      if (!assetError) setAssets((a) => [...a, dbAssetToApp(assetData)]);
    }
    setNewAsset({ ticker: "", name: "", lotSize: "", feePerLot: "", leverage: "" });
  };

  const deleteAsset = async (id) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (!error) setAssets((a) => a.filter((x) => x.id !== id));
  };

  const previewPL = useMemo(() => {
    const asset = assets.find((a) => a.ticker === form.ticker);
    if (!form.ticker || !form.entryPrice || !form.lots || !asset) return null;
    const positionValue = form.entryPrice * asset.lotSize * form.lots;
    const margin = asset.leverage ? positionValue / asset.leverage : positionValue;
    const fees = asset.feePerLot * form.lots;
    if (!form.exitPrice) return { margin, positionValue, fees, gross: null, net: null };
    const dir = form.direction === "Long" ? 1 : -1;
    const gross = dir * (form.exitPrice - form.entryPrice) * asset.lotSize * form.lots;
    return { gross, fees, net: gross - fees, margin, positionValue };
  }, [form, assets]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    app: { minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0", fontFamily: "'DM Mono', 'Fira Mono', monospace", padding: "1.5rem", boxSizing: "border-box" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" },
    logo: { fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.12em", color: "#f1f5f9", textTransform: "uppercase" },
    logoAccent: { color: "#3b82f6" },
    tabs: { display: "flex", gap: "0.25rem", background: "#0f172a", borderRadius: "10px", padding: "4px" },
    tab: (active) => ({ padding: "0.4rem 1rem", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.06em", transition: "all 0.2s", background: active ? "#1e40af" : "transparent", color: active ? "#fff" : "#64748b" }),
    card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" },
    statCard: (color) => ({ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "0.9rem 1rem", borderLeft: `3px solid ${color}` }),
    statLabel: { fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" },
    statVal: (color) => ({ fontSize: "1.25rem", fontWeight: 700, color }),
    btn: (variant) => ({
      padding: variant === "sm" ? "0.3rem 0.7rem" : "0.5rem 1.1rem",
      borderRadius: "7px", border: "none", cursor: "pointer", fontFamily: "inherit",
      fontWeight: 600, fontSize: variant === "sm" ? "0.7rem" : "0.8rem", letterSpacing: "0.05em", transition: "all 0.15s",
      background: variant === "danger" ? "#7f1d1d" : variant === "ghost" ? "transparent" : variant === "success" ? "#14532d" : "#1e40af",
      color: variant === "ghost" ? "#94a3b8" : "#fff",
      border: variant === "ghost" ? "1px solid #1e293b" : "none",
    }),
    input: { background: "#1e293b", border: "1px solid #334155", borderRadius: "7px", padding: "0.5rem 0.75rem", color: "#e2e8f0", fontFamily: "inherit", fontSize: "0.82rem", outline: "none", width: "100%", boxSizing: "border-box" },
    label: { fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem", display: "block" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
    th: { padding: "0.5rem 0.75rem", textAlign: "left", color: "#64748b", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid #1e293b" },
    td: { padding: "0.6rem 0.75rem", borderBottom: "1px solid #0f172a", verticalAlign: "middle" },
    row: (i) => ({ background: i % 2 === 0 ? "#0a0f1a" : "#0d1424" }),
    badge: (color) => ({ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, background: color === "green" ? "#14532d" : color === "red" ? "#7f1d1d" : "#1e3a5f", color: color === "green" ? "#4ade80" : color === "red" ? "#f87171" : "#60a5fa" }),
    search: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.45rem 0.85rem", color: "#e2e8f0", fontFamily: "inherit", fontSize: "0.8rem", outline: "none", width: "200px" },
    sectionTitle: { fontSize: "0.7rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.75rem", fontWeight: 700 },
  };

  if (!authReady) return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", letterSpacing: "0.1em" }}>
      LOADING…
    </div>
  );

  if (!session) return <AuthPage />;

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", letterSpacing: "0.1em" }}>
      LOADING…
    </div>
  );

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <span style={s.logoAccent}>↯</span> Revolut <span style={s.logoAccent}>CFD</span> Register
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.62rem", color: "#334155", letterSpacing: "0.08em" }}>💾 auto-saved</span>
          <div style={s.tabs}>
            {TABS.map((t) => (
              <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <button style={s.btn("ghost")} onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      </div>

      {/* ── TRADES TAB ── */}
      {tab === "Trades" && (
        <div>
          <div style={s.statGrid}>
            <div style={s.statCard("#3b82f6")}><div style={s.statLabel}>Total Trades</div><div style={s.statVal("#93c5fd")}>{trades.length}</div></div>
            <div style={s.statCard(stats.totalPL >= 0 ? "#22c55e" : "#ef4444")}><div style={s.statLabel}>Net P&L</div><div style={s.statVal(stats.totalPL >= 0 ? "#4ade80" : "#f87171")}>{stats.totalPL >= 0 ? "+" : ""}{fmt(stats.totalPL)}</div></div>
            <div style={s.statCard("#a855f7")}><div style={s.statLabel}>Win Rate</div><div style={s.statVal("#c084fc")}>{fmt(stats.winRate, 1)}%</div></div>
            <div style={s.statCard("#f59e0b")}><div style={s.statLabel}>Closed</div><div style={s.statVal("#fbbf24")}>{stats.closed}</div></div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <button style={s.btn()} onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyTrade); }}>
              {showForm ? "✕ Cancel" : "+ New Trade"}
            </button>
            <button style={s.btn("ghost")} onClick={exportCSV}>⬇ CSV</button>
            <input style={s.search} placeholder="Search ticker, direction…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>

          {showForm && (
            <div style={{ ...s.card, borderColor: "#1e3a5f", marginBottom: "1.25rem" }}>
              <div style={s.sectionTitle}>{editId ? "Edit Trade" : "Log New Trade"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={s.label}>Ticker</label>
                  <select style={s.input} value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })}>
                    <option value="">Select asset</option>
                    {assets.map((a) => <option key={a.id} value={a.ticker}>{a.ticker} — {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Direction</label>
                  <select style={s.input} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                    <option>Long</option><option>Short</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Date</label>
                  <input style={s.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Lots</label>
                  <input style={s.input} type="number" step="0.01" placeholder="e.g. 0.5" value={form.lots} onChange={(e) => setForm({ ...form, lots: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Entry Price</label>
                  <input style={s.input} type="number" step="any" placeholder="e.g. 2350.5" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Exit Price <span style={{ color: "#475569" }}>(opt.)</span></label>
                  <input style={s.input} type="number" step="any" placeholder="Leave blank if open" value={form.exitPrice} onChange={(e) => setForm({ ...form, exitPrice: e.target.value })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Notes</label>
                  <input style={s.input} placeholder="Optional notes…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              {previewPL && (
                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", padding: "0.6rem 0.75rem", background: "#0a0f1a", borderRadius: "8px", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <span>Position: <strong style={{ color: "#93c5fd" }}>{fmt(previewPL.positionValue)}</strong></span>
                  <span>Margin: <strong style={{ color: "#c084fc" }}>{fmt(previewPL.margin)}</strong></span>
                  <span>Fees: <strong style={{ color: "#fbbf24" }}>-{fmt(previewPL.fees)}</strong></span>
                  {previewPL.gross !== null && <span>Gross: <strong style={{ color: previewPL.gross >= 0 ? "#4ade80" : "#f87171" }}>{fmt(previewPL.gross)}</strong></span>}
                  {previewPL.net !== null && <span>Net: <strong style={{ color: previewPL.net >= 0 ? "#4ade80" : "#f87171" }}>{fmt(previewPL.net)}</strong></span>}
                </div>
              )}
              <button style={s.btn("success")} onClick={saveTrade}>✓ Save Trade</button>
            </div>
          )}

          <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <p style={{ color: "#475569", padding: "2rem", textAlign: "center" }}>No trades yet. Click "+ New Trade" to start.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>{["Date", "Ticker", "Dir", "Lots", "Lev", "Entry", "Exit", "Margin", "Gross", "Fees", "Net P&L", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((tr, i) => {
                      const pl = calcPL(tr, assets);
                      const asset = assets.find((a) => a.ticker === tr.ticker);
                      return (
                        <tr key={tr.id} style={s.row(i)}>
                          <td style={s.td}>{fmtDate(tr.date)}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: "#93c5fd" }}>{tr.ticker}</td>
                          <td style={s.td}><span style={s.badge(tr.direction === "Long" ? "green" : "red")}>{tr.direction}</span></td>
                          <td style={s.td}>{tr.lots}</td>
                          <td style={{ ...s.td, color: "#a78bfa" }}>{asset?.leverage ? `${asset.leverage}x` : "—"}</td>
                          <td style={s.td}>{fmt(tr.entryPrice)}</td>
                          <td style={s.td}>{tr.exitPrice ? fmt(tr.exitPrice) : <span style={{ color: "#334155" }}>open</span>}</td>
                          <td style={{ ...s.td, color: "#c084fc" }}>{pl ? fmt(pl.margin) : "—"}</td>
                          <td style={{ ...s.td, color: pl?.gross >= 0 ? "#4ade80" : "#f87171" }}>{pl ? fmt(pl.gross) : "—"}</td>
                          <td style={{ ...s.td, color: "#fbbf24" }}>{pl ? fmt(pl.fees) : "—"}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: pl?.net >= 0 ? "#4ade80" : "#f87171" }}>
                            {pl && tr.exitPrice ? (pl.net >= 0 ? "+" : "") + fmt(pl.net) : "—"}
                          </td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: "0.3rem" }}>
                              <button style={s.btn("sm")} onClick={() => startEdit(tr)}>✎</button>
                              <button style={s.btn("danger")} onClick={() => deleteTrade(tr.id)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ASSETS DB TAB ── */}
      {tab === "Assets DB" && (
        <div>
          <div style={s.card}>
            <div style={s.sectionTitle}>{editAssetId ? "Edit Asset" : "Add Asset"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div><label style={s.label}>Ticker</label><input style={s.input} placeholder="e.g. XAUUSD" value={newAsset.ticker} onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value.toUpperCase() })} /></div>
              <div><label style={s.label}>Name</label><input style={s.input} placeholder="e.g. Gold" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} /></div>
              <div><label style={s.label}>Lot Size (units)</label><input style={s.input} type="number" placeholder="e.g. 100" value={newAsset.lotSize} onChange={(e) => setNewAsset({ ...newAsset, lotSize: e.target.value })} /></div>
              <div><label style={s.label}>Fee / Lot (USD)</label><input style={s.input} type="number" step="0.01" placeholder="e.g. 0.35" value={newAsset.feePerLot} onChange={(e) => setNewAsset({ ...newAsset, feePerLot: e.target.value })} /></div>
              <div><label style={s.label}>Leverage</label><input style={s.input} type="number" step="1" placeholder="e.g. 20" value={newAsset.leverage} onChange={(e) => setNewAsset({ ...newAsset, leverage: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button style={s.btn("success")} onClick={saveAsset}>{editAssetId ? "✓ Update" : "+ Add Asset"}</button>
              {editAssetId && <button style={s.btn("ghost")} onClick={() => { setEditAssetId(null); setNewAsset({ ticker: "", name: "", lotSize: "", feePerLot: "", leverage: "" }); }}>Cancel</button>}
            </div>
          </div>
          <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
            <table style={s.table}>
              <thead><tr>{["Ticker", "Name", "Lot Size", "Fee / Lot", "Leverage", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={a.id} style={s.row(i)}>
                    <td style={{ ...s.td, fontWeight: 700, color: "#93c5fd" }}>{a.ticker}</td>
                    <td style={s.td}>{a.name}</td>
                    <td style={s.td}>{a.lotSize.toLocaleString()}</td>
                    <td style={{ ...s.td, color: "#fbbf24" }}>${fmt(a.feePerLot)}</td>
                    <td style={{ ...s.td, color: "#a78bfa", fontWeight: 700 }}>{a.leverage ? `${a.leverage}x` : "—"}</td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button style={s.btn("sm")} onClick={() => { setEditAssetId(a.id); setNewAsset({ ticker: a.ticker, name: a.name, lotSize: a.lotSize, feePerLot: a.feePerLot, leverage: a.leverage || "" }); }}>✎</button>
                        <button style={s.btn("danger")} onClick={() => deleteAsset(a.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "Charts" && (
        <div>
          <div style={s.card}><div style={s.sectionTitle}>Equity Curve (cumulative net P&L)</div><EquityCurve trades={trades} assets={assets} /></div>
          <div style={s.card}><div style={s.sectionTitle}>Net P&L per Trade</div><BarChart trades={trades} assets={assets} /></div>
        </div>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab === "Summary" && (
        <div>
          <div style={s.statGrid}>
            {[
              { label: "Total Trades", value: trades.length, color: "#3b82f6", fmt: (v) => v },
              { label: "Closed Trades", value: stats.closed, color: "#6366f1", fmt: (v) => v },
              { label: "Net P&L", value: stats.totalPL, color: stats.totalPL >= 0 ? "#22c55e" : "#ef4444", fmt: (v) => (v >= 0 ? "+" : "") + fmt(v) },
              { label: "Win Rate", value: stats.winRate, color: "#a855f7", fmt: (v) => fmt(v, 1) + "%" },
              { label: "Wins", value: stats.wins, color: "#22c55e", fmt: (v) => v },
              { label: "Losses", value: stats.losses, color: "#ef4444", fmt: (v) => v },
              { label: "Avg Win", value: stats.avgWin, color: "#4ade80", fmt: (v) => "+" + fmt(v) },
              { label: "Avg Loss", value: stats.avgLoss, color: "#f87171", fmt: (v) => fmt(v) },
            ].map((s2) => (
              <div key={s2.label} style={s.statCard(s2.color)}>
                <div style={s.statLabel}>{s2.label}</div>
                <div style={s.statVal(s2.color)}>{s2.fmt(s2.value)}</div>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>Cumulative P&L trend</div>
            <Sparkline data={stats.cumulative} />
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>By Asset</div>
            {assets.map((a) => {
              const atrades = trades.filter((t) => t.ticker === a.ticker && t.exitPrice);
              const pls = atrades.map((t) => calcPL(t, assets)?.net ?? 0);
              const total = pls.reduce((x, y) => x + y, 0);
              const wins = pls.filter((p) => p > 0).length;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #1e293b", fontSize: "0.8rem" }}>
                  <span style={{ color: "#93c5fd", fontWeight: 700, width: "80px" }}>{a.ticker}</span>
                  <span style={{ color: "#64748b" }}>{atrades.length} trades</span>
                  <span style={{ color: "#64748b" }}>WR: {atrades.length ? fmt((wins / atrades.length) * 100, 0) : "—"}%</span>
                  <span style={{ color: total >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{total >= 0 ? "+" : ""}{fmt(total)}</span>
                  <Sparkline data={pls.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], [])} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
