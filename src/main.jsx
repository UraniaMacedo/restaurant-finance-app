import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/theme.css";
import "./index.css";
import App from "./App.jsx";
import { PeriodProvider } from "./context/PeriodContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PeriodProvider>
          <App />
        </PeriodProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

