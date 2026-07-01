import { type FC, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { WalletError } from "@solana/wallet-adapter-base";
import { NETWORKS, type Network } from "../lib/txlineConfig";
import "@solana/wallet-adapter-react-ui/styles.css";

// The network we run against. User funded their Phantom on mainnet.
export const ACTIVE_NETWORK: Network = "mainnet";

// Wallet adapter errors (rejected connection, wallet not installed, etc.) only
// go to console.error by default — nothing shows up in the UI. This surfaces
// them so a failed connect isn't indistinguishable from a stuck one.
const WalletErrorContext = createContext<{ message: string | null; clear: () => void }>({
  message: null,
  clear: () => {},
});
export const useWalletError = () => useContext(WalletErrorContext);

function friendlyError(error: WalletError): string {
  if (error.name === "WalletNotReadyError") return "Phantom isn't installed or enabled in this browser.";
  if (error.name === "WalletConnectionError") return "Connection was rejected or timed out — try again.";
  return error.message || "Wallet connection failed.";
}

export const SolanaProviders: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC || NETWORKS[ACTIVE_NETWORK].cluster,
    [],
  );
  // Empty array: Phantom & other Wallet-Standard wallets are auto-detected.
  const wallets = useMemo(() => [], []);
  const [message, setMessage] = useState<string | null>(null);
  const clear = useCallback(() => setMessage(null), []);
  const onError = useCallback((error: WalletError) => {
    console.error(error);
    setMessage(friendlyError(error));
  }, []);

  return (
    <WalletErrorContext.Provider value={{ message, clear }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect onError={onError}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </WalletErrorContext.Provider>
  );
};
