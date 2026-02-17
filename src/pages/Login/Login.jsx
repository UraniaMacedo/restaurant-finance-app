import React from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../firebase/firebase";

export default function Login() {
  const nav = useNavigate();

  const mode = "login"; // 🔒 force login only
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [errMsg, setErrMsg] = React.useState("");

  function humanError(err) {
    const code = err?.code || "";
    if (code.includes("invalid-email")) return "Invalid email.";
    if (code.includes("user-not-found")) return "User not found.";
    if (code.includes("wrong-password") || code.includes("invalid-credential"))
      return "Wrong email or password.";
    if (code.includes("network-request-failed")) return "Network error.";
    return err?.message || "Error";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErrMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) {
      setErrMsg("Fill email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      nav("/daily", { replace: true });
    } catch (err) {
      setErrMsg(humanError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setMsg("");
    setErrMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrMsg("Enter your email first.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setMsg("Password reset email sent. (Check spam too)");
    } catch (err) {
      setErrMsg(humanError(err));
    } finally {
      setLoading(false);
    }
  }

  // 👇 TODO seu objeto S continua igual (não alterei)


  const S = {
    page: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 18,
      background:
        "radial-gradient(900px 500px at 15% 10%, rgba(99,102,241,.30), transparent 60%)," +
        "radial-gradient(900px 500px at 85% 15%, rgba(34,197,94,.18), transparent 60%)," +
        "radial-gradient(900px 600px at 70% 95%, rgba(245,158,11,.14), transparent 60%)," +
        "#070b14",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      color: "#e5e7eb",
    },

    stack: {
      width: "100%",
      maxWidth: 1080,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      alignItems: "stretch",
    },

    card: {
      width: "100%",
      borderRadius: 28,
      padding: 24,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      boxShadow: "0 30px 90px rgba(0,0,0,.55)",
      backdropFilter: "blur(10px)",
      minHeight: 520,
    },

    // ✅ App card now uses flex so we can "use" the empty space nicely
    appCard: {
      width: "100%",
      borderRadius: 28,
      padding: 24,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      boxShadow: "0 30px 90px rgba(0,0,0,.55)",
      backdropFilter: "blur(10px)",
      minHeight: 520,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },

    brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    brand: { display: "flex", alignItems: "center", gap: 10 },
    dot: { width: 12, height: 12, borderRadius: 4, background: "rgba(99,102,241,.95)" },
    brandText: { fontWeight: 950 },
    badge: {
      fontSize: 12,
      fontWeight: 900,
      padding: "7px 10px",
      borderRadius: 999,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      color: "rgba(255,255,255,.85)",
      whiteSpace: "nowrap",
    },

    title: { marginTop: 14, fontSize: 26, lineHeight: 1.1, fontWeight: 1000 },
    subtitle: { marginTop: 8, opacity: 0.78, fontWeight: 700 },

    form: { marginTop: 18, display: "grid", gap: 12 },
    label: { fontSize: 12, fontWeight: 950, opacity: 0.8, marginBottom: 6 },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.22)",
      color: "#e5e7eb",
      outline: "none",
      fontWeight: 850,
    },

    primary: {
      marginTop: 4,
      width: "100%",
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(99,102,241,.55)",
      background: "linear-gradient(180deg, rgba(99,102,241,.95), rgba(79,70,229,.95))",
      color: "#fff",
      fontWeight: 1000,
      cursor: "pointer",
      boxShadow: "0 12px 30px rgba(79,70,229,.35)",
    },

    secondaryRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },

    linkBtn: {
      border: "none",
      background: "transparent",
      color: "rgba(229,231,235,.92)",
      fontWeight: 900,
      cursor: "pointer",
      textDecoration: "underline",
      padding: 0,
      opacity: 0.9,
    },

    info: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 16,
      background: "rgba(34,197,94,.12)",
      border: "1px solid rgba(34,197,94,.28)",
      fontWeight: 850,
      fontSize: 13,
    },
    error: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 16,
      background: "rgba(239,68,68,.14)",
      border: "1px solid rgba(239,68,68,.30)",
      fontWeight: 850,
      fontSize: 13,
    },

    bottomSwitch: {
      marginTop: 18,
      paddingTop: 14,
      borderTop: "1px solid rgba(255,255,255,.10)",
      display: "grid",
      gap: 10,
    },

    ghostBtn: {
      width: "100%",
      padding: "11px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.05)",
      color: "rgba(255,255,255,.92)",
      fontWeight: 950,
      cursor: "pointer",
    },

    small: { marginTop: 10, opacity: 0.75, fontWeight: 800, fontSize: 12 },

    // App info
    appTitle: { fontSize: 18, fontWeight: 1000, marginBottom: 6 },
    appSub: { opacity: 0.8, fontWeight: 750, lineHeight: 1.35 },
    appList: { marginTop: 12, display: "grid", gap: 8 },
    appItem: { display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 800, opacity: 0.92 },
    appBullet: {
      width: 18,
      height: 18,
      borderRadius: 6,
      background: "rgba(34,197,94,.20)",
      border: "1px solid rgba(34,197,94,.35)",
      display: "grid",
      placeItems: "center",
      fontSize: 12,
      flex: "0 0 auto",
      marginTop: 1,
    },

    // ✅ NEW: “spacer”/footer area to consume the empty space nicely
    appFooter: {
      marginTop: 18,
      paddingTop: 14,
      borderTop: "1px solid rgba(255,255,255,.10)",
      display: "grid",
      gap: 10,
    },
    appTipPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 16,
      background: "rgba(255,255,255,.05)",
      border: "1px solid rgba(255,255,255,.10)",
      fontWeight: 900,
      color: "rgba(255,255,255,.90)",
      width: "fit-content",
    },
    appMini: { opacity: 0.78, fontWeight: 800, fontSize: 12, lineHeight: 1.35 },
  };

  const isLogin = mode === "login";

  return (
    <div style={S.page}>
      <div
        style={{
          ...S.stack,
          gridTemplateColumns: window.innerWidth < 980 ? "1fr" : "1fr 1fr",
          maxWidth: window.innerWidth < 980 ? 520 : 1080,
        }}
      >
        {/* ✅ App Info card (with spacing fixed) */}
        <div style={S.appCard}>
          {/* top */}
          <div>
            <div style={S.brandRow}>
              <div style={S.brand}>
                <div style={S.dot} />
                <div style={S.brandText}>Kobi Finance</div>
              </div>
              <div style={S.badge}>Restaurant dashboard</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={S.appTitle}>Track your restaurant performance in one place.</div>
              <div style={S.appSub}>
                Register daily income and expenses, then view weekly, monthly and annual summaries to
                understand profit and margins.
              </div>

              <div style={S.appList}>
                <div style={S.appItem}>
                  <div style={S.appBullet}>✓</div>
                  Daily register (Cash / Card / Delivery + Expenses)
                </div>
                <div style={S.appItem}>
                  <div style={S.appBullet}>✓</div>
                  Weekly, Monthly and Annual reports
                </div>
                <div style={S.appItem}>
                  <div style={S.appBullet}>✓</div>
                  Firestore storage (secure per user)
                </div>
              </div>
            </div>
          </div>

          {/* bottom (fills the remaining space nicely) */}
          <div style={S.appFooter}>
            <div style={S.appTipPill}>
              <span style={{ opacity: 0.9 }}>💡</span>
              <span>One account per person</span>
            </div>
            <div style={S.appMini}>
              Use your email + password to access the dashboard. If you forget your password, use
              “Forgot password?” on the login card.
            </div>
          </div>
        </div>

        {/* ✅ Login card */}
        <div style={S.card}>
          <div style={S.brandRow}>
            <div style={S.brand}>
              <div style={S.dot} />
              <div style={S.brandText}>Kobi hibachi & sushi</div>
            </div>
            <div style={S.badge}>Secure access • 2026</div>
          </div>

         <div style={S.title}>Login</div>

          <div style={S.subtitle}>
  Log in to record daily income/expenses and track profit.
</div>


          <form style={S.form} onSubmit={handleSubmit}>
            <div>
              <div style={S.label}>Email</div>
              <input
                style={S.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div style={S.label}>Password</div>
              <input
                style={S.input}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            <button type="submit" style={S.primary} disabled={loading}>
              {loading ? "Please wait..." : "Login"}
            </button>
          </form>

          <div style={S.secondaryRow}>
            <button type="button" style={S.linkBtn} onClick={handleReset} disabled={loading}>
              Forgot password?
            </button>

            <div style={{ opacity: 0.75, fontWeight: 800, fontSize: 12 }}>
  Access provided by administrator
</div>

          </div>

          {!!msg && <div style={S.info}>{msg}</div>}
          {!!errMsg && <div style={S.error}>{errMsg}</div>}
        </div>
      </div>
    </div>
  );
} 