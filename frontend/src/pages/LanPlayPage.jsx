import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import SupporterBadge from "../components/billing/SupporterBadge";

const roadmap = [
  {
    title: "Phase 1",
    label: "Online room code",
    body: "Use the existing secure Play Online room system today. It works on the same WiFi and across the internet.",
    status: "Available now",
  },
  {
    title: "Phase 2",
    label: "Same WiFi discovery",
    body: "Add safe device discovery after browser support and backend safeguards are ready.",
    status: "Planned",
  },
  {
    title: "Phase 3",
    label: "Offline LAN/Bluetooth experiments",
    body: "Explore native-app options later without asking users to weaken browser security.",
    status: "Research",
  },
];

const supporterBenefits = [
  "Early access to experimental features",
  "Supporter badge on your profile",
  "No-ads experience after approval",
  "Custom board themes in future releases",
  "Priority feature voting",
];

function buildInstructionText() {
  return [
    "Open Play Online.",
    "Create a room and copy the room code.",
    "Share the code with your friend on the same WiFi or anywhere online.",
    "Start the match after both players join.",
  ].join("\n");
}

function StatusBadge({ children, tone = "green" }) {
  const toneClasses = {
    green: "border-[#81b64c]/30 bg-[#81b64c]/15 text-[#9be36a]",
    amber: "border-amber-300/30 bg-amber-300/15 text-amber-200",
    slate: "border-slate-300/20 bg-slate-300/10 text-slate-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${toneClasses[tone] || toneClasses.green}`}>
      {children}
    </span>
  );
}

export default function LanPlayPage({ user, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const instructions = useMemo(() => buildInstructionText(), []);
  const isSupporter = Boolean(user?.isSupporter || user?.isPremium || user?.entitlements?.noAds);

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      setMessage("Setup steps copied. Share them with your friend before creating a room.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Copy failed. You can still share the steps manually.");
    }
  };

  const goPlayOnline = () => onNavigate?.("multi");
  const goSupporter = () => onNavigate?.("pricing");
  const goBackToPlay = () => onBack?.();

  return (
    <div className="w-full p-4 md:p-8" style={{ color: theme.text.primary }}>
      <section
        className="mx-auto max-w-7xl overflow-hidden rounded-3xl border shadow-2xl"
        style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="p-5 sm:p-8 lg:p-10">
            <button
              type="button"
              onClick={goBackToPlay}
              className="mb-5 rounded-xl border px-4 py-2 text-sm font-bold transition hover:border-[#81b64c] hover:text-[#81b64c]"
              style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}
              aria-label="Back to play options"
            >
              ← Back to Play
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="amber">Experimental</StatusBadge>
              <StatusBadge tone="green">Online room available</StatusBadge>
              <StatusBadge tone="slate">Direct LAN coming soon</StatusBadge>
              {isSupporter && <SupporterBadge user={user} />}
            </div>

            <h1 className="mt-5 font-['Montserrat'] text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Same WiFi Mode
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 sm:text-base" style={{ color: theme.text.secondary }}>
              Play with another device on the same WiFi network using the current secure online room-code flow. True browser-based LAN discovery is not enabled yet because web apps cannot safely scan local networks or expose private IPs from a production HTTPS site.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {[
                ["1", "Host", "Create a secure room through Play Online."],
                ["2", "Share", "Send the room code to your friend."],
                ["3", "Play", "Start after both players join."],
              ].map(([step, title, body]) => (
                <article
                  key={title}
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.secondary }}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#81b64c] text-sm font-black text-[#07100a]">{step}</div>
                  <h2 className="mt-4 text-lg font-black">{title}</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.text.secondary }}>{body}</p>
                </article>
              ))}
            </div>

            <div
              className="mt-7 rounded-3xl border p-5 sm:p-6"
              style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Recommended working option</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.text.secondary }}>
                    Use Play Online room code for now. It gives the same friend-vs-friend experience without insecure LAN scanning or browser permission issues.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:min-w-[220px]">
                  <button
                    type="button"
                    onClick={goPlayOnline}
                    className="rounded-xl bg-[#81b64c] px-5 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]"
                    aria-label="Play online instead"
                  >
                    Play Online Instead
                  </button>
                  <button
                    type="button"
                    onClick={copyInstructions}
                    className="rounded-xl border px-5 py-3 text-sm font-bold transition hover:border-[#81b64c] hover:text-[#81b64c]"
                    style={{ borderColor: theme.border.secondary }}
                    aria-label="Copy same WiFi setup instructions"
                  >
                    {copied ? "Copied" : "Copy Setup Steps"}
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}>
                <p className="font-bold" style={{ color: theme.text.primary }}>Current availability</p>
                <p className="mt-2">Available online room mode: create or join a room from Play Online.</p>
                <p>Same WiFi direct discovery: coming soon after safe LAN discovery support is added.</p>
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-3 text-sm text-[#9be36a]" role="status">
                  {message}
                </div>
              )}
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {roadmap.map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.secondary }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: theme.text.secondary }}>{item.title}</span>
                    <StatusBadge tone={item.status === "Available now" ? "green" : "slate"}>{item.status}</StatusBadge>
                  </div>
                  <h3 className="mt-4 text-lg font-black">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.text.secondary }}>{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          <aside
            className="border-t p-5 sm:p-8 lg:border-l lg:border-t-0"
            style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }}
          >
            <h2 className="font-['Montserrat'] text-2xl font-black">Help build offline chess modes</h2>
            <p className="mt-3 text-sm leading-6" style={{ color: theme.text.secondary }}>
              Same WiFi and Bluetooth modes should stay free when launched. Supporter payments only help fund development and unlock cosmetic benefits like badges, themes, no ads, and early access previews.
            </p>

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: theme.border.secondary }}>
              <h3 className="font-black">Supporter benefits</h3>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: theme.text.secondary }}>
                {supporterBenefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <span className="text-[#81b64c]" aria-hidden="true">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-black/20 p-3 text-xs leading-5" style={{ color: theme.text.secondary }}>
                Payments through PayPal, UPI, or Bank are manually verified by an admin. No fake funding totals or fake supporter counts are shown.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={goSupporter}
                className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-200"
                aria-label="Open supporter plan"
              >
                Sponsor this feature
              </button>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border px-5 py-3 text-sm font-bold opacity-60"
                style={{ borderColor: theme.border.secondary }}
                aria-describedby="wifi-direct-help"
              >
                Start WiFi Match
              </button>
              <p id="wifi-direct-help" className="text-xs leading-5" style={{ color: theme.text.secondary }}>
                Coming soon after LAN discovery support is added. Use Play Online room code today.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              <strong>Why experimental?</strong> Browser security prevents safe automatic LAN scanning from a public HTTPS app. ChessPlay will not ask users to disable security, expose private IPs, or install unsafe scripts.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
