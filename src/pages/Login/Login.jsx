import React from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../firebase/firebase";

export default function Login() {
  const nav = useNavigate();

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
      setMsg("Password reset email sent.");
    } catch (err) {
      setErrMsg(humanError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#070b14",
      color: "#fff",
      fontFamily: "system-ui"
    }}>
      <div style={{
        width: 360,
        padding: 24,
        borderRadius: 16,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.1)"
      }}>
        <h2>Login</h2>
        <p style={{ opacity: .7 }}>
          Access provided by administrator
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: 10, borderRadius: 8 }}
          />

          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, borderRadius: 8 }}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>

        <button
          onClick={handleReset}
          style={{ marginTop: 12, background: "transparent", color: "#9ca3af" }}
        >
          Forgot password?
        </button>

        {msg && <div style={{ marginTop: 10, color: "#22c55e" }}>{msg}</div>}
        {errMsg && <div style={{ marginTop: 10, color: "#ef4444" }}>{errMsg}</div>}
      </div>
    </div>
  );
}
