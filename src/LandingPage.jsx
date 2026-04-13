import { useState, useEffect, useRef, useMemo } from "react";

// ── Demo assets for the chart preview ────────────────────────────────────────
const DEMO_ASSETS = [
  { ticker: "BTC/USD",  name: "Bitcoin",    color: "#F59E0B", base: 67543.20, vol: 420,  decimals: 2 },
  { ticker: "EUR/USD",  name: "Euro/Dollar", color: "#3B82F6", base: 1.08720,  vol: 0.0012, decimals: 5 },
  { ticker: "XAU/USD",  name: "Gold",        color: "#EAB308", base: 2345.80,  vol: 8.5,  decimals: 2 },
  { ticker: "AAPL",     name: "Apple Inc.",  color: "#22C55E", base: 189.45,   vol: 1.2,  decimals: 2 },
  { ticker: "SPX500",   name: "S&P 500",    color: "#8B5CF6", base: 5234.18,  vol: 18,   decimals: 2 },
];

function generateSeries(base, vol, points = 60) {
  const data = [base];
  for (let i = 1; i < points; i++) {
    const prev = data[i - 1];
    const change = (Math.random() - 0.49) * vol;
    data.push(Math.max(prev + change, base * 0.85));
  }
  return data;
}

function PriceChart({ asset, height = 160 }) {
  const [series, setSeries] = useState(() => generateSeries(asset.base, asset.vol));
  const intervalRef = useRef(null);

  useEffect(() => {
    setSeries(generateSeries(asset.base, asset.vol));
  }, [asset.ticker]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeries(prev => {
        const last = prev[prev.length - 1];
        const next = Math.max(last + (Math.random() - 0.49) * asset.vol, asset.base * 0.85);
        return [...prev.slice(1), next];
      });
    }, 800);
    return () => clearInterval(intervalRef.current);
  }, [asset.ticker, asset.vol]);

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const W = 500, H = height;
  const pad = { l: 8, r: 8, t: 12, b: 4 };

  const pts = series.map((v, i) => {
    const x = pad.l + (i / (series.length - 1)) * (W - pad.l - pad.r);
    const y = pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b);
    return [x, y];
  });

  const polyline = pts.map(p => p.join(",")).join(" ");
  const area = `M${pts[0].join(",")} ${pts.map(p => `L${p.join(",")}`).join(" ")} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`;

  const positive = series[series.length - 1] >= series[0];
  const color = positive ? "#22C55E" : "#EF4444";
  const current = series[series.length - 1];
  const pct = ((series[series.length - 1] - series[0]) / series[0] * 100).toFixed(2);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
            {current.toFixed(asset.decimals)}
          </div>
          <div style={{ fontSize: "0.75rem", color: asset.decimals > 2 ? "#94A3B8" : "#94A3B8" }}>
            {asset.name}
          </div>
        </div>
        <div style={{
          background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${positive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color,
          padding: "0.25rem 0.6rem",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.25rem"
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            {positive
              ? <path d="M5 2L9 8H1L5 2Z" fill={color}/>
              : <path d="M5 8L9 2H1L5 8Z" fill={color}/>}
          </svg>
          {positive ? "+" : ""}{pct}%
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id={`grad-${asset.ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${asset.ticker})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.length > 0 && (
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3.5" fill={color} opacity="0.9">
            <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
    </div>
  );
}

// ── Glass card helper ─────────────────────────────────────────────────────────
const glassCard = (extra = {}) => ({
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  ...extra,
});

// ── Security features ─────────────────────────────────────────────────────────
const SECURITY_FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Row-Level Security",
    desc: "Supabase RLS policies enforce strict per-user data isolation at the database level.",
    color: "#F59E0B",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    title: "Encrypted at Rest",
    desc: "All trade data and credentials are encrypted at rest using AES-256 on Supabase infrastructure.",
    color: "#8B5CF6",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "Secure Auth Sessions",
    desc: "JWT-based authentication with automatic token rotation and secure session management.",
    color: "#3B82F6",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "TLS Encrypted Transit",
    desc: "All data in transit is protected with TLS 1.3. No unencrypted connections allowed.",
    color: "#22C55E",
  },
];

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: "Trade Journal",
    desc: "Log every CFD trade with entry, exit, direction, lots, and notes. Filter and search instantly.",
    accent: "#3B82F6",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: "P&L Analytics",
    desc: "Automatic P&L calculation with gross, fees, net — plus equity curve and win-rate breakdown.",
    accent: "#22C55E",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ),
    title: "Asset Database",
    desc: "Manage your custom asset universe with lot sizes, fees, and leverage for precise margin calculations.",
    accent: "#F59E0B",
  },
];

// ── Trust badges ──────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { label: "Built on Supabase", sub: "PostgreSQL + Auth" },
  { label: "React 18", sub: "Vite production build" },
  { label: "Zero telemetry", sub: "Your data stays yours" },
  { label: "Open source", sub: "Auditable codebase" },
];

export default function LandingPage({ onGetStarted }) {
  const [selectedAsset, setSelectedAsset] = useState(DEMO_ASSETS[0]);
  const [menuOpen, setMenuOpen] = useState(false);

  // subtle grid animation counter
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const styles = {
    root: {
      minHeight: "100vh",
      background: "#080E1A",
      color: "#F8FAFC",
      fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
      overflowX: "hidden",
    },
    // background grid
    gridBg: {
      position: "fixed",
      inset: 0,
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
      zIndex: 0,
      pointerEvents: "none",
    },
    // radial glow
    glow: {
      position: "fixed",
      top: "-20%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "70vw",
      height: "60vh",
      background: "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
      zIndex: 0,
      pointerEvents: "none",
    },
    content: { position: "relative", zIndex: 1 },
    // ── Navbar ──
    nav: {
      position: "sticky",
      top: "12px",
      margin: "12px 16px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.75rem 1.25rem",
      ...glassCard({ borderRadius: "14px" }),
      zIndex: 100,
    },
    navLogo: { fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F8FAFC" },
    navLogoAccent: { color: "#F59E0B" },
    navCta: {
      padding: "0.45rem 1.1rem",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      color: "#fff",
      fontSize: "0.8rem",
      fontWeight: 600,
      fontFamily: "inherit",
      letterSpacing: "0.04em",
      transition: "opacity 0.15s, transform 0.15s",
      boxShadow: "0 0 18px rgba(139,92,246,0.35)",
    },
    // ── Hero ──
    hero: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "6rem 1.5rem 4rem",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4rem",
      alignItems: "center",
    },
    heroTag: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
      background: "rgba(245,158,11,0.1)",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#F59E0B",
      padding: "0.3rem 0.75rem",
      borderRadius: "20px",
      fontSize: "0.72rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: "1.25rem",
    },
    heroH1: {
      fontSize: "clamp(2rem, 4vw, 3.2rem)",
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: "-0.03em",
      color: "#F8FAFC",
      marginBottom: "1.25rem",
    },
    heroH1Accent: {
      background: "linear-gradient(135deg, #F59E0B, #FBBF24)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    heroSub: {
      fontSize: "1.05rem",
      color: "#94A3B8",
      lineHeight: 1.65,
      marginBottom: "2rem",
      maxWidth: "440px",
    },
    heroBtns: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
    btnPrimary: {
      padding: "0.7rem 1.6rem",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      color: "#fff",
      fontSize: "0.9rem",
      fontWeight: 600,
      fontFamily: "inherit",
      letterSpacing: "0.03em",
      transition: "all 0.2s",
      boxShadow: "0 0 24px rgba(139,92,246,0.4)",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    btnGhost: {
      padding: "0.7rem 1.4rem",
      borderRadius: "10px",
      cursor: "pointer",
      background: "transparent",
      color: "#CBD5E1",
      fontSize: "0.9rem",
      fontWeight: 600,
      fontFamily: "inherit",
      letterSpacing: "0.03em",
      transition: "all 0.2s",
      border: "1px solid rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    // ── Chart panel ──
    chartPanel: {
      ...glassCard({ padding: "1.5rem" }),
      boxShadow: "0 0 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    assetTabs: {
      display: "flex",
      gap: "0.4rem",
      flexWrap: "wrap",
      marginBottom: "1.25rem",
    },
    assetTab: (active, color) => ({
      padding: "0.3rem 0.75rem",
      borderRadius: "20px",
      border: `1px solid ${active ? color : "rgba(255,255,255,0.08)"}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : "#64748B",
      fontSize: "0.72rem",
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.15s",
      letterSpacing: "0.04em",
    }),
    // ── Sections ──
    section: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "5rem 1.5rem",
    },
    sectionLabel: {
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#8B5CF6",
      marginBottom: "0.75rem",
    },
    sectionH2: {
      fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      color: "#F8FAFC",
      marginBottom: "1rem",
      lineHeight: 1.2,
    },
    sectionSub: {
      color: "#64748B",
      fontSize: "1rem",
      lineHeight: 1.65,
      maxWidth: "520px",
      marginBottom: "3rem",
    },
    grid3: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.25rem",
    },
    featureCard: {
      ...glassCard({ padding: "1.75rem" }),
      transition: "border-color 0.2s, transform 0.2s",
      cursor: "default",
    },
    featureIcon: (color) => ({
      width: "44px",
      height: "44px",
      borderRadius: "10px",
      background: `${color}18`,
      border: `1px solid ${color}28`,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "1rem",
    }),
    featureTitle: {
      fontSize: "1rem",
      fontWeight: 700,
      color: "#F1F5F9",
      marginBottom: "0.5rem",
    },
    featureDesc: {
      fontSize: "0.875rem",
      color: "#64748B",
      lineHeight: 1.6,
    },
    // ── Security section ──
    securityWrap: {
      background: "linear-gradient(135deg, rgba(8,14,26,0) 0%, rgba(139,92,246,0.04) 50%, rgba(8,14,26,0) 100%)",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    },
    securityGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: "1rem",
    },
    securityCard: (color) => ({
      ...glassCard({ padding: "1.5rem" }),
      borderLeft: `2px solid ${color}55`,
      transition: "border-color 0.2s",
    }),
    securityIconWrap: (color) => ({
      color,
      marginBottom: "0.75rem",
      opacity: 0.9,
    }),
    securityTitle: {
      fontSize: "0.9rem",
      fontWeight: 700,
      color: "#E2E8F0",
      marginBottom: "0.4rem",
    },
    securityDesc: {
      fontSize: "0.8rem",
      color: "#64748B",
      lineHeight: 1.55,
    },
    // ── Trust bar ──
    trustBar: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "3rem 1.5rem",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    },
    trustLabel: {
      textAlign: "center",
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#334155",
      marginBottom: "1.5rem",
    },
    trustRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "3rem",
      flexWrap: "wrap",
    },
    trustItem: {
      textAlign: "center",
    },
    trustItemLabel: {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "#475569",
    },
    trustItemSub: {
      fontSize: "0.7rem",
      color: "#334155",
      marginTop: "0.2rem",
    },
    // ── Footer ──
    footer: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "1.5rem",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "1rem",
    },
    footerLogo: { fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155" },
    footerLink: { fontSize: "0.8rem", color: "#475569", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", transition: "color 0.15s" },
  };

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div style={styles.root}>
        {/* Background layers */}
        <div style={styles.gridBg} />
        <div style={styles.glow} />

        <div style={styles.content}>
          {/* ── Navbar ────────────────────────────────────────────────────── */}
          <nav style={styles.nav}>
            <div style={styles.navLogo}>
              <span style={styles.navLogoAccent}>CFD</span> Register
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#475569" }}>Personal trade journal</span>
              <button
                style={styles.navCta}
                onClick={onGetStarted}
                onMouseEnter={e => { e.target.style.opacity = "0.85"; e.target.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }}
              >
                Sign In
              </button>
            </div>
          </nav>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <section style={styles.hero}>
            <div>
              <div style={styles.heroTag}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" fill="#F59E0B"/>
                  <circle cx="5" cy="5" r="2">
                    <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="fill" values="#F59E0B;#F59E0B;#F59E0B" dur="2s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Live chart preview
              </div>
              <h1 style={styles.heroH1}>
                Your Professional<br />
                <span style={styles.heroH1Accent}>CFD Trade Journal</span>
              </h1>
              <p style={styles.heroSub}>
                Track every position, calculate P&amp;L automatically, and analyse your performance across any CFD instrument — all in one secure place.
              </p>
              <div style={styles.heroBtns}>
                <button
                  style={styles.btnPrimary}
                  onClick={onGetStarted}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 32px rgba(139,92,246,0.55)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(139,92,246,0.4)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                  </svg>
                  Get Started Free
                </button>
                <button
                  style={styles.btnGhost}
                  onClick={onGetStarted}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#F1F5F9"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#CBD5E1"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8"/>
                  </svg>
                  Sign In
                </button>
              </div>
            </div>

            {/* Chart panel */}
            <div style={styles.chartPanel}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E", animation: "pulse 2s infinite" }}/>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                    Live Demo
                  </span>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#334155" }}>Simulated data</span>
              </div>

              {/* Asset selector */}
              <div style={styles.assetTabs}>
                {DEMO_ASSETS.map(a => (
                  <button
                    key={a.ticker}
                    style={styles.assetTab(selectedAsset.ticker === a.ticker, a.color)}
                    onClick={() => setSelectedAsset(a)}
                  >
                    {a.ticker}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <PriceChart asset={selectedAsset} height={150} />

              {/* Mini stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { label: "Leverage", value: "Up to 20x" },
                  { label: "Fee/Lot", value: "Dynamic" },
                  { label: "Direction", value: "Long / Short" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>{s.label}</div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94A3B8" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Features ──────────────────────────────────────────────────── */}
          <section style={styles.section}>
            <div style={styles.sectionLabel}>What you get</div>
            <h2 style={styles.sectionH2}>Everything a serious<br />CFD trader needs</h2>
            <p style={styles.sectionSub}>
              From trade entry to equity curve analysis — built for precision, designed for speed.
            </p>
            <div style={styles.grid3}>
              {FEATURES.map(f => (
                <div
                  key={f.title}
                  style={styles.featureCard}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${f.accent}30`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={styles.featureIcon(f.accent)}>
                    {f.icon}
                  </div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Security ──────────────────────────────────────────────────── */}
          <div style={styles.securityWrap}>
            <section style={styles.section}>
              <div style={styles.sectionLabel}>Security first</div>
              <h2 style={styles.sectionH2}>
                Your trade data is<br />
                <span style={{ color: "#F59E0B" }}>nobody else's business</span>
              </h2>
              <p style={styles.sectionSub}>
                Built on battle-tested infrastructure with multiple layers of protection. Your data never leaves your account.
              </p>
              <div style={styles.securityGrid}>
                {SECURITY_FEATURES.map(f => (
                  <div
                    key={f.title}
                    style={styles.securityCard(f.color)}
                    onMouseEnter={e => { e.currentTarget.style.borderLeftColor = f.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderLeftColor = `${f.color}55`; }}
                  >
                    <div style={styles.securityIconWrap(f.color)}>{f.icon}</div>
                    <div style={styles.securityTitle}>{f.title}</div>
                    <div style={styles.securityDesc}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Security badge strip */}
              <div style={{ marginTop: "2.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                {["PostgreSQL RLS", "AES-256 at rest", "TLS 1.3 in transit", "JWT Auth", "Zero data sharing"].map(badge => (
                  <div key={badge} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.18)",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.72rem",
                    color: "#22C55E",
                    fontWeight: 500,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {badge}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── CTA banner ────────────────────────────────────────────────── */}
          <section style={{ ...styles.section, padding: "4rem 1.5rem" }}>
            <div style={{
              ...glassCard({ padding: "3rem", textAlign: "center" }),
              background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.06))",
              boxShadow: "0 0 60px rgba(139,92,246,0.08)",
            }}>
              <div style={styles.sectionLabel}>Start now — it's free</div>
              <h2 style={{ ...styles.sectionH2, marginBottom: "0.75rem" }}>Ready to track smarter?</h2>
              <p style={{ ...styles.sectionSub, margin: "0 auto 2rem", textAlign: "center" }}>
                Sign up and start logging your trades in under 60 seconds. No card required.
              </p>
              <button
                style={{ ...styles.btnPrimary, margin: "0 auto", padding: "0.9rem 2.5rem", fontSize: "1rem" }}
                onClick={onGetStarted}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(139,92,246,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(139,92,246,0.4)"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                Get Started Free
              </button>
            </div>
          </section>

          {/* ── Trust indicators ──────────────────────────────────────────── */}
          <div style={styles.trustBar}>
            <div style={styles.trustLabel}>Powered by trusted infrastructure</div>
            <div style={styles.trustRow}>
              {TRUST_ITEMS.map(t => (
                <div key={t.label} style={styles.trustItem}>
                  <div style={styles.trustItemLabel}>{t.label}</div>
                  <div style={styles.trustItemSub}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer style={styles.footer}>
            <div style={styles.footerLogo}>
              <span style={{ color: "#F59E0B" }}>CFD</span> Register
            </div>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "#1E293B" }}>Personal use only. Not financial advice.</span>
              <button
                style={styles.footerLink}
                onClick={onGetStarted}
                onMouseEnter={e => { e.target.style.color = "#94A3B8"; }}
                onMouseLeave={e => { e.target.style.color = "#475569"; }}
              >
                Sign In
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
