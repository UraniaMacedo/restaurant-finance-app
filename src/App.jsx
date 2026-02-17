import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Weekly from "./pages/Weekly/Weekly.jsx";
import Annual from "./pages/Annual/Annual.jsx";
import Layout from "./components/layout/Layout.jsx";
import Monthly from "./pages/Monthly/Monthly.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/daily" element={<Dashboard />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/annual" element={<Annual />} />
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to="/daily" replace />} />
      <Route path="*" element={<Navigate to="/daily" replace />} />
    </Routes>
  );
}
