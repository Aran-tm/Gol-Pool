import { type FC, type ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { NETWORKS, type Network } from "../lib/txlineConfig";
import "@solana/wallet-adapter-react-ui/styles.css";

// The network we run against. User funded their Phantom on mainnet.
export const ACTIVE_NETWORK: Network = "mainnet";

export const SolanaProviders: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC || NETWORKS[ACTIVE_NETWORK].cluster,
    [],
  );
  // Empty array: Phantom & other Wallet-Standard wallets are auto-detected.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
