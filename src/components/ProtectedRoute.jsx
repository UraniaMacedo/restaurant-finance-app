import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  // proteção extra: se useAuth der erro, não derruba tudo
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.error("ProtectedRoute: useAuth crashed:", e);
    return <Navigate to="/login" replace />;
  }

  const { user, loading } = auth || {};

  if (loading) return <div style={{ padding: 24, color: "#fff" }}>Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

