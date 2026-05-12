import { useTheme } from "../hooks/useTheme";

export default function LanPlayPage({ onBack, onStartLocal }) {
  const { theme } = useTheme();
  return (
    <div className="w-full p-4 md:p-8" style={{ color: theme.text.primary }}>
      <section className="mx-auto max-w-5xl rounded-3xl border p-6 shadow-2xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
        <button type="button" onClick={onBack} className="mb-4 text-sm font-bold text-[#81b64c]">Back to Dashboard</button>
        <h1 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Same WiFi / LAN Play</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6" style={{ color: theme.text.secondary }}>
          True offline two-device play needs a local Socket.IO server running on one device in the same WiFi network. Vercel-hosted static frontend cannot directly discover nearby phones/laptops without a signaling server.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Connect both devices to the same WiFi or hotspot."],
            ["2", "Run backend locally: npm --workspace backend run dev."],
            ["3", "Open frontend using your computer LAN IP and set VITE_BACKEND_URL to that backend."],
          ].map(([num, text]) => (
            <div key={num} className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#81b64c] font-black text-[#07100a]">{num}</div>
              <p className="text-sm font-semibold">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onStartLocal} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a]">Play Pass-and-Play Now</button>
          <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-bold">Dashboard</button>
        </div>
      </section>
    </div>
  );
}
