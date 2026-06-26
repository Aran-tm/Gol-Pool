// Devnet airdrop helper with retries across multiple RPC endpoints.
//   npm run txline:airdrop
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

const KEYPAIR_PATH = path.resolve("worker", "devnet-keypair.json");
const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
const pubkey = kp.publicKey;
console.log("Funding:", pubkey.toBase58());

const RPCS = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com/?api-key=demo",
  "https://rpc.ankr.com/solana_devnet",
];
const AMOUNTS = [2, 1, 0.5];

async function balance(): Promise<number> {
  const c = new Connection("https://api.devnet.solana.com", "confirmed");
  return (await c.getBalance(pubkey)) / LAMPORTS_PER_SOL;
}

async function tryAirdrop(rpc: string, amount: number): Promise<boolean> {
  try {
    const c = new Connection(rpc, "confirmed");
    const sig = await c.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL);
    await c.confirmTransaction(sig, "confirmed");
    console.log(`  ✅ ${amount} SOL via ${rpc}`);
    return true;
  } catch (e: any) {
    console.log(`  ✗ ${amount} SOL via ${rpc.split("?")[0]}: ${e?.message?.slice(0, 80)}`);
    return false;
  }
}

async function main() {
  console.log("Start balance:", (await balance()).toFixed(4), "SOL");
  for (const rpc of RPCS) {
    for (const amount of AMOUNTS) {
      if (await tryAirdrop(rpc, amount)) {
        console.log("Final balance:", (await balance()).toFixed(4), "SOL");
        return;
      }
    }
  }
  console.log("\n⚠️  All RPC airdrops failed (rate limited).");
  console.log("Fund manually at https://faucet.solana.com with address:");
  console.log("  ", pubkey.toBase58());
}
main();
