const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@getchessplay.com";

export default function ServicesPage({ onBack }) {
  const services = ["React apps", "Chess app clones", "SaaS dashboards", "Bug fixing"];
  return (
    <div className="min-h-screen bg-[#07100d] p-4 text-white sm:p-6 lg:p-8">
      <main className="mx-auto max-w-6xl">
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Back</button>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8f28f]">Portfolio proof</p>
          <h1 className="mt-3 font-['Montserrat'] text-4xl font-black">I built ChessPlay</h1>
          <p className="mt-4 max-w-3xl text-slate-300">A small services page for freelance credibility without changing the product experience.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">{services.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 font-bold">{item}</div>)}</div>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-6 inline-flex rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] hover:bg-[#93c85f]">Contact</a>
        </section>
      </main>
    </div>
  );
}
