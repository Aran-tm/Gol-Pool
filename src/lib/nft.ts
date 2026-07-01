// Fetch a wallet's NFTs via the Metaplex DAS `getAssetsByOwner` method.
// Requires a DAS-capable RPC (Helius/Triton) in VITE_SOLANA_RPC — the public RPC
// used for plain wallet calls does NOT support DAS.

const RPC = import.meta.env.VITE_SOLANA_RPC as string | undefined;

export interface NftItem {
  id: string;
  name: string;
  image: string;
}

interface DasFile {
  uri?: string;
  cdn_uri?: string;
  mime?: string;
}
interface DasItem {
  id: string;
  content?: {
    links?: { image?: string };
    files?: DasFile[];
    metadata?: { name?: string };
  };
}

/** True if a DAS-capable RPC looks configured (heuristic on the URL). */
export function hasNftRpc(): boolean {
  return !!RPC && /helius|triton|das|quiknode|quicknode/i.test(RPC);
}

/** Fetch image NFTs owned by `owner`. Throws with a helpful message if no DAS RPC. */
export async function fetchNfts(owner: string): Promise<NftItem[]> {
  if (!hasNftRpc()) {
    throw new Error("Set VITE_SOLANA_RPC to a Helius/DAS RPC to load your NFTs.");
  }
  const res = await fetch(RPC!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "golpool",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 200,
        displayOptions: { showFungible: false, showZeroBalance: false },
      },
    }),
  });
  if (!res.ok) throw new Error(`RPC error ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "DAS request failed");

  const items: DasItem[] = json.result?.items ?? [];
  return items
    .map((it): NftItem => {
      const c = it.content ?? {};
      const image =
        c.links?.image ??
        c.files?.find((f) => (f.mime ?? "").startsWith("image"))?.cdn_uri ??
        c.files?.find((f) => (f.mime ?? "").startsWith("image"))?.uri ??
        c.files?.[0]?.uri ??
        "";
      return { id: it.id, name: c.metadata?.name ?? "NFT", image };
    })
    .filter((n) => !!n.image);
}
