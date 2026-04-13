import { useState } from "react";
import { supabase } from "./supabaseClient";

// ── Shared styles ─────────────────────────────────────────────────────────────
const FONT = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";

const glass = (extra = {}) => ({
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  ...extra,
});

const inputBase = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "0.72rem 1rem",
  color: "#F1F5F9",
  fontFamily: FONT,
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.15s, background 0.15s",
};

const labelStyle = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#64748B",
  marginBottom: "0.4rem",
};

const fieldStyle = { marginBottom: "1rem" };

const errorBoxStyle = {
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.25)",
  borderRadius: "10px",
  padding: "0.65rem 1rem",
  fontSize: "0.8rem",
  color: "#FCA5A5",
  marginBottom: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const successBoxStyle = {
  ...errorBoxStyle,
  background: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.25)",
  color: "#86EFAC",
};

// ── Icon components ───────────────────────────────────────────────────────────
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconEye = ({ closed }) => closed ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

// ── Input with optional left icon and right password toggle ──────────────────
function Field({ label, id, icon, type = "text", value, onChange, placeholder, error, hint, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div style={fieldStyle}>
      {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span style={{ position: "absolute", left: "0.875rem", color: "#475569", pointerEvents: "none", display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={actualType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            ...inputBase,
            paddingLeft: icon ? "2.5rem" : "1rem",
            paddingRight: isPassword ? "2.75rem" : "1rem",
            borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)",
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? "rgba(239,68,68,0.7)" : "rgba(139,92,246,0.6)";
            e.target.style.background = "rgba(255,255,255,0.06)";
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)";
            e.target.style.background = "rgba(255,255,255,0.04)";
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: "0.875rem", color: "#475569", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#94A3B8"}
            onMouseLeave={e => e.currentTarget.style.color = "#475569"}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <IconEye closed={show} />
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: "0.72rem", color: "#FCA5A5", marginTop: "0.3rem" }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: "0.7rem", color: "#334155", marginTop: "0.3rem" }}>{hint}</div>}
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        width: "100%",
        padding: "0.78rem 1rem",
        borderRadius: "10px",
        border: "none",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        background: loading || disabled
          ? "rgba(139,92,246,0.35)"
          : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        color: "#fff",
        fontFamily: FONT,
        fontSize: "0.9rem",
        fontWeight: 600,
        letterSpacing: "0.03em",
        transition: "all 0.2s",
        boxShadow: loading || disabled ? "none" : "0 0 20px rgba(139,92,246,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      }}
      onMouseEnter={e => { if (!loading && !disabled) { e.currentTarget.style.boxShadow = "0 0 32px rgba(139,92,246,0.55)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = loading || disabled ? "none" : "0 0 20px rgba(139,92,246,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {loading ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          Processing…
        </>
      ) : children}
    </button>
  );
}

// ── Validation helpers ────────────────────────────────────────────────────────
const validateUsername = v => /^[a-zA-Z0-9_]{3,20}$/.test(v)
  ? null : "3–20 chars, letters, numbers and underscores only";
const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address";
const validatePassword = v => v.length >= 8 ? null : "At least 8 characters required";
const validateName = v => v.trim().length >= 1 ? null : "Required";

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    const uErr = validateUsername(form.username);
    if (uErr) e.username = uErr;
    const pErr = validatePassword(form.password);
    if (pErr) e.password = pErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setApiError("");
    setLoading(true);
    try {
      // Step 1: resolve username → email via RPC
      const { data: email, error: rpcError } = await supabase.rpc("get_email_by_username", {
        p_username: form.username.trim(),
      });
      if (rpcError || !email) {
        setApiError("Username not found. Check your username or sign up.");
        setLoading(false);
        return;
      }
      // Step 2: sign in with email + password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (signInError) {
        setApiError(signInError.message === "Invalid login credentials"
          ? "Incorrect password. Try again."
          : signInError.message);
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#F8FAFC", marginBottom: "0.35rem", letterSpacing: "-0.03em" }}>
          Welcome back
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#64748B" }}>
          Sign in to your trade journal
        </p>
      </div>

      {apiError && (
        <div style={errorBoxStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {apiError}
        </div>
      )}

      <Field
        label="Username"
        id="login-username"
        icon={<IconUser />}
        value={form.username}
        onChange={set("username")}
        placeholder="your_username"
        error={errors.username}
        autoComplete="username"
      />
      <Field
        label="Password"
        id="login-password"
        icon={<IconLock />}
        type="password"
        value={form.password}
        onChange={set("password")}
        placeholder="••••••••"
        error={errors.password}
        autoComplete="current-password"
      />

      <div style={{ marginTop: "1.5rem" }}>
        <PrimaryBtn type="submit" loading={loading}>
          <IconArrow /> Sign In
        </PrimaryBtn>
      </div>

      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <span style={{ fontSize: "0.82rem", color: "#475569" }}>
          No account yet?{" "}
        </span>
        <button
          type="button"
          onClick={onSwitch}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: "#A78BFA", fontWeight: 600, fontFamily: FONT, padding: 0, transition: "color 0.15s" }}
          onMouseEnter={e => e.target.style.color = "#C4B5FD"}
          onMouseLeave={e => e.target.style.color = "#A78BFA"}
        >
          Create an account
        </button>
      </div>
    </form>
  );
}

// ── Sign-up form ──────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }) {
  const [form, setForm] = useState({
    username: "", firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    const uErr = validateUsername(form.username);
    if (uErr) e.username = uErr;
    const fnErr = validateName(form.firstName);
    if (fnErr) e.firstName = fnErr;
    const lnErr = validateName(form.lastName);
    if (lnErr) e.lastName = lnErr;
    const emErr = validateEmail(form.email);
    if (emErr) e.email = emErr;
    const pwErr = validatePassword(form.password);
    if (pwErr) e.password = pwErr;
    if (!pwErr && form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setApiError("");
    setLoading(true);
    try {
      // Check if username is already taken
      const { data: existingEmail } = await supabase.rpc("get_email_by_username", {
        p_username: form.username.trim(),
      });
      if (existingEmail) {
        setErrors(err => ({ ...err, username: "Username already taken" }));
        setLoading(false);
        return;
      }

      // Create auth user — trigger auto-creates the profile row
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            username: form.username.trim().toLowerCase(),
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setErrors(err => ({ ...err, email: "Email already in use" }));
        } else {
          setApiError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "1rem 0" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "#22C55E" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F8FAFC", marginBottom: "0.5rem" }}>Account created</h3>
        <p style={{ fontSize: "0.875rem", color: "#64748B", lineHeight: 1.6, marginBottom: "1.75rem" }}>
          Check your inbox for a confirmation email, then sign in below.
        </p>
        <button
          onClick={onSwitch}
          style={{
            padding: "0.7rem 2rem", borderRadius: "10px", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff",
            fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 0 20px rgba(139,92,246,0.35)",
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#F8FAFC", marginBottom: "0.35rem", letterSpacing: "-0.03em" }}>
          Create account
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#64748B" }}>
          Start tracking your CFD trades today
        </p>
      </div>

      {apiError && (
        <div style={errorBoxStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {apiError}
        </div>
      )}

      <Field
        label="Username"
        id="signup-username"
        icon={<IconUser />}
        value={form.username}
        onChange={set("username")}
        placeholder="e.g. trader_luis"
        error={errors.username}
        hint="3–20 chars. Letters, numbers, underscores."
        autoComplete="username"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field
          label="First name"
          id="signup-firstname"
          value={form.firstName}
          onChange={set("firstName")}
          placeholder="Luis"
          error={errors.firstName}
          autoComplete="given-name"
        />
        <Field
          label="Last name"
          id="signup-lastname"
          value={form.lastName}
          onChange={set("lastName")}
          placeholder="García"
          error={errors.lastName}
          autoComplete="family-name"
        />
      </div>

      <Field
        label="Email"
        id="signup-email"
        icon={<IconMail />}
        type="email"
        value={form.email}
        onChange={set("email")}
        placeholder="you@example.com"
        error={errors.email}
        autoComplete="email"
      />

      <Field
        label="Password"
        id="signup-password"
        icon={<IconLock />}
        type="password"
        value={form.password}
        onChange={set("password")}
        placeholder="Minimum 8 characters"
        error={errors.password}
        autoComplete="new-password"
      />

      <Field
        label="Confirm password"
        id="signup-confirm"
        icon={<IconLock />}
        type="password"
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
        placeholder="Repeat your password"
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <div style={{ marginTop: "0.5rem" }}>
        <PrimaryBtn type="submit" loading={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Create Account
        </PrimaryBtn>
      </div>

      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <span style={{ fontSize: "0.82rem", color: "#475569" }}>Already have an account?{" "}</span>
        <button
          type="button"
          onClick={onSwitch}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: "#A78BFA", fontWeight: 600, fontFamily: FONT, padding: 0, transition: "color 0.15s" }}
          onMouseEnter={e => e.target.style.color = "#C4B5FD"}
          onMouseLeave={e => e.target.style.color = "#A78BFA"}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}

// ── Security badges for the left panel ───────────────────────────────────────
const BADGES = [
  "PostgreSQL Row-Level Security",
  "AES-256 encryption at rest",
  "TLS 1.3 in transit",
  "JWT session tokens",
  "Zero third-party data sharing",
];

// ── Left branding panel ───────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "3rem",
      gap: "2rem",
    }}>
      {/* Logo */}
      <div>
        <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F8FAFC", marginBottom: "1.5rem" }}>
          <span style={{ color: "#F59E0B" }}>CFD</span> Register
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#F8FAFC", marginBottom: "1rem" }}>
          Your trades.<br />
          <span style={{ background: "linear-gradient(135deg, #F59E0B, #FBBF24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Your data.
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "#64748B", lineHeight: 1.65, maxWidth: "340px" }}>
          A secure personal journal for tracking CFD positions, calculating real P&amp;L, and analysing your edge over time.
        </p>
      </div>

      {/* Security shield */}
      <div style={{ ...glass({ padding: "1.5rem", borderRadius: "16px" }) }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B", flexShrink: 0 }}>
            <IconShield />
          </div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#E2E8F0" }}>Security by default</div>
            <div style={{ fontSize: "0.7rem", color: "#475569" }}>Your data is protected at every layer</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {BADGES.map(b => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem", color: "#64748B" }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E", flexShrink: 0 }}>
                <IconCheck />
              </div>
              {b}
            </div>
          ))}
        </div>
      </div>

      {/* Mini stat teaser */}
      <div style={{ display: "flex", gap: "1rem" }}>
        {[
          { val: "100%", sub: "data isolation" },
          { val: "0", sub: "third parties" },
          { val: "∞", sub: "trade history" },
        ].map(s => (
          <div key={s.sub} style={{ flex: 1, ...glass({ padding: "0.875rem", borderRadius: "12px", textAlign: "center" }) }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F59E0B", letterSpacing: "-0.02em" }}>{s.val}</div>
            <div style={{ fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.2rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root auth page ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState("login");

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { margin: 0; padding: 0; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#080E1A",
        color: "#F8FAFC",
        fontFamily: FONT,
        display: "flex",
        alignItems: "stretch",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background grid */}
        <div style={{
          position: "fixed", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          zIndex: 0, pointerEvents: "none",
        }} />
        {/* Purple glow */}
        <div style={{
          position: "fixed", top: "-20%", left: "30%",
          width: "60vw", height: "60vh",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)",
          zIndex: 0, pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%", alignItems: "stretch" }}>

          {/* ── Left panel (hidden on small screens) ── */}
          <div style={{
            flex: "0 0 46%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.05)",
          }}
            className="auth-left-panel"
          >
            <BrandPanel />
          </div>

          {/* ── Right panel: form ── */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1.5rem",
            minHeight: "100vh",
          }}>
            {/* Back to landing */}
            <div style={{ width: "100%", maxWidth: "420px", marginBottom: "1.25rem" }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#334155", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#64748B"}
                onMouseLeave={e => e.currentTarget.style.color = "#334155"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back to home
              </a>
            </div>

            {/* Mode toggle */}
            <div style={{
              width: "100%",
              maxWidth: "420px",
              display: "flex",
              ...glass({ padding: "4px", borderRadius: "12px", marginBottom: "1.5rem" }),
            }}>
              {["login", "signup"].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: "0.55rem",
                    borderRadius: "9px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    transition: "all 0.2s",
                    background: mode === m ? "rgba(139,92,246,0.25)" : "transparent",
                    color: mode === m ? "#C4B5FD" : "#475569",
                    borderColor: mode === m ? "rgba(139,92,246,0.35)" : "transparent",
                  }}
                >
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Form card */}
            <div style={{
              width: "100%",
              maxWidth: "420px",
              ...glass({ padding: "2rem", borderRadius: "20px" }),
              boxShadow: "0 0 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              {mode === "login"
                ? <LoginForm onSwitch={() => setMode("signup")} />
                : <SignUpForm onSwitch={() => setMode("login")} />
              }
            </div>

            {/* Footer note */}
            <p style={{ marginTop: "1.5rem", fontSize: "0.72rem", color: "#1E293B", textAlign: "center", maxWidth: "320px" }}>
              Personal use only. Your data is private and never shared. Not financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive: hide left panel below 768px */}
      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </>
  );
}
