import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../store";
import "../styles/index.css";
import App from "./App";
import { ThemeProvider } from "../context/ThemeContext";
import { I18nProvider } from "../i18n/I18nContext";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
