import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/index.css";
import App from "./App";
import { ThemeProvider } from "../context/ThemeContext";
import { I18nProvider } from "../i18n/I18nContext";
import { initMonitoring } from "../services/monitoring";

initMonitoring();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
