import React from "react";
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar/Topbar.jsx";

export default function Layout() {
  return (
    <>
      <Topbar />
      <Outlet />
    </>
  );
}
