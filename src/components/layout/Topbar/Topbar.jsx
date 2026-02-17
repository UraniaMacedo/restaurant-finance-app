import React from "react";
import "./topbar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { usePeriod } from "../../../context/PeriodContext.jsx";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase/firebase";

const BRAND = "Kobi hibachi & sushi";

function buildYears() {
  const y = new Date().getFullYear();
  return [y - 2, y - 1, y, y + 1, y + 2];
}

const MONTHS = [
  { v: 1, l: "Jan" }, { v: 2, l: "Feb" }, { v: 3, l: "Mar" }, { v: 4, l: "Apr" },
  { v: 5, l: "May" }, { v: 6, l: "Jun" }, { v: 7, l: "Jul" }, { v: 8, l: "Aug" },
  { v: 9, l: "Sep" }, { v: 10, l: "Oct" }, { v: 11, l: "Nov" }, { v: 12, l: "Dec" },
];

export default function Topbar() {
  const navigate = useNavigate();
  const period = usePeriod() || {};

  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    setYear = () => {},
    setMonth = () => {},
    currency = "EUR",
    setCurrency = () => {},
  } = period;

  const YEARS = React.useMemo(() => buildYears(), []);

  async function onLogout() {
    try {
      await signOut(auth);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="topbar">
      <div className="topbarLeft">
        <div className="topbarLogo" />
        <div className="topbarText">
          <div className="topbarBrand">{BRAND}</div>
          <div className="topbarSub">Restaurant Finance</div>
        </div>
      </div>

      <div className="topbarRight">

        {/* NAV */}
        <NavLink to="/daily" className={({ isActive }) => `menu-link ${isActive ? "isActive" : ""}`}>
          <button type="button" className="menu-btn">Daily</button>
        </NavLink>
        <NavLink to="/weekly" className={({ isActive }) => `menu-link ${isActive ? "isActive" : ""}`}>
          <button type="button" className="menu-btn">Weekly</button>
        </NavLink>
        <NavLink to="/monthly" className={({ isActive }) => `menu-link ${isActive ? "isActive" : ""}`}>
          <button type="button" className="menu-btn">Monthly</button>
        </NavLink>
        <NavLink to="/annual" className={({ isActive }) => `menu-link ${isActive ? "isActive" : ""}`}>
          <button type="button" className="menu-btn">Annual</button>
        </NavLink>

        {/* FILTERS */}
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m) => (
            <option key={m.v} value={m.v}>{m.l}</option>
          ))}
        </select>

        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="EUR">Euro (€)</option>
          <option value="USD">US Dollar ($)</option>
          <option value="GBP">Pound (£)</option>
          <option value="BRL">Real (R$)</option>
        </select>

        <button type="button" className="logout-btn" onClick={onLogout} title="Log out">
          Logout
        </button>

      </div>
    </header>
  );
}
