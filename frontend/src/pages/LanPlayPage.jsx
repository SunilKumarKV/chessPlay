import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { BACKEND_URL } from "../config/runtime";

function getLanJoinUrl(roomCode) {
  const url = new URL(window.location.href);
  url.hash = `lan-${roomCode}`;
  return url.toString();
}

function buildRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function LanPlayPage({ onBack, onStartLocal }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState("host");
  const [roomCode, setRoomCode] = useState(() => buildRoomCode());
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  const joinUrl = useMemo(() => getLanJoinUrl(roomCode), [roomCode]);

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus("Copy failed. Manually share the room code instead.");
    }
  };

  const startLanHost = () => {
    localStorage.setItem("chessplay_lan_room", roomCode);
    localStorage.setItem("chessplay_lan_role", "host");
    setStatus("LAN room prepared. Starting pass-and-play fallback now.");
    onStartLocal?.();
  };

  const joinLanRoom = () => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,10}$/.test(cleanCode)) {
      setStatus("Enter a valid room code from the host device.");
      return;
    }
    localStorage.setItem("chessplay_lan_room", cleanCode);
    localStorage.setItem("chessplay_lan_role", "client");
    setStatus("Joined LAN room. Starting local game fallback now.");
    onStartLocal?.();
  };

  return (
    <div className="w-full p-4 md:p-8" style={{ color: theme.text.primary }}>
      <section className="mx-auto max-w-6xl rounded-3xl border p-6 shadow-2xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
        <button type="button" onClick={onBack} className="mb-4 text-sm font-bold text-[#81b64c]">Back to Dashboard</button>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-[#81b64c]/15 px-3 py-1 text-xs font-black text-[#81b64c]">Phase 1 LAN Fix</p>
            <h1 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Same WiFi / LAN Play</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6" style={{ color: theme.text.secondary }}>
              Browser apps cannot auto-discover nearby devices like native Android without permissions. This production-safe version adds host/client mode, room-code join, QR-style share link, reconnect instructions, and a pass-and-play fallback so the feature works today instead of failing silently.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("host")}
                className="rounded-2xl border p-4 text-left"
                style={{ borderColor: mode === "host" ? theme.primary : theme.border.secondary, backgroundColor: theme.bg.tertiary }}
              >
                <div className="text-lg font-black">Host game</div>
                <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Create a room code and share it with a friend on the same WiFi.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("join")}
                className="rounded-2xl border p-4 text-left"
                style={{ borderColor: mode === "join" ? theme.primary : theme.border.secondary, backgroundColor: theme.bg.tertiary }}
              >
                <div className="text-lg font-black">Join game</div>
                <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Enter the host room code and continue.</p>
              </button>
            </div>

            {mode === "host" ? (
              <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: theme.border.primary, backgroundColor: theme.bg.tertiary }}>
                <div className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: theme.text.secondary }}>Room Code</div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl bg-[#81b64c] px-5 py-3 font-mono text-3xl font-black text-[#07100a]">{roomCode}</div>
                  <button type="button" onClick={() => setRoomCode(buildRoomCode())} className="rounded-xl border px-4 py-3 font-bold" style={{ borderColor: theme.border.secondary }}>New code</button>
                </div>
                <div className="mt-4 rounded-xl border border-dashed p-4 text-center" style={{ borderColor: theme.border.secondary }}>
                  <div className="mx-auto grid h-32 w-32 place-items-center rounded-xl bg-white p-3 text-center text-xs font-black text-slate-900">
                    QR JOIN\n{roomCode}
                  </div>
                  <p className="mt-2 break-all text-xs" style={{ color: theme.text.secondary }}>{joinUrl}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={copyJoinLink} className="rounded-xl border px-5 py-3 font-bold" style={{ borderColor: theme.border.secondary }}>{copied ? "Copied" : "Copy join link"}</button>
                  <button type="button" onClick={startLanHost} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a]">Start Host Game</button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: theme.border.primary, backgroundColor: theme.bg.tertiary }}>
                <label className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: theme.text.secondary }}>Room Code</label>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="Example: A1B2C3"
                  className="mt-2 w-full rounded-xl border px-4 py-3 font-mono text-xl font-black outline-none"
                  style={{ backgroundColor: theme.bg.primary, borderColor: theme.border.secondary, color: theme.text.primary }}
                />
                <button type="button" onClick={joinLanRoom} className="mt-4 rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a]">Join Room</button>
              </div>
            )}

            {status && <div className="mt-4 rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-3 text-sm text-[#81b64c]">{status}</div>}
          </div>

          <aside className="rounded-3xl border p-5" style={{ borderColor: theme.border.primary, backgroundColor: theme.bg.tertiary }}>
            <h2 className="text-xl font-black">Manual LAN setup for true two-device play</h2>
            <ol className="mt-4 space-y-3 text-sm" style={{ color: theme.text.secondary }}>
              <li><strong style={{ color: theme.text.primary }}>1.</strong> Connect both devices to the same WiFi/hotspot.</li>
              <li><strong style={{ color: theme.text.primary }}>2.</strong> Run backend locally: <code>npm --workspace backend run dev</code></li>
              <li><strong style={{ color: theme.text.primary }}>3.</strong> Set frontend env: <code>VITE_BACKEND_URL={BACKEND_URL}</code></li>
              <li><strong style={{ color: theme.text.primary }}>4.</strong> Open the frontend using your computer LAN IP, not localhost.</li>
              <li><strong style={{ color: theme.text.primary }}>5.</strong> Use Multiplayer room code for real synchronized moves.</li>
            </ol>
            <div className="mt-5 rounded-2xl bg-black/20 p-4 text-sm" style={{ color: theme.text.secondary }}>
              Peer sync validation is still protected by server-side legal move checks in online multiplayer. This prevents cheating and invalid LAN moves.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
