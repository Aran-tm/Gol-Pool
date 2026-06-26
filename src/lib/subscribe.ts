// Browser-side TxLINE subscription + API-token activation.
// Phantom signs the on-chain `subscribe` tx and the activation message —
// the private key never leaves the wallet.

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import {
  NETWORKS,
  SERVICE_LEVEL_ID,
  DURATION_WEEKS,
  SELECTED_LEAGUES,
  SUBSCRIBE_DISCRIMINATOR,
  SEED_PRICING_MATRIX,
  SEED_TOKEN_TREASURY,
  type Network,
} from "./txlineConfig";

// In the browser we route TxLINE API calls through the Vite dev proxy (/txapi)
// to avoid CORS. The worker (node) hits the real base directly — no CORS there.
const TXLINE_API = "/txapi";

function buildSubscribeData(serviceLevelId: number, weeks: number): Buffer {
  const data = new Uint8Array(8 + 2 + 1);
  data.set(SUBSCRIBE_DISCRIMINATOR, 0);
  const dv = new DataView(data.buffer);
  dv.setUint16(8, serviceLevelId, true); // u16 LE
  dv.setUint8(10, weeks); // u8
  return Buffer.from(data);
}

export interface SubscribeWallet {
  publicKey: PublicKey;
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface SubscribeResult {
  txSig: string;
  apiToken: string;
  jwt: string;
  walletAddress: string;
}

/** On-chain subscribe only. Returns the new tx signature. */
async function doSubscribe(
  wallet: SubscribeWallet,
  network: Network,
  onStep?: (msg: string) => void,
): Promise<string> {
  const step = (m: string) => onStep?.(m);
  const cfg = NETWORKS[network];
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC || cfg.cluster;
  const connection = new Connection(rpcUrl, "confirmed");
  const programId = new PublicKey(cfg.programId);
  const tokenMint = new PublicKey(cfg.txlMint);
  const user = wallet.publicKey;

  // Derive PDAs + token accounts.
  const [pricingMatrix] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_PRICING_MATRIX)],
    programId,
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_TOKEN_TREASURY)],
    programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    tokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const tx = new Transaction();

  // Create the user's TxL token account if it doesn't exist yet.
  try {
    await getAccount(connection, userTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
  } catch {
    step("Creating token account…");
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        tokenMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }

  // Subscribe instruction.
  tx.add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: pricingMatrix, isSigner: false, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
        { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: buildSubscribeData(SERVICE_LEVEL_ID, DURATION_WEEKS),
    }),
  );

  step("Approve the subscription in Phantom…");
  const txSig = await wallet.sendTransaction(tx, connection);
  step("Confirming on-chain…");
  try {
    await connection.confirmTransaction(txSig, "confirmed");
  } catch {
    // The RPC may be slow to confirm even though the tx landed — proceed to
    // activation, which validates the tx server-side anyway.
    step("Confirmation slow — proceeding (tx may already be final)…");
  }

  return txSig;
}

/** Run the full subscribe → activate flow. Returns the long-lived API token. */
export async function subscribeAndActivate(
  wallet: SubscribeWallet,
  network: Network,
  onStep?: (msg: string) => void,
): Promise<SubscribeResult> {
  const txSig = await doSubscribe(wallet, network, onStep);
  return activateToken(wallet, txSig, onStep);
}

/** Subscribe on-chain only (no activation). Returns the new tx signature. */
export async function subscribeOnly(
  wallet: SubscribeWallet,
  network: Network,
  onStep?: (msg: string) => void,
): Promise<string> {
  return doSubscribe(wallet, network, onStep);
}

interface SignerWallet {
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

/** Activation: guest JWT → sign message → activate. Shared by both entry points. */
async function activateToken(
  wallet: SignerWallet,
  txSig: string,
  onStep?: (msg: string) => void,
): Promise<SubscribeResult> {
  const step = (m: string) => onStep?.(m);
  step("Activating API access…");
  const authRes = await fetch(`${TXLINE_API}/auth/guest/start`, { method: "POST" });
  if (!authRes.ok) throw new Error(`guest/start ${authRes.status}`);
  const jwt = (await authRes.json()).token as string;

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  step("Sign the activation message in Phantom…");
  const sigBytes = await wallet.signMessage(new TextEncoder().encode(messageString));
  const walletSignature = btoa(String.fromCharCode(...sigBytes));

  const actRes = await fetch(`${TXLINE_API}/api/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
  });
  const rawBody = await actRes.text();
  if (!actRes.ok) throw new Error(`activate ${actRes.status}: ${rawBody}`);
  // The server may return the token as JSON ({token}) or as a plain-text string.
  let apiToken: string;
  try {
    const j = JSON.parse(rawBody);
    apiToken = (j.token ?? j) as string;
  } catch {
    apiToken = rawBody.trim();
  }

  return { txSig, apiToken, jwt, walletAddress: wallet.publicKey.toBase58() };
}

/** Activate the API token for an ALREADY-completed subscription (no SOL cost). */
export async function activateOnly(
  wallet: SignerWallet,
  txSig: string,
  onStep?: (msg: string) => void,
): Promise<SubscribeResult> {
  return activateToken(wallet, txSig, onStep);
}
