import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource-variable/space-grotesk/index.css";
import "./index.css";
import App from "./App.tsx";
import { SolanaProviders } from "./solana/WalletContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <SolanaProviders>
        <App />
      </SolanaProviders>
    </HashRouter>
  </StrictMode>
);
