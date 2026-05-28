"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Stripe ───────────────────────────────────────────────────────────────────
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/4gMdRa8KD0ei69c9R7aR200";
const PRICE_DISPLAY = "$2.99 / month";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  previewUrl: string | null;
}

// ─── iTunes Search API ────────────────────────────────────────────────────────
async function searchItunes(query: string, limit = 20): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.results ?? []).map((r: any) => ({
    id: r.trackId,
    title: r.trackName ?? "Unknown",
    artist: r.artistName ?? "Unknown",
    album: r.collectionName ?? "",
    cover: (r.artworkUrl100 ?? "").replace("100x100", "300x300"),
    previewUrl: r.previewUrl ?? null,
  }));
}

// ─── Subscription helpers ─────────────────────────────────────────────────────
function isSubscribed(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("subscribed") === "true") {
    localStorage.setItem("gv_subscribed", "1");
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }
  return localStorage.getItem("gv_subscribed") === "1";
}

function redirectToStripe() {
  window.location.href = STRIPE_PAYMENT_LINK;
}

// ─── Paywall Modal ────────────────────────────────────────────────────────────
function PaywallModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-3">🎵</div>
        <h2 className="text-white text-2xl font-bold mb-2">Commercial-Free Music</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Enjoy uninterrupted, ad-free listening for just{" "}
          <span className="text-white font-semibold">{PRICE_DISPLAY}</span>.
        </p>
        <ul className="text-left text-zinc-300 text-sm space-y-2 mb-6">
          {[
            "\u2713 100% commercial-free listening",
            "\u2713 AI-generated playlists",
            "\u2713 Unlimited music search",
            "\u2713 Cancel anytime",
          ].map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <button
          onClick={redirectToStripe}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Go Commercial-Free \u00B7 {PRICE_DISPLAY}
        </button>
        <button
          onClick={onClose}
          className="mt-3 w-full text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoodVibesFrontend() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedPlaylist, setGeneratedPlaylist] = useState<string[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setSubscribed(isSubscribed()); }, []);
  useEffect(() => { handleSearch("top hits 2024"); }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;
    audio.volume = volume;
    if (playing) { audio.play().catch(() => setPlaying(false)); }
    else { audio.pause(); }
  }, [playing, currentTrack, volume]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchItunes(q);
      setTracks(results);
      if (results.length === 0) setError("No results found.");
    } catch {
      setError("Couldn't reach the music library.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTrackSelect = (track: Track) => {
    if (!track.previewUrl) return;
    if (currentTrack?.id === track.id) { setPlaying((p) => !p); return; }
    setCurrentTrack(track);
    setPlaying(true);
  };

  const generateAIPlaylist = () => {
    if (!aiPrompt) return;
    if (!subscribed) { setShowPaywall(true); return; }
    setGeneratedPlaylist([
      `${aiPrompt} Mix Vol. 1`,
      `${aiPrompt} Late Night Session`,
      `${aiPrompt} Energy Boost`,
      `${aiPrompt} Deep Focus Waves`,
    ]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans max-w-2xl mx-auto">
      <AnimatePresence>
        {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      </AnimatePresence>

      {currentTrack?.previewUrl && (
        <audio ref={audioRef} src={currentTrack.previewUrl} onEnded={() => setPlaying(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Good Vibes 🎧</h1>
        {subscribed ? (
          <span className="text-xs bg-violet-700/40 text-violet-300 border border-violet-600/40 px-3 py-1 rounded-full">
            \u2713 Commercial-Free
          </span>
        ) : (
          <button
            onClick={() => setShowPaywall(true)}
            className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-full transition-colors"
          >
            Go Commercial-Free \u00B7 {PRICE_DISPLAY}
          </button>
        )}
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSearch(searchInput); }}
        className="flex gap-2 mb-6"
      >
        <input
          type="text"
          placeholder="Search any song, artist, or album\u2026"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600"
        />
        <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-xl transition-colors">
          Search
        </button>
      </form>

      {/* Now Playing */}
      {currentTrack && (
        <motion.div layout className="bg-zinc-800/80 border border-violet-600/40 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <img src={currentTrack.cover} alt={currentTrack.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            <p className="text-xs text-violet-400 mt-0.5">30-sec preview</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-base transition-colors"
            >
              {playing ? "\u23F8" : "\u25B6"}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-violet-500" />
          </div>
        </motion.div>
      )}

      {/* Track list */}
      <div className="space-y-2 mb-8">
        {loading && <div className="text-center text-zinc-500 py-10 text-sm animate-pulse">Searching the music library\u2026</div>}
        {error && !loading && <div className="text-center text-red-400 py-6 text-sm">{error}</div>}
        {!loading && tracks.map((track) => {
          const isPlaying = currentTrack?.id === track.id && playing;
          const isCurrent = currentTrack?.id === track.id;
          const noPreview = !track.previewUrl;
          return (
            <motion.div
              key={track.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => !noPreview && handleTrackSelect(track)}
              className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                noPreview ? "opacity-40 cursor-not-allowed border-zinc-800" : "cursor-pointer"
              } ${
                isCurrent ? "bg-zinc-800 border-violet-500" : "bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-500"
              }`}
            >
              <div className="relative flex-shrink-0">
                <img src={track.cover} alt={track.title} className="w-11 h-11 rounded-lg object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <span className="text-white text-xs animate-pulse">\u25B6</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs text-zinc-400 truncate">{track.artist}{track.album ? ` \u00B7 ${track.album}` : ""}</p>
              </div>
              {noPreview && <span className="text-xs text-zinc-600">no preview</span>}
            </motion.div>
          );
        })}
      </div>

      {/* AI Playlist */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          \u2728 AI Playlist Generator
          {!subscribed && <span className="text-xs text-violet-400 font-normal">\u00B7 Commercial-Free</span>}
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Describe your vibe\u2026"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateAIPlaylist()}
            className="flex-1 bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          <button onClick={generateAIPlaylist} className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-xl transition-colors">
            {subscribed ? "Generate" : "\uD83D\uDD12"}
          </button>
        </div>
        {generatedPlaylist.length > 0 && (
          <ul className="mt-3 space-y-1">
            {generatedPlaylist.map((name) => (
              <li key={name} className="text-sm text-zinc-300 flex items-center gap-2">
                <span className="text-zinc-500">\u2022</span> {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
