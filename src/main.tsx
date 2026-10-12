import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { getConfig } from "@mezo-org/passport";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";
import App from "./App";
import { mezoTestnet } from "./config/chains";

const queryClient = new QueryClient();

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ??
  "YOUR_WALLETCONNECT_PROJECT_ID";

const wagmiConfig = getConfig({
  appName: "Alto",
  mezoNetwork: "testnet",
  walletConnectProjectId,
  chains: [mezoTestnet],
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={mezoTestnet}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
