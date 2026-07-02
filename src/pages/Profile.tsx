import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, RefreshCw, Trophy, Users, Star, LogOut, Sparkles, X, Upload, Trash2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { getMyPools, getMatches, getAssignments, getProfiles, updateDisplayName, updateAvatar, uploadAvatarImage, type Assignment } from "../lib/api";
import { memberPoints } from "../lib/scoring";
import { CURATED_NFTS } from "../lib/nft";
import Flag from "../components/Flag";
import Avatar from "../components/Avatar";
import Skeleton, { Shimmer, ShimmerImg } from "../components/Skeleton";
import { Spinner } from "../components/ui";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export default function Profile() {
  const { publicKey, disconnect, select, signMessage } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const navigate = useNavigate();

  async function handleDisconnect() {
    // Full reset: replay onboarding on next connect, then disconnect and DESELECT the
    // wallet so autoConnect doesn't silently reconnect — the selection modal shows again.
    localStorage.removeItem("golpool_onboarded");
    try {
      await disconnect();
      select(null);
    } catch { /* ignore */ }
    // Belt & suspenders: the adapter remembers the last wallet under this key.
    localStorage.removeItem("walletName");
    navigate("/", { replace: true });
  }

  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ pools: 0, points: 0, bestTeam: "", totalTeams: 0 });
  const [loaded, setLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [pageError, setPageError] = useState("");

  // Avatar picker
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Load own profile (name + avatar).
  useEffect(() => {
    if (!wallet) {
      setProfileLoaded(true);
      return;
    }
    getProfiles([wallet])
      .then((m) => {
        const p = m.get(wallet);
        if (p?.display_name) setDisplayName(p.display_name);
        setAvatarUrl(p?.avatar_url ?? null);
      })
      .catch((e) => setPageError(e instanceof Error ? e.message : String(e)))
      .finally(() => setProfileLoaded(true));
  }, [wallet]);

  function openPicker() {
    setPicking(true);
  }

  async function chooseAvatar(url: string | null) {
    const previous = avatarUrl;
    setAvatarUrl(url);
    setPicking(false);
    try {
      await updateAvatar(wallet, signMessage, url);
    } catch (e) {
      setAvatarUrl(previous); // revert the optimistic change
      setPageError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file || !wallet) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadAvatarImage(wallet, signMessage, file);
      await chooseAvatar(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const loadStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const [pools, matches, allAssignments] = await Promise.all([
        getMyPools(wallet),
        getMatches(),
        // Fetch assignments for all pools the user is in.
        (async () => {
          const p = await getMyPools(wallet);
          const all: Assignment[] = [];
          for (const pool of p) {
            try {
              const a = await getAssignments(pool.id);
              all.push(...a.filter((x) => x.wallet_address === wallet));
            } catch { /* skip */ }
          }
          return all;
        })(),
      ]);

      const myTeamIds = allAssignments.map((a) => a.team_id);
      const pts = memberPoints(myTeamIds, matches);

      // Best performing team.
      let bestTeam = "";
      let bestPts = 0;
      for (const t of myTeamIds) {
        const tp = memberPoints([t], matches);
        if (tp > bestPts) {
          bestPts = tp;
          bestTeam = allAssignments.find((a) => a.team_id === t)?.team_name ?? "";
        }
      }

      setStats({
        pools: pools.length,
        points: pts,
        bestTeam,
        totalTeams: myTeamIds.length,
      });
    } catch (e) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [wallet]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function handleSaveName() {
    if (!displayName.trim() || !wallet) return;
    setSaving(true);
    try {
      await updateDisplayName(wallet, signMessage, displayName.trim());
      setEditing(false);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleReplayOnboarding() {
    navigate("/onboarding?replay=1");
  }

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-nav">
      <h1 className="text-2xl font-black">Profile</h1>

      {pageError && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {pageError}
        </p>
      )}

      {/* Identity */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-4">
          {!profileLoaded ? (
            <>
              <Shimmer className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-5 w-32 rounded" />
                <Shimmer className="h-3 w-24 rounded" />
              </div>
            </>
          ) : (
            <>
              <button
                onClick={openPicker}
                className="relative shrink-0 transition hover:brightness-110"
                title="Choose an NFT avatar"
              >
                {/* key on avatarUrl → a freshly uploaded photo re-shimmers until it loads */}
                <Avatar key={avatarUrl ?? "gen"} wallet={wallet} name={displayName} src={avatarUrl} size={56} className="!rounded-2xl" />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-ink-900 bg-grass text-ink-950">
                  <Sparkles className="h-3 w-3" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="field flex-1 !py-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setEditing(false);
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="btn-ghost flex items-center !px-3 !py-2 text-xs"
                    >
                      {saving ? <Spinner className="h-3.5 w-3.5" /> : "Save"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="font-bold">
                      {displayName || "Anonymous Player"}
                    </div>
                    <button
                      onClick={() => {
                        setDisplayName(displayName);
                        setEditing(true);
                      }}
                      className="mt-0.5 text-xs text-white/40 transition hover:text-grass"
                    >
                      Set display name
                    </button>
                  </>
                )}
                <div className="mt-1 font-mono text-[10px] text-white/40">
                  {short(wallet)}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Stats */}
      {!loaded ? (
        <Skeleton rows={1} className="mt-4 [&>div]:h-[88px]" />
      ) : (
        <section className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "Pools", value: stats.pools },
            { icon: Star, label: "Points", value: stats.points },
            { icon: Users, label: "Teams", value: stats.totalTeams },
          ].map((s) => (
            <div
              key={s.label}
              className="glass flex flex-col items-center gap-1 rounded-2xl px-2 py-4"
            >
              <s.icon className="h-4 w-4 text-grass" />
              <span className="text-xl font-black text-gold">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/50">
                {s.label}
              </span>
            </div>
          ))}
        </section>
      )}

      {loaded && stats.bestTeam && (
        <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4 text-center">
          <p className="text-xs text-white/50">Best performing team</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-gold">
            <Flag name={stats.bestTeam} className="text-base" /> {stats.bestTeam}
          </p>
        </div>
      )}

      {/* Links */}
      <section className="mt-6 space-y-2">
        <button
          onClick={() => navigate("/profile/how-to-play")}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/30"
        >
          <HelpCircle className="h-5 w-5 text-white/50" />
          <span className="text-sm font-semibold">How to Play</span>
        </button>

        <button
          onClick={handleReplayOnboarding}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/30"
        >
          <RefreshCw className="h-5 w-5 text-white/50" />
          <span className="text-sm font-semibold">Show intro again</span>
        </button>

        <button
          onClick={handleDisconnect}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4 text-left transition hover:border-red-500/50"
        >
          <LogOut className="h-5 w-5 text-red-400" />
          <span className="text-sm font-semibold text-red-300">Disconnect wallet</span>
        </button>
      </section>

      <p className="mt-auto pt-8 text-center text-[10px] text-white/25">
        Powered by TxLINE · Built on Solana
      </p>

      {/* NFT avatar picker */}
      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPicking(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/80 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">Choose your avatar</h3>
                <button onClick={() => setPicking(false)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 flex gap-2">
                <label className="btn-ghost flex flex-1 items-center justify-center gap-2 !py-2 text-xs">
                  {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>
                {avatarUrl && (
                  <button
                    onClick={() => chooseAvatar(null)}
                    className="btn-ghost flex items-center justify-center gap-2 !py-2 text-xs text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              {uploadError && (
                <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-xs text-red-300">{uploadError}</p>
              )}

              <p className="mb-3 mt-2 text-xs font-semibold text-white/40">Pick a collectible</p>
              <div className="grid grid-cols-3 gap-3">
                {CURATED_NFTS.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => chooseAvatar(n.image)}
                    className={`aspect-square overflow-hidden rounded-2xl border-2 transition hover:brightness-110 ${avatarUrl === n.image ? "border-grass" : "border-white/10"}`}
                    title={n.name}
                  >
                    <ShimmerImg src={n.image} alt={n.name} className="h-full w-full" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
