// Network config for the TxLINE ingestion worker (server-side only).

export type Network = "devnet" | "mainnet";

export const NETWORKS = {
  devnet: {
    cluster: "https://api.devnet.solana.com",
    txlineBase: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  },
  mainnet: {
    cluster: "https://api.mainnet-beta.solana.com",
    txlineBase: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
  },
} as const;

// Free real-time World Cup tier (no TxL tokens needed). Use 1 for 60s-delay.
export const SERVICE_LEVEL_ID = 12;
export const DURATION_WEEKS = 4;
export const SELECTED_LEAGUES: number[] = []; // empty = standard bundle
